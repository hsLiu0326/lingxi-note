"use client";

import { useState, useRef } from "react";
import { generateStreamAsync } from "@/lib/api";
import ResultCard, { type TaskStatus } from "./ResultCard";

/** 5 个任务的定义，顺序即页面上的卡片顺序 */
const TASKS = [
  { key: "titles", label: "🔥 10 个爆款标题" },
  { key: "opening", label: "💫 情绪化开头" },
  { key: "deai", label: "🔄 去 AI 味改写" },
  { key: "emoji", label: "😊 加入 Emoji" },
  { key: "zhongcao", label: "🌱 种草风格" },
] as const;

type TaskKey = (typeof TASKS)[number]["key"];

type TaskState = {
  text: string;
  status: TaskStatus;
  message?: string;
};

type Results = Record<TaskKey, TaskState>;

function emptyResults(): Results {
  return {
    titles: { text: "", status: "pending" },
    opening: { text: "", status: "pending" },
    deai: { text: "", status: "pending" },
    emoji: { text: "", status: "pending" },
    zhongcao: { text: "", status: "pending" },
  };
}

function LimitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-scale-in text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">免费次数已用完</h3>
        <p className="text-gray-500 mb-6">
          今日免费生成次数已用完（3次/天），升级专业版即可享受每日无限次生成。
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-full font-medium text-sm hover:bg-gray-200 transition"
          >
            稍后再说
          </button>
          <a
            href="/subscribe"
            className="flex-1 py-2.5 bg-primary-500 text-white rounded-full font-medium text-sm hover:bg-primary-600 transition text-center"
          >
            升级专业版
          </a>
        </div>
      </div>
    </div>
  );
}

export default function CopyGenerator({
  onGenerationComplete,
}: {
  onGenerationComplete?: () => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [showLimit, setShowLimit] = useState(false);
  const abortRef = useRef(false);

  /** 只更新某一个任务的状态，其余保持不变 */
  const patch = (key: TaskKey, fn: (state: TaskState) => TaskState) => {
    setResults((prev) => (prev ? { ...prev, [key]: fn(prev[key]) } : prev));
  };

  const handleGenerate = async () => {
    if (!text.trim() || text.trim().length < 5) {
      setStatus("请输入至少 5 个字符的文案");
      return;
    }

    setLoading(true);
    setStatus("正在连接 AI...");
    setResults(emptyResults());
    abortRef.current = false;

    const finished = new Set<TaskKey>();

    const markFinished = (key: TaskKey) => {
      finished.add(key);
      setStatus(`已完成 ${finished.size} / ${TASKS.length} 项`);
    };

    try {
      for await (const { event, data } of generateStreamAsync(text)) {
        if (abortRef.current) break;

        switch (event) {
          case "status":
            setStatus(data);
            break;

          case "chunk": {
            const { task, text: piece } = JSON.parse(data) as {
              task: TaskKey;
              text: string;
            };
            patch(task, (s) => ({
              ...s,
              text: s.text + piece,
              status: "streaming",
            }));
            break;
          }

          case "task_done": {
            const { task } = JSON.parse(data) as { task: TaskKey };
            patch(task, (s) => ({ ...s, status: "done" }));
            markFinished(task);
            break;
          }

          case "task_error": {
            const { task, message } = JSON.parse(data) as {
              task: TaskKey;
              message: string;
            };
            patch(task, (s) => ({ ...s, status: "error", message }));
            markFinished(task);
            break;
          }

          case "done":
            setStatus("生成完成！");
            onGenerationComplete?.();
            break;

          case "error":
            setStatus(data);
            break;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "生成失败，请重试";
      if (msg.toLowerCase().includes("limit") || msg.includes("429") || msg.includes("limit reached")) {
        setShowLimit(true);
        setStatus("");
      } else {
        setStatus(msg);
      }
    } finally {
      setLoading(false);
      // 连接意外中断时，把没跑完的任务标记出来，避免一直转圈
      setResults((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        (Object.keys(next) as TaskKey[]).forEach((key) => {
          const s = next[key];
          if (s.status === "pending" || s.status === "streaming") {
            next[key] = {
              ...s,
              status: "error",
              message: s.text ? "连接中断，内容可能不完整" : "连接中断，未生成",
            };
          }
        });
        return next;
      });
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = content;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input area */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          输入你的文案
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="粘贴你的文案在这里，AI 将为你生成小红书风格内容..."
          className="w-full h-40 p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 placeholder-gray-400"
          disabled={loading}
        />
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-400">
            {text.length} 字
          </span>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-2.5 bg-primary-500 text-white rounded-full font-medium hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "生成中..." : "✨ 生成爆款文案"}
          </button>
        </div>
      </div>

      {/* Status / warning */}
      {status && (
        <div className="flex items-center gap-3 text-sm text-gray-500 bg-primary-50 rounded-xl px-4 py-3">
          {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />}
          {status}
        </div>
      )}

      {/* Results — 5 张卡片同时出现，各自独立流式填充 */}
      {results && (
        <div className="space-y-4">
          {TASKS.map((task, index) => (
            <ResultCard
              key={task.key}
              title={task.label}
              content={results[task.key].text}
              status={results[task.key].status}
              message={results[task.key].message}
              onCopy={() => handleCopy(results[task.key].text)}
              index={index}
            />
          ))}
        </div>
      )}

      <LimitModal open={showLimit} onClose={() => setShowLimit(false)} />
    </div>
  );
}
