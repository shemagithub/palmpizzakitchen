"use client";

type MoneyInputProps = {
  value: number | string;
  onChange: (value: number) => void;
  id?: string;
  "aria-label"?: string;
  className?: string;
  placeholder?: string;
};

/** RWF amount field — any whole number, no step-100 browser errors. */
export default function MoneyInput({
  value,
  onChange,
  id,
  "aria-label": ariaLabel,
  className = "",
  placeholder = "0",
}: MoneyInputProps) {
  return (
    <div
      className={`flex min-w-0 items-stretch overflow-hidden rounded-lg border border-pam-border bg-white focus-within:border-pam-red/50 focus-within:ring-2 focus-within:ring-pam-red/15 ${className}`}
    >
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-right text-sm font-semibold text-pam-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        value={value}
        onChange={(e) =>
          onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))
        }
      />
      <span className="flex shrink-0 items-center border-l border-pam-border bg-pam-sand/60 px-2.5 text-[11px] font-bold text-pam-muted">
        RWF
      </span>
    </div>
  );
}
