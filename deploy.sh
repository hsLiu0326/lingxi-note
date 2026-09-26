#!/bin/bash
set -e

# ===========================================
# 小红书爆款文案生成器 — Ubuntu + Nginx 部署脚本
# 使用方法: bash deploy.sh
# ===========================================

PROJECT_DIR="/opt/xhs-copywriter"
DOMAIN="lingxinote.top"
APP_USER="www-data"

echo "========================================"
echo "  开始部署小红书爆款文案生成器"
echo "========================================"

# 1. Install dependencies
echo "[1/8] 安装系统依赖..."
apt-get update
apt-get install -y python3 python3-pip python3-venv nodejs npm nginx certbot python3-certbot-nginx git

# 2. Create project directory
echo "[2/8] 创建项目目录..."
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# 3. Backend setup
echo "[3/8] 配置后端..."
cd $PROJECT_DIR/backend

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo "请编辑 $PROJECT_DIR/backend/.env 填写配置信息"
fi

# Initialize database
python init_db.py

# 4. Create systemd service for backend
echo "[4/8] 创建 systemd 服务..."
cat > /etc/systemd/system/xhs-api.service << 'EOF'
[Unit]
Description=Xiaohongshu Copywriter API
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/xhs-copywriter/backend
Environment=PATH=/opt/xhs-copywriter/backend/venv/bin
ExecStart=/opt/xhs-copywriter/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable xhs-api
systemctl start xhs-api

# 5. Frontend setup
echo "[5/8] 配置前端..."
cd $PROJECT_DIR/frontend

# Create .env.local if not exists
if [ ! -f .env.local ]; then
    echo "NEXT_PUBLIC_API_URL=http://$DOMAIN" > .env.local
fi

npm install
npm run build

# 6. Configure Nginx
echo "[6/8] 配置 Nginx..."
cat > /etc/nginx/sites-available/xhs << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 10M;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE 流式输出必须关掉缓冲，否则 Nginx 会把内容攒成一大块再发，
        # 前端就看不到「逐字出现」的效果了。
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF

sed -i "s/your-domain.com/$DOMAIN/g" /etc/nginx/sites-available/xhs
ln -sf /etc/nginx/sites-available/xhs /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# 7. Create systemd service for frontend
echo "[7/8] 创建前端服务..."
cat > /etc/systemd/system/xhs-frontend.service << 'EOF'
[Unit]
Description=Xiaohongshu Copywriter Frontend
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/xhs-copywriter/frontend
ExecStart=/usr/bin/node /opt/xhs-copywriter/frontend/.next/standalone/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable xhs-frontend
systemctl start xhs-frontend

# 8. SSL (optional)
echo "[8/8] 配置 SSL (可选)..."
echo "运行以下命令配置 HTTPS:"
echo "  certbot --nginx -d $DOMAIN"

echo "========================================"
echo "  部署完成！"
echo "  访问 http://$DOMAIN 查看网站"
echo "========================================"
