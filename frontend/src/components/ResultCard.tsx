"use client";

import { useState } from "react";

export type TaskStatus = "pending" | "streaming" | "done" | "error";

interface Props {
  title: string;
  content: string;
  onCopy: () => void;
  status: TaskStatus;
  /** status 为 error 时展示的原因 */
  message?: string;
  index?: number;
}

function Skeleton({ index }: { index: number }) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="h-5 bg-gray-200 rounded w-40 mb-3" />
      <div className="h-4 bg-gray-100 rounded w-full mb-2" />
      <div className="h-4 bg-gray-100 rounded w-3/4" />
    </div>
  );
}

export default function ResultCard({
  title,
  content,
  onCopy,
  status,
  message,
  index = 0,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!content) return;
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 排队中 / 刚启动还没吐字 → 骨架屏
  if (status === "pending" || (status === "streaming" && !content)) {
    return <Skeleton index={index} />;
  }

  if (status === "error") {
    return (
      <div
        className="bg-white rounded-2xl border border-red-100 p-6 animate-scale-in"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <span className="w-1 h-5 bg-red-400 rounded-full" />
            {title}
          </h3>
          <span className="text-xs font-medium text-red-500 bg-red-50 rounded-lg px-2.5 py-1">
            生成失败
          </span>
        </div>
        {content && (
          <pre className="text-sm text-gray-400 whitespace-pre-wrap font-sans leading-relaxed mb-3">
            {content}
          </pre>
        )}
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
          {message || "该部分生成失败，请重试"}
        </p>
      </div>
    );
  }

  if (!content) return null;

  const streaming = status === "streaming";

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 group animate-scale-in hover:shadow-md hover:border-primary-200 transition-all duration-300"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-5 bg-primary-500 rounded-full" />
          {title}
          {streaming && (
            <span className="text-[10px] font-medium text-primary-500 bg-primary-50 rounded-full px-2 py-0.5">
              生成中
            </span>
          )}
        </h3>
        <button
          onClick={handleCopy}
          className={`text-xs font-medium transition-all flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${
            copied
              ? "bg-green-50 text-green-600"
              : "text-gray-400 hover:text-primary-500 hover:bg-primary-50"
          }`}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              已复制
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              复制
            </>
          )}
        </button>
      </div>
      <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
        {content}
        {streaming && (
          <span className="inline-block w-[2px] h-[1em] bg-primary-500 ml-0.5 align-text-bottom animate-pulse" />
        )}
      </pre>
    </div>
  );
}
