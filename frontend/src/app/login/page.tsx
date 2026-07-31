"use client";

import { useState, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  register,
  login,
  sendPhoneCode,
  phoneLogin,
  changePassword,
} from "@/lib/api";
import { setToken } from "@/lib/auth";
import { showToast } from "@/components/Toast";

type AuthMode = "password" | "phone" | "change-password";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("password");
  const [submode, setSubmode] = useState<"login" | "register">("login");

  // Email form
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Phone form
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Change password form
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();

    if (newPw.length < 6) { showToast("error", "新密码至少 6 位"); return; }
    if (newPw !== confirmPw) { showToast("error", "两次密码输入不一致"); return; }

    setLoading(true);
    try {
      const res = await changePassword(oldPw, newPw);
      showToast("success", res.message);
      setOldPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "修改失败");
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    timerRef.current = t;
  };

  const handleSendCode = async () => {
    if (!phone.trim() || phone.length < 11) {
      showToast("error", "请输入正确的手机号");
      return;
    }
    try {
      await sendPhoneCode(phone.trim());
      setCodeSent(true);
      startCountdown();
      showToast("success", "验证码已发送");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "发送失败");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let res;

      if (mode === "phone") {
        res = await phoneLogin(phone.trim(), code.trim());
      } else if (submode === "register") {
        res = await register(email, username, password);
      } else {
        res = await login(email, password);
      }

      setToken(res.access_token);
      router.push("/generate");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-4 py-8 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 via-white to-pink-50/50" />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-pink-200/20 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          {/* Logo mark */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center shadow-lg shadow-primary-200">
              <svg width="28" height="28" viewBox="0 0 64 64">
                <path d="M32 12 L38 28 L32 52 L26 28 Z" fill="#fff" opacity="0.95"/>
                <circle cx="20" cy="18" r="2.5" fill="#fff" opacity="0.8"/>
                <circle cx="44" cy="18" r="2.5" fill="#fff" opacity="0.8"/>
              </svg>
            </div>
          </div>

          <h1 className="text-xl font-bold text-center text-gray-900 mb-8">
            {mode === "change-password"
              ? "修改密码"
              : mode === "phone"
              ? "手机验证码登录"
              : submode === "login"
              ? "欢迎回来"
              : "创建账号"}
          </h1>

          {/* ── Auth mode tabs ── */}
          <div className="flex bg-gray-100 rounded-full p-1 mb-6">
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${
                mode === "password"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => { setMode("password"); }}
            >
              密码登录
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${
                mode === "phone"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => { setMode("phone"); }}
            >
              手机验证码
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${
                mode === "change-password"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => { setMode("change-password"); }}
            >
              修改密码
            </button>
          </div>

          {/* ── Password mode ── */}
          {mode === "password" && (
            <>
              <div className="flex gap-4 mb-6 border-b border-gray-100">
                <button
                  className={`pb-2 text-sm font-medium border-b-2 transition-all ${
                    submode === "login"
                      ? "text-primary-600 border-primary-500"
                      : "text-gray-400 border-transparent hover:text-gray-600"
                  }`}
                  onClick={() => setSubmode("login")}
                >
                  登录
                </button>
                <button
                  className={`pb-2 text-sm font-medium border-b-2 transition-all ${
                    submode === "register"
                      ? "text-primary-600 border-primary-500"
                      : "text-gray-400 border-transparent hover:text-gray-600"
                  }`}
                  onClick={() => setSubmode("register")}
                >
                  注册
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                  />
                </div>

                {submode === "register" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      用户名
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="你的昵称"
                      required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    密码
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 位密码"
                    required
                    minLength={6}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      处理中...
                    </span>
                  ) : submode === "login" ? (
                    "登录"
                  ) : (
                    "注册并登录"
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── Change password mode ── */}
          {mode === "change-password" && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <p className="text-sm text-gray-500">登录后即可修改密码</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  当前密码
                </label>
                <input
                  type="password"
                  value={oldPw}
                  onChange={(e) => setOldPw(e.target.value)}
                  placeholder="输入当前密码"
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新密码
                </label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="至少 6 位新密码"
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  确认新密码
                </label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="再次输入新密码"
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {loading ? "修改中..." : "保存密码"}
              </button>
            </form>
          )}

          {/* ── Phone mode ── */}
          {mode === "phone" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  手机号
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                  required
                  maxLength={11}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  验证码
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="输入验证码"
                    required
                    maxLength={6}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {countdown > 0 ? `${countdown}s` : codeSent ? "重新发送" : "获取验证码"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  验证码将发送到您的手机，5分钟内有效
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    处理中...
                  </span>
                ) : (
                  "登录 / 注册"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
