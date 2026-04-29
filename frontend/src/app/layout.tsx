import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Layout/Sidebar";
import Header from "@/components/Layout/Header";

export const metadata: Metadata = {
  title: "StrideEdge - 競馬予想支援",
  description: "競馬予想支援アプリ StrideEdge",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen" style={{ backgroundColor: "var(--turf-darkest)", color: "var(--cream)" }}>
        <Sidebar />
        <div className="md:ml-60 flex flex-col min-h-screen pb-16 md:pb-0">
          <Header />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
