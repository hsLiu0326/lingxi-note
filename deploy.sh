#!/bin/bash
set -e

# ===========================================
# 灵犀笔记 — Ubuntu 22.04 部署脚本
#
# 适用场景：阿里云大陆服务器 + 未做 ICP 备案
#   → 用「公网 IP + 端口」访问，绕开未备案域名被阻断的问题
#   → 80 端口能通就用 http://IP，被拦就改用 http://IP:8080
#
# 用法（在项目根目录）: sudo bash deploy.sh
# 可重复执行，已完成的步骤会自动跳过
# ===========================================

PROJECT_DIR="/opt/xhs-copywriter"
SERVER_IP="106.15.131.213"
API_PORT=8000
WEB_PORT=3000

echo "========================================"
echo "  灵犀笔记 部署开始"
echo "  服务器 IP : $SERVER_IP"
echo "  访问端口  : 80 / 8080"
echo "========================================"

if [ "$(id -u)" -ne 0 ]; then
  echo "!! 请用 root 运行：sudo bash deploy.sh"
  exit 1
fi

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── 0. 把代码同步到正式目录 ──────────────────────────────
echo "[0/8] 同步代码到 $PROJECT_DIR ..."
if [ "$SRC_DIR" != "$PROJECT_DIR" ]; then
  mkdir -p "$PROJECT_DIR"
  # 注意：被 --exclude 排除的文件不会被 --delete 删除，
  # 所以服务器上已有的 .env / venv 是安全的
  rsync -a --delete \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude 'venv' \
    --exclude '.git' \
    --exclude '.idea' \
    --exclude '*.tar.gz' \
    --exclude '*.db' \
    --exclude '.env' \
    "$SRC_DIR"/ "$PROJECT_DIR"/
fi

# ── 1. 系统依赖 ─────────────────────────────────────────
echo "[1/8] 安装系统依赖..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  python3 python3-pip python3-venv \
  nginx git curl rsync redis-server ca-certificates

# ── 2. Node.js 20 ──────────────────────────────────────
# 坑：Ubuntu 22.04 自带的 nodejs 是 v12，Next.js 15 要求 18+，
#     不换版本打包会直接失败。
echo "[2/8] 检查 Node.js ..."
NEED_NODE=1
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -v | sed 's/^v\([0-9]*\).*/\1/')"
  if [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
    NEED_NODE=0
    echo "  已有 Node $(node -v)，跳过安装"
  fi
fi
if [ "$NEED_NODE" -eq 1 ]; then
  echo "  安装 Node.js 20 ..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi
echo "  node: $(node -v)    npm: $(npm -v)"

# ── 3. Swap ────────────────────────────────────────────
# 坑：本机 2G 内存，Next.js 打包很容易 OOM，加 2G 虚拟内存兜底
echo "[3/8] 配置 swap..."
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "  已创建 2G swap"
else
  echo "  swap 已存在，跳过"
fi
free -h | awk '/Swap|交换/ {print "  当前 swap: " $0}'

# ── 4. Redis（手机验证码用；不可用时后端会自动降级）─────
echo "[4/8] 启动 Redis..."
systemctl enable redis-server >/dev/null 2>&1 || true
systemctl restart redis-server >/dev/null 2>&1 || true
if redis-cli ping >/dev/null 2>&1; then
  echo "  Redis 正常"
else
  echo "  !! Redis 未就绪，后端会自动降级到内存模式"
fi

# ── 5. 后端 ────────────────────────────────────────────
echo "[5/8] 配置后端..."
cd "$PROJECT_DIR/backend"

if [ ! -d venv ]; then
  python3 -m venv venv
fi
./venv/bin/pip install -q --upgrade pip
./venv/bin/pip install -q -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "  ******************************************************"
  echo "  !! 后端 .env 刚生成，里面的 OPENAI_API_KEY 还是占位符"
  echo "  !! 请编辑 $PROJECT_DIR/backend/.env 填入真实 Key"
  echo "  !! 然后执行：systemctl restart xhs-api"
  echo "  ******************************************************"
  echo ""
fi

# 数据库初始化（已存在则什么都不做）
./venv/bin/python init_db.py

# ── 6. 后端 systemd 服务 ───────────────────────────────
echo "[6/8] 创建后端服务 (xhs-api)..."
cat > /etc/systemd/system/xhs-api.service << EOF
[Unit]
Description=Lingxi Note API (FastAPI)
After=network.target redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR/backend
Environment=PATH=$PROJECT_DIR/backend/venv/bin
ExecStart=$PROJECT_DIR/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port $API_PORT --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable xhs-api >/dev/null 2>&1 || true
systemctl restart xhs-api
sleep 3
if curl -fsS "http://127.0.0.1:$API_PORT/api/health" >/dev/null 2>&1; then
  echo "  后端已启动，健康检查通过"
else
  echo "  !! 后端健康检查失败，查看日志：journalctl -u xhs-api -n 50 --no-pager"
fi

# ── 7. 前端构建 ────────────────────────────────────────
echo "[7/8] 构建前端（首次较慢，可能 5-10 分钟）..."
cd "$PROJECT_DIR/frontend"

# 关键：NEXT_PUBLIC_API_URL 会在打包时被写死进代码。
# 这里故意留空 → 前端改用「同源相对路径」请求 /api/...
# 好处：以后换 IP、换端口、换域名都不用重新打包。
cat > .env.local << 'EOF'
# 留空 = 使用同源相对路径（由 Nginx 把 /api/ 转发到后端）
# 这样换 IP / 换端口 / 以后绑定域名，都无需重新构建
NEXT_PUBLIC_API_URL=
EOF

export NODE_OPTIONS="--max-old-space-size=1536"
npm install --no-audit --no-fund
npm run build

# standalone 产物需要静态资源
cp -r public .next/standalone/ 2>/dev/null || true
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true

# ── 8. 前端服务 + Nginx ────────────────────────────────
echo "[8/8] 创建前端服务 (xhs-frontend) 并配置 Nginx..."
cat > /etc/systemd/system/xhs-frontend.service << EOF
[Unit]
Description=Lingxi Note Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR/frontend
Environment=NODE_ENV=production
Environment=PORT=$WEB_PORT
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/node $PROJECT_DIR/frontend/.next/standalone/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable xhs-frontend >/dev/null 2>&1 || true
systemctl restart xhs-frontend

cat > /etc/nginx/sites-available/xhs << 'EOF'
server {
    listen 80;
    listen 8080;
    server_name _;

    client_max_body_size 10M;

    # 后端 API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE 流式输出必须关掉缓冲，否则内容会被攒成一大块再发，
        # 前端就看不到「逐字出现」的效果了
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # 前端页面
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/xhs /etc/nginx/sites-enabled/xhs
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl reload nginx

sleep 3
echo ""
echo "========================================"
echo "  部署完成"
echo "========================================"
for p in 80 8080; do
  if curl -fsS -o /dev/null --max-time 5 "http://127.0.0.1:$p/" 2>/dev/null; then
    echo "  本机自测端口 $p : OK"
  else
    echo "  本机自测端口 $p : 失败"
  fi
done
echo ""
echo "  访问地址（在浏览器打开）："
echo "    http://$SERVER_IP        <- 优先试这个"
echo "    http://$SERVER_IP:8080   <- 上面打不开就用这个"
echo ""
echo "  !! 别忘了去阿里云控制台「安全组」放行 80 和 8080 端口，"
echo "     只在服务器里配好是不够的，安全组是另一道门。"
echo ""
echo "  查看服务状态："
echo "    systemctl status xhs-api xhs-frontend nginx"
echo "========================================"
