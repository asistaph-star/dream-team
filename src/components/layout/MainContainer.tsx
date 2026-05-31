"use client";
import { usePathname } from "next/navigation";

export function MainContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="flex-1 overflow-y-auto relative no-scrollbar bg-[#020617]">
      <div key={pathname} className="w-full h-full animate-page-enter">
        {children}
      </div>
    </main>
  );
}
