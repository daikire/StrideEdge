"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_ITEMS = [
  { href: "/",            label: "DASHBOARD",  code: "01" },
  { href: "/predictions", label: "SIGNALS",    code: "02" },
  { href: "/races",       label: "RACES",      code: "03" },
  { href: "/calendar",    label: "CALENDAR",   code: "04" },
  { href: "/roi",         label: "RETURNS",    code: "05" },
  { href: "/history",     label: "HISTORY",    code: "06" },
  { href: "/results",     label: "RECORD",     code: "07" },
  { href: "/settings",    label: "CONFIG",     code: "08" },
];

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex fixed top-0 left-0 h-full w-56 flex-col z-20"
      style={{
        backgroundColor: "var(--bg-panel)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* logo */}
      <div className="px-4 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded flex items-center justify-center shrink-0"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--gold)",
              fontFamily: "'DM Mono', monospace",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--gold)",
            }}
          >
            SE
          </div>
          <div>
            <p
              className="leading-none tracking-widest text-xs font-semibold"
              style={{ color: "var(--gold)", fontFamily: "'DM Mono', monospace" }}
            >
              STRIDEEDGE
            </p>
            <p
              className="text-[9px] mt-0.5 tracking-widest"
              style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
            >
              INVESTMENT TERMINAL
            </p>
          </div>
        </div>
      </div>

      {/* nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 mx-2 my-0.5 rounded transition-all"
              style={
                active
                  ? {
                      background: "var(--bg-elevated)",
                      borderLeft: "2px solid var(--gold)",
                      paddingLeft: "10px",
                    }
                  : {}
              }
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "";
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  color: active ? "var(--gold-dim)" : "var(--text-dim)",
                  minWidth: "16px",
                }}
              >
                {item.code}
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  color: active ? "var(--gold)" : "var(--text-secondary)",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* footer */}
      <div className="px-4 py-2.5" style={{ borderTop: "1px solid var(--border)" }}>
        <p
          className="text-[9px] tracking-widest"
          style={{ color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}
        >
          v2.0.0 / LOCAL
        </p>
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
      style={{ backgroundColor: "var(--bg-panel)", borderTop: "1px solid var(--border)" }}
    >
      {mobileItems.map((item) => {
        const active = isActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
            style={{
              color: active ? "var(--gold)" : "var(--text-dim)",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            <span className="text-[9px] font-medium tracking-widest">{item.code}</span>
            <span className={`text-[9px] tracking-wider ${active ? "font-semibold" : ""}`}>
              {item.label.slice(0, 4)}
            </span>
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
