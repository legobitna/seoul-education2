import Link from "next/link";

export function Header() {
  return (
    <header className="shrink-0 border-b border-slate-200 bg-white z-10">
      <div className="px-6 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-lg text-slate-900"
        >
          <span className="text-2xl">📝</span>
          회의록 자동화
        </Link>
        <p className="text-xs text-slate-500 hidden sm:block">
          로컬 · Gemini 무료 · Gmail 발송
        </p>
      </div>
    </header>
  );
}
