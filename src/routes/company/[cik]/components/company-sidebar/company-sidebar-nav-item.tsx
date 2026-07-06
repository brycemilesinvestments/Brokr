import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export { CompanySidebarSectionLabel } from "./company-sidebar-section-label";
export { CompanySidebarAiBadge } from "./company-sidebar-ai-badge";

type CompanySidebarNavItemProps = {
  label: string;
  description?: string;
  icon: ReactNode;
  active?: boolean;
  href: string;
  onNavigate?: () => void;
};

export function CompanySidebarNavItem({
  label,
  description,
  icon,
  active = false,
  href,
  onNavigate,
}: CompanySidebarNavItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
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
    </Link>
  );
}
