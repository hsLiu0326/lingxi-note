"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type ToastType = "success" | "error";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

let toastId = 0;
const listeners: Set<(t: ToastItem) => void> = new Set();

export function showToast(type: ToastType, message: string) {
  const item: ToastItem = { id: ++toastId, type, message };
  listeners.forEach((fn) => fn(item));
}

export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (item: ToastItem) => {
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
      }, 4000);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const remove = (id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  };

  if (items.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3 pointer-events-none">
      {items.map((item) => {
        const isError = item.type === "error";
        return (
          <div
            key={item.id}
            className={
              "pointer-events-auto animate-scale-in flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl backdrop-blur-md border min-w-[320px] max-w-[420px] transition-all duration-300 " +
              (isError
                ? "bg-red-50/95 border-red-200/60 text-red-700"
                : "bg-green-50/95 border-green-200/60 text-green-700")
            }
          >
            {/* Icon */}
            <span
              className={
                "shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm " +
                (isError ? "bg-red-100 text-red-500" : "bg-green-100 text-green-500")
              }
            >
              {isError ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </span>

            <p className="flex-1 text-sm font-medium leading-snug">{item.message}</p>

            <button
              onClick={() => remove(item.id)}
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
            >
              <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
