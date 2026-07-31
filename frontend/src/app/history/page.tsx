"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { getHistory } from "@/lib/api";
import type { GenerationResult } from "@/types";

export default function HistoryPage() {
  const [items, setItems] = useState<GenerationResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const pageSize = 10;

  useEffect(() => {
    setLoading(true);
    getHistory(page)
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / pageSize);

  const renderContent = (label: string, content: string | null) => {
    if (!content) return null;
    return (
      <div className="mt-2">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans bg-gray-50 rounded-lg p-3 mt-1">
          {/* 内容只在卡片展开时渲染，这里直接展示完整内容
              （原 200 字截断条件依赖 expandedId === null，
                但该分支只在展开时执行，条件恒为 false，属于死代码） */}
          {content}
        </pre>
      </div>
    );
  };

  return (
    <AuthGuard>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          历史记录
        </h1>
        <p className="text-gray-500 mb-8">
          查看你之前生成的文案
        </p>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-4">📝</p>
            <p>还没有生成记录</p>
            <p className="text-sm mt-1">去文案生成页开始创作吧</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-100 p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {item.original_text}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(item.created_at).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setExpandedId(
                        expandedId === item.id ? null : item.id
                      )
                    }
                    className="ml-4 text-xs text-primary-500 shrink-0"
                  >
                    {expandedId === item.id ? "收起" : "展开"}
                  </button>
                </div>
                {expandedId === item.id && (
                  <div className="space-y-1">
                    {renderContent("标题", item.titles)}
                    {renderContent("开头", item.opening)}
                    {renderContent("去 AI 味", item.deai_result)}
                    {renderContent("Emoji", item.emoji_result)}
                    {renderContent("种草风格", item.zhongcao_result)}
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
                >
                  上一页
                </button>
                <span className="text-sm text-gray-500">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
                >
                  下一页
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
