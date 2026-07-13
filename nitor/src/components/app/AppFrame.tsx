import type { ReactNode } from "react";
import { Sidebar } from "@/components/nav/Sidebar";
import { TabBar } from "@/components/nav/TabBar";

/**
 * Shared desktop-first shell: fixed glass Sidebar on md+, floating TabBar
 * below md, main content offset to the right of the sidebar on desktop.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <Sidebar />
      <TabBar />
      <main className="md:pl-60">
        <div className="mx-auto w-full max-w-6xl px-6 md:px-10 py-8 md:py-12 pb-28 md:pb-12">
          {children}
        </div>
      </main>
    </>
  );
}
