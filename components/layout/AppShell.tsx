"use client";

import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 min-h-0 w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
