import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Layout/Sidebar";
import Header from "@/components/Layout/Header";

export const metadata: Metadata = {
  title: "StrideEdge Investment Terminal",
  description: "StrideEdge — 競馬投資予測ターミナル",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen" style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}>
        <Sidebar />
        <div className="md:ml-56 flex flex-col min-h-screen pb-16 md:pb-0">
          <Header />
          <main className="flex-1 p-3 md:p-5">{children}</main>
        </div>
      </body>
    </html>
  );
}
