"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";

const FEATURES_FREE = [
  "每日 3 次 AI 生成",
  "5 种文案风格",
  "基础生成速度",
];

const FEATURES_PRO = [
  "每日无限次生成",
  "5 种文案风格",
  "优先生成速度",
  "专属客服支持",
  "未来新功能优先体验",
];

type PlanType = "monthly" | "yearly" | null;
type PaymentMethod = "wechat" | "alipay" | null;

function PaymentModal({
  open,
  planType,
  onClose,
}: {
  open: boolean;
  planType: PlanType;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>(null);
  const [paid, setPaid] = useState(false);

  const price = planType === "yearly" ? 99 : 14.9;
  const planLabel = planType === "yearly" ? "年付" : "月付";

  if (!open) return null;

  const handleConfirm = () => {
    setPaid(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
        {!paid ? (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">升级专业版</h2>
            <p className="text-gray-500 text-sm mb-6">
              选择支付方式，扫码支付 ¥{price}（{planLabel}）
            </p>

            {/* Payment method tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setMethod("wechat")}
                className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  method === "wechat"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                微信支付
              </button>
              <button
                onClick={() => setMethod("alipay")}
                className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  method === "alipay"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                支付宝
              </button>
            </div>

            {/* QR Code area */}
            {method ? (
              <div className="text-center">
                <div className="bg-gray-50 rounded-xl p-6 mb-4">
                  <div className="w-48 h-48 mx-auto bg-white rounded-xl flex items-center justify-center overflow-hidden">
                    <img
                      src={method === "wechat" ? "/wechat-qr.png" : "/alipay-qr.jpg"}
                      alt={method === "wechat" ? "微信收款码" : "支付宝收款码"}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <div className="text-sm text-gray-500 mb-4">
                  <span className="font-mono font-bold text-gray-900 text-lg">
                    ¥{price}
                  </span>
                  <span className="text-gray-400"> / {planLabel}</span>
                </div>

                <button
                  onClick={handleConfirm}
                  className="w-full py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-all"
                >
                  我已完成支付
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  支付完成后，管理员将手动确认开通
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                请选择支付方式
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">支付确认已提交</h3>
            <p className="text-sm text-gray-500 mb-6">
              管理员将在 24 小时内审核并为您开通专业版
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition"
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SubscribePage() {
  const [showPayment, setShowPayment] = useState(false);
  const [planType, setPlanType] = useState<PlanType>(null);

  const openPayment = (type: PlanType) => {
    setPlanType(type);
    setShowPayment(true);
  };

  return (
    <AuthGuard>
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/30 via-white to-pink-50/30" />

        <div className="relative max-w-4xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              选择适合你的方案
            </h1>
            <p className="text-lg text-gray-500">
              免费版体验核心功能，专业版解锁无限创作
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow flex flex-col">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">免费版</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">¥0</span>
                <span className="text-sm text-gray-400 ml-1">永久免费</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {FEATURES_FREE.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button className="w-full py-2.5 bg-gray-100 text-gray-500 rounded-full font-medium text-sm cursor-default">
                当前方案
              </button>
            </div>

            {/* Pro Monthly */}
            <div className="bg-white rounded-2xl border-2 border-primary-300 p-6 hover:shadow-lg transition-shadow flex flex-col relative">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">专业版 · 月付</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">¥14.90</span>
                <span className="text-sm text-gray-400 ml-1">/ 月</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {FEATURES_PRO.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-primary-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => openPayment("monthly")}
                className="w-full py-2.5 bg-primary-500 text-white rounded-full font-medium text-sm hover:bg-primary-600 transition-all"
              >
                立即升级
              </button>
            </div>

            {/* Pro Yearly */}
            <div className="bg-primary-500 rounded-2xl p-6 text-white shadow-xl shadow-primary-200 flex flex-col relative">
              <div className="absolute top-4 right-4 bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                推荐
              </div>
              <h3 className="text-lg font-semibold mb-2">专业版 · 年付</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold">¥99</span>
                <span className="text-sm text-white/70 ml-1">/ 年</span>
                <div className="text-xs text-white/60 mt-0.5">相当于 ¥8.25/月</div>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {FEATURES_PRO.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/90">
                    <svg className="w-4 h-4 text-white shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => openPayment("yearly")}
                className="w-full py-2.5 bg-white text-primary-600 rounded-full font-medium text-sm hover:bg-gray-100 transition-all"
              >
                立即升级
              </button>
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto mt-16">
            <h3 className="text-lg font-bold text-gray-900 text-center mb-6">常见问题</h3>
            <div className="space-y-4">
              {[
                { q: "月付和年付有什么区别？", a: "功能完全相同，年付 ¥99（相当于 ¥8.25/月），比月付节省 45%。" },
                { q: "支持哪些支付方式？", a: "支持微信支付和支付宝，扫码即可完成支付。" },
                { q: "支付后多久开通？", a: "支付完成后管理员会在 24 小时内审核开通，通常几分钟内即可完成。" },
              ].map((faq, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                  <h4 className="font-medium text-gray-900 mb-1">{faq.q}</h4>
                  <p className="text-sm text-gray-500">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <PaymentModal open={showPayment} planType={planType} onClose={() => setShowPayment(false)} />
      </div>
    </AuthGuard>
  );
}
