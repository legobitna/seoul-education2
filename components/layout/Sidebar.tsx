"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  description?: string;
  match: (pathname: string) => boolean;
  disabled?: boolean;
}

export const navItems: NavItem[] = [
  {
    label: "회의록",
    href: "/",
    icon: "📝",
    description: "녹음 · AI 작성 · 메일 발송",
    match: (path) => path === "/" || path.startsWith("/meetings"),
  },
  {
    label: "민원 분류기",
    href: "/complaints",
    icon: "📂",
    description: "민원 자동 분류 · 대시보드",
    match: (path) => path.startsWith("/complaints"),
  },
  {
    label: "설정",
    href: "/settings",
    icon: "⚙️",
    description: "API · Gmail · 참석자",
    match: (path) => path.startsWith("/settings"),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="px-4 py-5 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          메뉴
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = item.match(pathname);
          if (item.disabled) {
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 cursor-not-allowed"
              >
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.description && (
                    <p className="text-xs text-slate-400">{item.description}</p>
                  )}
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 border border-blue-100"
                  : "text-slate-700 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className={`text-sm font-medium ${active ? "text-blue-700" : ""}`}>
                  {item.label}
                </p>
                {item.description && (
                  <p
                    className={`text-xs mt-0.5 ${active ? "text-blue-500" : "text-slate-400"}`}
                  >
                    {item.description}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {pathname === "/" || pathname.startsWith("/meetings") ? (
        <div className="p-3 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 px-3 mb-2">회의록 바로가기</p>
          <Link
            href="/meetings/new"
            className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
              pathname === "/meetings/new"
                ? "bg-blue-600 text-white font-medium"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            + 새 회의
          </Link>
        </div>
      ) : null}

      <div className="p-4 border-t border-slate-100">
        <p className="text-xs text-slate-400 leading-relaxed">
          추가 기능은 사이드 메뉴에 계속 확장할 수 있습니다.
        </p>
      </div>
    </aside>
  );
}
