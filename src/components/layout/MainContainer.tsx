"use client";
import { usePathname } from "next/navigation";

export function MainContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullBleed = pathname === "/" || pathname === "/match";
  
  return (
    <main className={`flex-1 overflow-y-auto relative no-scrollbar ${!isFullBleed ? "mb-[85px]" : ""}`}>
      {children}
    </main>
  );
}
