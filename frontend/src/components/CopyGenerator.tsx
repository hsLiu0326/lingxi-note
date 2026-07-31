"use client";

import { useState, useRef } from "react";
import { generateStreamAsync } from "@/lib/api";
import ResultCard from "./ResultCard";

type ResultData = {
  titles: string;
  opening: string;
  deai: string;
  emoji: string;
  zhongcao: string;
};

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
  const [results, setResults] = useState<ResultData | null>(null);
  const [showLimit, setShowLimit] = useState(false);
  const abortRef = useRef(false);

  const handleGenerate = async () => {
    if (!text.trim() || text.trim().length < 5) {
      setStatus("请输入至少 5 个字符的文案");
      return;
    }

    setLoading(true);
    setStatus("初始化...");
    setResults(null);
    abortRef.current = false;

    const newResults: ResultData = {
      titles: "",
      opening: "",
      deai: "",
      emoji: "",
      zhongcao: "",
    };

    try {
      for await (const { event, data } of generateStreamAsync(text)) {
        if (abortRef.current) break;

        switch (event) {
          case "status":
            setStatus(data);
            break;
          case "titles":
            newResults.titles = data;
            setResults({ ...newResults });
            break;
          case "opening":
            newResults.opening = data;
            setResults({ ...newResults });
            break;
          case "deai":
            newResults.deai = data;
            setResults({ ...newResults });
            break;
          case "emoji":
            newResults.emoji = data;
            setResults({ ...newResults });
            break;
          case "zhongcao":
            newResults.zhongcao = data;
            setResults({ ...newResults });
            break;
          case "done":
            setStatus("生成完成！");
            onGenerationComplete?.();
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

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <ResultCard
            title="🔥 10 个爆款标题"
            content={results.titles}
            onCopy={() => handleCopy(results.titles)}
            loading={loading && !results.titles}
            index={0}
          />
          <ResultCard
            title="💫 情绪化开头"
            content={results.opening}
            onCopy={() => handleCopy(results.opening)}
            loading={loading && !results.opening}
            index={1}
          />
          <ResultCard
            title="🔄 去 AI 味改写"
            content={results.deai}
            onCopy={() => handleCopy(results.deai)}
            loading={loading && !results.deai}
            index={2}
          />
          <ResultCard
            title="😊 加入 Emoji"
            content={results.emoji}
            onCopy={() => handleCopy(results.emoji)}
            loading={loading && !results.emoji}
            index={3}
          />
          <ResultCard
            title="🌱 种草风格"
            content={results.zhongcao}
            onCopy={() => handleCopy(results.zhongcao)}
            loading={loading && !results.zhongcao}
            index={4}
          />
        </div>
      )}

      <LimitModal open={showLimit} onClose={() => setShowLimit(false)} />
    </div>
  );
}
