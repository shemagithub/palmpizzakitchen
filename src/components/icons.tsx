type IconProps = { className?: string };

export function MenuIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CloseIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SearchIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M16.2 16.2 20 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BellIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M6 9.5a6 6 0 1 1 12 0c0 3.2 1.2 4.5 1.2 4.5H4.8S6 12.7 6 9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M10 18.5a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BagIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M6.5 8.5h11l-.8 10.2a1.5 1.5 0 0 1-1.5 1.3H8.8a1.5 1.5 0 0 1-1.5-1.3L6.5 8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 8.5V7a3 3 0 0 1 6 0v1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SlidersIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 8h10M18 8h2M4 16h2M10 16h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="16" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8" cy="16" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function HeartIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 20s-7-4.4-7-9.2C5 8 7 6.2 9.2 6.2c1.3 0 2.4.6 2.8 1.6.4-1 1.5-1.6 2.8-1.6C17 6.2 19 8 19 10.8 19 15.6 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HomeIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GridIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function TagIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3.5 12.5V5.8A1.8 1.8 0 0 1 5.3 4h6.7L20 11.9l-7.2 7.2L3.5 12.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function PhoneIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M7 3.8h3.2l1.2 3.2-1.6 1.6a12 12 0 0 0 5.6 5.6l1.6-1.6 3.2 1.2V17c0 .9-.7 1.7-1.6 1.6C9.4 17.8 6.2 14.6 5.4 6.4 5.3 5.5 6.1 4.8 7 3.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PinIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 21s6.5-5.2 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.8 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.5" r="2.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function UserIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5 19c1.6-3 4-4.5 7-4.5s5.4 1.5 7 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PizzaIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3c5.5 1.2 9 5.8 9 11.5 0 .4 0 .8-.1 1.2L12 21 3.1 15.7c-.1-.4-.1-.8-.1-1.2C3 8.8 6.5 4.2 12 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="11" r="1.1" fill="currentColor" />
      <circle cx="13.5" cy="13.5" r="1.1" fill="currentColor" />
      <circle cx="11.5" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

export function ScooterIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="6.5" cy="17.5" r="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.5" cy="17.5" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4 12h5l2 5.5M11 12h4l3 3M14 7h4l1.5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShieldIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3.5 19 6.5v5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9v-5l7-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m9.5 12 1.8 1.8 3.5-3.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SparkIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3.5 13.5 9 19 10.5 13.5 12 12 17.5 10.5 12 5 10.5 10.5 9 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LeafIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 15c6-1 10-5 12-12 0 0-8 1-12 8-1 2-1 4 0 4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 14c1-3 4-6 8-8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MailIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m5 7.5 7 5.5 7-5.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 10V8a4 4 0 0 1 8 0v2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TrashIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M8 7l.8 12.2A1.5 1.5 0 0 0 10.3 20.5h3.4a1.5 1.5 0 0 0 1.5-1.3L16 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlusIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MinusIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 12h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ClockIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 7.5V12l3 2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ReceiptIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M7 3.5h10a1 1 0 0 1 1 1V20l-2-1.2L14 20l-2-1.2L10 20l-2-1.2L6 20V4.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 8h6M9 12h6M9 16h3.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ArrowRightIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
