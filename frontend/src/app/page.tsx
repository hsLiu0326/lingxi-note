"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import SilkBackground from "@/components/SilkBackground";

const features = [
  {
    icon: "🎯",
    title: "爆款标题生成",
    desc: "自动生成 10 个吸引眼球的小红书风格标题，提高点击率",
    gradient: "from-pink-400/20 to-rose-400/20",
    iconBg: "from-pink-50 to-rose-100",
  },
  {
    icon: "💭",
    title: "情绪化开头",
    desc: "创作极具感染力的开头，一秒抓住读者注意力",
    gradient: "from-purple-400/20 to-pink-400/20",
    iconBg: "from-purple-50 to-pink-100",
  },
  {
    icon: "🔄",
    title: "去 AI 味改写",
    desc: "去除机器感，让文案读起来像真人自然表达",
    gradient: "from-blue-400/20 to-cyan-400/20",
    iconBg: "from-blue-50 to-cyan-100",
  },
  {
    icon: "😊",
    title: "Emoji 智能添加",
    desc: "在恰当位置加入热门 emoji，让文案更生动活泼",
    gradient: "from-amber-400/20 to-yellow-400/20",
    iconBg: "from-amber-50 to-yellow-100",
  },
  {
    icon: "🌱",
    title: "种草风格转换",
    desc: "一键转换为小红书爆款种草文案风格",
    gradient: "from-green-400/20 to-emerald-400/20",
    iconBg: "from-green-50 to-emerald-100",
  },
  {
    icon: "⚡",
    title: "流式输出",
    desc: "AI 实时生成内容，无需漫长等待",
    gradient: "from-primary-400/20 to-pink-400/20",
    iconBg: "from-primary-50 to-pink-100",
  },
];

function useRevealOnScroll() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const children = el.querySelectorAll(".reveal-up");
            children.forEach((child, i) => {
              (child as HTMLElement).style.transitionDelay = `${i * 80}ms`;
              child.classList.add("is-visible");
            });
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

export default function HomePage() {
  const featuresRef = useRevealOnScroll();
  const statsRef = useRevealOnScroll();

  return (
    <div>
      {/* ═══════════════════════════════════════
          Hero
          ═══════════════════════════════════════ */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Silk canvas background — GPU-accelerated, 60fps */}
        <SilkBackground />

        <div className="relative max-w-6xl mx-auto px-4 py-20 text-center">
          {/* Badge */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-xl text-primary-600 rounded-full px-4 py-1.5 text-sm font-medium mb-8 shadow-sm border border-primary-100/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
              </span>
              灵犀笔记 — 智能文案助手
            </div>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight animate-fade-in-up">
            一键帮你写出
            <br className="md:hidden" />
            <span className="text-gradient"> 小红书爆款文案</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-12 animate-fade-in-up animate-delay-100 leading-relaxed">
            输入一段普通文案，AI 自动生成爆款标题、情绪化开头、去 AI
            味改写、添加 emoji、种草风格转换 — 一站式搞定小红书内容创作
          </p>

          {/* CTA buttons */}
          <div className="flex items-center justify-center gap-4 animate-fade-in-up animate-delay-200">
            <Link
              href="/generate"
              className="group relative px-8 py-3.5 bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600 transition-all duration-300 shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300 hover:-translate-y-0.5 animate-pulse-glow"
            >
              <span className="relative z-10 flex items-center gap-1">
                立即开始创作
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
              </span>
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 bg-white/80 backdrop-blur-sm text-gray-700 rounded-full font-semibold border border-gray-200/60 hover:border-primary-300 hover:text-primary-600 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              免费注册
            </Link>
          </div>

          {/* Floating badges */}
          <div className="hidden md:flex items-center justify-center gap-10 mt-16 text-sm text-gray-400 animate-fade-in-up animate-delay-300">
            {[
              { color: "bg-green-400", text: "无需信用卡" },
              { color: "bg-primary-400", text: "每日 3 次免费" },
              { color: "bg-amber-400", text: "AI 实时生成" },
            ].map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 ${b.color} rounded-full`} />
                {b.text}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white/80 to-transparent pointer-events-none" />
      </section>

      {/* ═══════════════════════════════════════
          Features
          ═══════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-24" ref={featuresRef}>
        <div className="text-center mb-16 reveal-up">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            核心功能
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-lg">
            一站式小红书文案创作工具，让 AI 帮你搞定所有内容
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="reveal-up group relative bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-100/60 hover:border-primary-200/60 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary-100/30"
            >
              {/* Subtle gradient overlay on hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

              <div className="relative">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.iconBg} flex items-center justify-center mb-4 text-2xl transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-800 mb-2 group-hover:text-primary-600 transition-colors duration-300">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          Stats
          ═══════════════════════════════════════ */}
      <section className="max-w-4xl mx-auto px-4 py-16" ref={statsRef}>
        <div className="reveal-up bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-100/60 p-10 shadow-sm max-w-sm mx-auto animate-border-glow">
          <div className="grid grid-cols-3 gap-8">
            {[
              { label: "生成速度", value: "< 30s" },
              { label: "免费额度", value: "3次/日" },
              { label: "适用平台", value: "小红书" },
            ].map((stat, i) => (
              <div key={i} className="text-center group cursor-default">
                <div className="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:text-primary-500 group-hover:scale-110">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-400 mt-1.5 transition-colors duration-300 group-hover:text-gray-500">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          CTA
          ═══════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-24 text-center">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-500 via-pink-500 to-rose-500 rounded-3xl p-12 md:p-16 text-white shadow-2xl shadow-primary-200/30">
          {/* Animated background shapes */}
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/8 rounded-full -translate-y-1/2 translate-x-1/4 animate-morph" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4 animate-morph" style={{ animationDelay: "-4s" }} />
            <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-white/4 rounded-full -translate-x-1/2 -translate-y-1/2 animate-float-slow" />
          </div>

          {/* Subtle shimmer line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />

          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              立即开始免费使用
            </h2>
            <p className="text-white/75 mb-10 max-w-xl mx-auto text-lg leading-relaxed">
              每天 3 次免费生成，无需信用卡。升级专业版解锁无限次数。
            </p>
            <Link
              href="/generate"
              className="group inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary-600 rounded-full font-semibold hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
            >
              开始创作
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
