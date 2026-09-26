"use client";

import { useState, FormEvent } from "react";
import { changePassword } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";
import {
  PASSWORD_HINT,
  PASSWORD_MAX,
  PASSWORD_PATTERN,
  validatePassword,
} from "@/lib/validate";

export default function SettingsPage() {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const pwdError = validatePassword(newPw);
    if (pwdError) {
      setError(pwdError);
      return;
    }
    if (newPw !== confirmPw) {
      setError("两次密码输入不一致");
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(oldPw, newPw);
      setMessage(res.message);
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "修改失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/30 via-white to-pink-50/30" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-primary-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl" />

        <div className="relative max-w-lg mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
            <h1 className="text-xl font-bold text-gray-900 mb-1">修改密码</h1>
            <p className="text-sm text-gray-500 mb-6">设置一个新的登录密码</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
                <input
                  type="password"
                  value={oldPw}
                  onChange={(e) => setOldPw(e.target.value)}
                  placeholder="输入当前密码"
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder={PASSWORD_HINT}
                  required
                  minLength={6}
                  maxLength={PASSWORD_MAX}
                  pattern={PASSWORD_PATTERN}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">{PASSWORD_HINT}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="再次输入新密码"
                  required
                  minLength={6}
                  maxLength={PASSWORD_MAX}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
              {message && (
                <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">{message}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {loading ? "修改中..." : "保存密码"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
