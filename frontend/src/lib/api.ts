"use client";

import { getToken, removeToken } from "./auth";
import type { TokenResponse, User, UsageInfo, HistoryList } from "@/types";

// 统一 API 基础地址：去掉结尾斜杠，并兼容配置里误带的 "/api" 后缀。
// Nginx 会把 /api/* 自动路由到后端，前端请求路径本身已带 /api 前缀，
// 所以这里只保留站点根地址，避免拼成 /api/api/... 导致 404。
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      removeToken();
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    throw new Error(err.detail || "Request failed");
  }

  return res.json();
}

// ── Email Auth ───────────────────────────────────────────────────────

export function register(email: string, username: string, password: string) {
  return request<TokenResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, username, password }),
  });
}

export function login(email: string, password: string) {
  return request<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ── Phone Auth ───────────────────────────────────────────────────────

export function sendPhoneCode(phone: string) {
  return request<{ message: string; expires_in: number }>(
    "/api/auth/phone/send-code",
    {
      method: "POST",
      body: JSON.stringify({ phone }),
    }
  );
}

export function phoneLogin(phone: string, code: string) {
  return request<TokenResponse>("/api/auth/phone/login", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}

// ── User ─────────────────────────────────────────────────────────────

export function getMe(): Promise<User> {
  return request("/api/auth/me");
}

export function changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
  return request("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
}

export function getUsage(): Promise<UsageInfo> {
  return request("/api/user/usage");
}

export function getHistory(page = 1): Promise<HistoryList> {
  return request(`/api/user/history?page=${page}&page_size=10`);
}

// ── SSE Generate ─────────────────────────────────────────────────────

export async function* generateStreamAsync(
  text: string
): AsyncGenerator<{ event: string; data: string }> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "message";
  let currentData: string[] = [];

  function flush() {
    if (currentData.length > 0) {
      const data = currentData.join("\n");
      currentData = [];
      return { event: currentEvent, data };
    }
    return null;
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "") {
        // Empty line = end of this SSE message
        const flushed = flush();
        if (flushed) yield flushed;
        currentEvent = "message";
      } else if (trimmed.startsWith("event:")) {
        // Event change — flush previous event data first
        const flushed = flush();
        if (flushed) yield flushed;
        currentEvent = trimmed.slice(6).trim();
      } else if (trimmed.startsWith("data:")) {
        currentData.push(trimmed.slice(5).trim());
      }
    }
  }

  // Flush remaining data at end of stream
  const flushed = flush();
  if (flushed) yield flushed;
}
