"use client";

import { cn } from "@/lib/utils";
import { NavIconMenu } from "./company-sidebar-icons";

type CompanySidebarMenuButtonProps = {
  onClick: () => void;
  className?: string;
};

export function CompanySidebarMenuButton({ onClick, className }: CompanySidebarMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 lg:hidden",
        className,
      )}
      aria-label="Open navigation"
    >
      <NavIconMenu />
    </button>
  );
}
