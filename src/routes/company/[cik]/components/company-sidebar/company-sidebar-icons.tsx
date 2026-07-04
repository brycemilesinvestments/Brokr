import type { ReactNode } from "react";

export function NavIconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}

export function NavIconPeers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="6" cy="8" r="3.6" />
      <circle cx="10.5" cy="8" r="3.6" />
    </svg>
  );
}

export function NavIconShares() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 8 L8 2.5 A5.5 5.5 0 0 1 13 8 Z" fill="currentColor" stroke="none" opacity="0.25" />
    </svg>
  );
}

export function NavIconInsider() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="8" cy="5" r="2.6" />
      <path d="M3.2 13 a4.8 4.8 0 0 1 9.6 0" />
    </svg>
  );
}

export function NavIconFred() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <polyline points="2 12 5.5 7.5 8.5 10 14 3.5" />
    </svg>
  );
}

export function NavIconHealth() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <polyline points="2 8 5 8 6.5 4 9.5 12 11 8 14 8" />
    </svg>
  );
}

export function NavIconPatterns() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <circle cx="4.5" cy="4.5" r="1.4" />
      <circle cx="11.5" cy="4.5" r="1.4" />
      <circle cx="4.5" cy="11.5" r="1.4" />
      <circle cx="11.5" cy="11.5" r="1.4" />
    </svg>
  );
}

export function NavIconGuidance() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function NavIconTrends() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <polyline points="2 11 6 6 9 9 14 3" />
      <polyline points="10 3 14 3 14 7" />
    </svg>
  );
}

export function NavIconDocuments() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="2" width="10" height="12" rx="1.5" />
      <line x1="5.5" y1="5.5" x2="10.5" y2="5.5" />
      <line x1="5.5" y1="8" x2="10.5" y2="8" />
      <line x1="5.5" y1="10.5" x2="8.5" y2="10.5" />
    </svg>
  );
}

export function NavIconChevronRight({ className }: { className?: string }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden
    >
      <polyline points="4 4 8 7 4 10" />
    </svg>
  );
}

export function NavIconChat({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden
    >
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.2V16H6.5A2.5 2.5 0 0 1 4 13.5z" />
      <line x1="8.5" y1="9" x2="15.5" y2="9" />
      <line x1="8.5" y1="12" x2="13" y2="12" />
    </svg>
  );
}

export function NavIconBreadcrumbChevron({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden
    >
      <polyline points="5 3 9 7 5 11" />
    </svg>
  );
}

export type NavIconComponent = () => ReactNode;
