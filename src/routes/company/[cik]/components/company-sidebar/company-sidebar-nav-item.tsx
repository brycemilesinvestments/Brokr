import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CompanySidebarNavItemProps = {
  label: string;
  description?: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
};

export function CompanySidebarNavItem({
  label,
  description,
  icon,
  active = false,
  onClick,
}: CompanySidebarNavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left transition-colors",
        active
          ? "bg-emerald-50 text-emerald-700"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800",
      )}
    >
      {active ? (
        <span
          className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full bg-emerald-600"
          aria-hidden
        />
      ) : null}
      <span className={cn("shrink-0", active ? "text-emerald-700" : "text-zinc-500")}>{icon}</span>
      {description ? (
        <span className="min-w-0 flex-1">
          <span className={cn("block text-[12.5px] leading-tight", active ? "font-semibold" : "font-medium")}>
            {label}
          </span>
          <span className="mt-0.5 block text-[9.5px] text-zinc-400">{description}</span>
        </span>
      ) : (
        <span className={cn("text-[12.5px]", active ? "font-semibold" : "font-medium")}>{label}</span>
      )}
    </button>
  );
}

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

export function CompanySidebarAiBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-[5px] border border-violet-100 bg-violet-50 px-1.5 py-px text-[8.5px] font-semibold text-violet-700">
      ✦ AI
    </span>
  );
}
