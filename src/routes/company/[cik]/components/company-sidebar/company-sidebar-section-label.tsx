import type { ReactNode } from "react";

export function CompanySidebarSectionLabel({
  children,
  badge,
}: {
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="mb-1 mt-4 flex items-center gap-1.5 px-2.5 first:mt-0">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
        {children}
      </span>
      {badge}
    </div>
  );
}
