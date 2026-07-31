"use client";

import { useState } from "react";

interface Props {
  title: string;
  content: string;
  onCopy: () => void;
  loading?: boolean;
  index?: number;
}

export default function ResultCard({ title, content, onCopy, loading, index = 0 }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !content) {
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

  if (!content) return null;

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 group animate-scale-in hover:shadow-md hover:border-primary-200 transition-all duration-300"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-5 bg-primary-500 rounded-full" />
          {title}
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
      </pre>
    </div>
  );
}
