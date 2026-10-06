import type { ReactNode, SVGProps } from "react";

/**
 * Ícones em SVG inline (stroke) usados nas seções da landing.
 * Sem bibliotecas externas.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconDashboard(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Base>
  );
}

export function IconReceipt(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V18l-2.5-1.5L15 18l-2.5-1.5L10 18l-2.5-1.5L5 18V7.5Z" />
      <path d="M8 10h8M8 13.5h5" />
    </Base>
  );
}

export function IconSplit(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 4v4a4 4 0 0 0 4 4h8" />
      <path d="M6 20v-4a4 4 0 0 1 4-4h8" />
      <path d="M18 8l2.5 4-2.5 4" transform="translate(0,-4)" />
      <path d="M18 8l2.5 4-2.5 4" transform="translate(0,4)" />
      <circle cx="5" cy="4" r="1.4" />
      <circle cx="5" cy="20" r="1.4" />
    </Base>
  );
}

export function IconScale(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 4v16" />
      <path d="M5 8h14" />
      <path d="M8 8l-3 6h6l-3-6Z" />
      <path d="M16 8l-3 6h6l-3-6Z" />
      <path d="M9 20h6" />
    </Base>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <path d="M12 15v2" />
    </Base>
  );
}

export function IconReport(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 3h7l4 4v14H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
      <path d="M12 12v6M9.5 15.5 12 18l2.5-2.5" />
    </Base>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3.2 3.2 0 0 1 0 5.4" />
      <path d="M18 14.6a5.5 5.5 0 0 1 3 4.4" />
    </Base>
  );
}

export function IconHistory(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3.5 12A8.5 8.5 0 1 0 6 5.7L3.5 8" />
      <path d="M3.5 4v4h4" />
      <path d="M12 8v4.2l2.8 1.8" />
    </Base>
  );
}

export function IconShield(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3l7 2.5V11c0 4.6-3 8-7 10-4-2-7-5.4-7-10V5.5L12 3Z" />
      <path d="M9 11.5l2 2 4-4.5" />
    </Base>
  );
}

export function IconCoins(props: IconProps) {
  return (
    <Base {...props}>
      <ellipse cx="9" cy="7" rx="6" ry="2.6" />
      <path d="M3 7v5c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6V7" />
      <path d="M9 17.4c-3.3 0-6 1.2-6 2.6" />
      <circle cx="17" cy="15" r="4.5" />
      <path d="M17 13v4M15.5 15h3" />
    </Base>
  );
}

export function IconOne(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 6l3-2v14" />
      <path d="M7 20h10" />
    </Base>
  );
}

export function IconNoDouble(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
      <path d="M9 10h6M9 14h6" />
    </Base>
  );
}

export function IconEye(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  );
}

export function IconCard(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
      <path d="M2.5 10h19" />
      <path d="M6 14.5h4" />
    </Base>
  );
}

export function IconCamera(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 8h2.5L8 5.5h8L17.5 8H20a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </Base>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 12.5l5 5L20 6.5" />
    </Base>
  );
}

export function IconArrowDown(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 4v16" />
      <path d="M6 14l6 6 6-6" />
    </Base>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Base>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Base>
  );
}
