import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";

/**
 * Modal dialog for short, protected-focus tasks (the record creation
 * forms): a dimmed backdrop, one centered surface panel. Escape, a
 * backdrop click and the header close button dismiss it; focus moves to
 * the first field on open, is trapped while open and returns to the
 * previously focused element on close.
 */
export function Dialog(props: {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Focus the first form field (not the header's close button, which
  // precedes the body in the DOM); restore focus on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = bodyRef.current?.querySelector<HTMLElement>(
      "input, select, textarea, button",
    );
    (first ?? panelRef.current)?.focus();
    return () => previous?.focus();
  }, []);

  // Escape dismisses the dialog from anywhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [props.onClose]);

  // Minimal focus trap: Tab wraps between the panel's focusables.
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      "input, select, textarea, button, a[href]",
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="dialog-panel w-full max-w-md rounded-lg border border-border bg-surface shadow-2xl focus:outline-none"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
            {props.title}
          </h2>
          <button
            type="button"
            onClick={props.onClose}
            aria-label={t("common.close")}
            className="rounded-md p-1.5 text-muted transition-colors duration-200 hover:bg-background hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>
        <div ref={bodyRef} className="p-5">
          {props.children}
        </div>
      </div>
    </div>
  );
}
