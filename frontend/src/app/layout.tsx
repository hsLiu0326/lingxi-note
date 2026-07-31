import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToastContainer from "@/components/Toast";

export const metadata: Metadata = {
  title: "灵犀笔记",
  description:
    "输入普通文案，AI 自动生成小红书风格爆款标题、情绪化开头、去AI味改写、添加Emoji、种草风格转换。",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <ToastContainer />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
