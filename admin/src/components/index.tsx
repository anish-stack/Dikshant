import { Toast } from "react-hot-toast";
import { BadgeColor } from "../utils/types";
import { useEffect } from "react";

// ─── UTILS ────────────────────────────────────────────────────────────────────
export const cx = (...classes: (string | false | undefined)[]) =>
  classes.filter(Boolean).join(" ");

// ─── CLASS CONSTANTS ──────────────────────────────────────────────────────────
export const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow";

export const btnPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

export const btnSecondary =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors";

export const btnDanger =
  "inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors";
export const btnOutline =
  "inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors";
// ─── COMPONENTS ───────────────────────────────────────────────────────────────
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function SectionHeader({ title }: { title: string }) {
  return <h2 className="mb-4 text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h2>;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

const badgeColors: Record<BadgeColor, string> = {
  gray:   "bg-slate-100 text-slate-600",
  green:  "bg-emerald-100 text-emerald-700",
  blue:   "bg-blue-100 text-blue-700",
  yellow: "bg-amber-100 text-amber-700",
  red:    "bg-red-100 text-red-700",
  purple: "bg-violet-100 text-violet-700",
  indigo: "bg-indigo-100 text-indigo-700",
};

export function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: BadgeColor }) {
  return (
    <span className={cx("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold", badgeColors[color])}>
      {children}
    </span>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-14">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-slate-400">
      <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={cx("rounded-xl p-4 border", color)}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

// ─── NEW: MODAL COMPONENT ─────────────────────────────────────────────────────
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  showClose = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showClose?: boolean;
}) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Prevent background scroll
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-5xl",
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className={cx(
          "w-full bg-white rounded-2xl shadow-xl overflow-scroll max-h-[90vh]",
          sizeClasses[size]
        )}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between border-b px-6 py-4">
            {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
            {showClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t px-6 py-4 bg-slate-50 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TOAST CONTAINER ──────────────────────────────────────────────────────────
export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl",
            t.type === "success" ? "bg-emerald-600" : "bg-red-500"
          )}
        >
          <span>{t.type === "success" ? "✓" : "✕"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}