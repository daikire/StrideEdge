"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_ITEMS = [
  { href: "/",           label: "ダッシュボード", icon: "🏠" },
  { href: "/predictions", label: "予想一覧",      icon: "🎯" },
  { href: "/races",      label: "レース一覧",     icon: "🏇" },
  { href: "/calendar",   label: "カレンダー",     icon: "📅" },
  { href: "/roi",        label: "回収率",         icon: "📊" },
  { href: "/history",    label: "履歴",           icon: "📋" },
  { href: "/results",    label: "結果登録",       icon: "✅" },
  { href: "/settings",   label: "設定",           icon: "⚙️" },
];

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex fixed top-0 left-0 h-full w-60 flex-col z-20 border-r"
      style={{
        backgroundColor: "var(--turf-dark)",
        borderColor: "var(--turf-light)",
      }}
    >
      {/* ロゴ */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--turf-light)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, var(--turf-light), #0d4a20)", border: "1px solid var(--gold)", color: "var(--gold)" }}
          >
            馬
          </div>
          <div>
            <p className="font-extrabold text-lg leading-none tracking-wide" style={{ color: "var(--gold)" }}>
              StrideEdge
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#7a9e86" }}>競馬予想支援システム</p>
          </div>
        </div>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 py-3 overflow-y-auto px-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all text-sm font-medium"
              style={
                active
                  ? {
                      background: "linear-gradient(90deg, var(--turf-light), #1e4a2a)",
                      color: "var(--gold-light)",
                      borderLeft: "3px solid var(--gold)",
                    }
                  : { color: "#8eb89a" }
              }
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--turf-mid)";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "";
              }}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* フッター */}
      <div className="px-4 py-3 border-t text-center" style={{ borderColor: "var(--turf-light)" }}>
        <p className="text-xs" style={{ color: "#4a6e56" }}>v0.1.0 MVP</p>
      </div>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const mobileItems = NAV_ITEMS.slice(0, 5);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex"
      style={{ backgroundColor: "var(--turf-dark)", borderTop: "1px solid var(--turf-light)" }}
    >
      {mobileItems.map((item) => {
        const active = isActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors"
            style={{ color: active ? "var(--gold-light)" : "#4a6e56" }}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className={`text-[10px] ${active ? "font-semibold" : ""}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileBottomNav />
    </>
  );
}
