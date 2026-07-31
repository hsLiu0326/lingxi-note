"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import CopyGenerator from "@/components/CopyGenerator";
import { getUsage } from "@/lib/api";
import type { UsageInfo } from "@/types";

function UsageBadge({ usage }: { usage: UsageInfo | null }) {
  if (!usage) return null;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
      <span className="text-sm text-gray-600">
        今日已用 {usage.used_today} / {usage.daily_limit} 次
      </span>
      <div className="flex items-center gap-2">
        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all"
            style={{
              width: `${Math.min(
                100,
                (usage.used_today / usage.daily_limit) * 100
              )}%`,
            }}
          />
        </div>
        <span className="text-xs text-gray-400">
          剩余 {usage.remaining}
        </span>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  const refreshUsage = () => {
    getUsage()
      .then(setUsage)
      .catch(() => {});
  };

  useEffect(() => {
    refreshUsage();
    const timer = setInterval(refreshUsage, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <AuthGuard>
      <div className="relative min-h-screen">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/30 via-white to-pink-50/30" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-primary-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl" />

        <div className="relative max-w-3xl mx-auto px-4 py-10">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              文案生成
            </h1>
            <p className="text-gray-500 mb-8">
              输入你的文案，AI 将自动生成小红书风格内容
            </p>
          </div>

          <UsageBadge usage={usage} />

          <div className="mt-6">
            <CopyGenerator onGenerationComplete={refreshUsage} />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
