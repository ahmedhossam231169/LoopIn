import { AlertTriangle } from "lucide-react";

// مودال تأكيد موحّد بدل confirm()/alert() البدائيين بتوع المتصفح
// نفس الديزاين المستخدم في مودال الريبورت (card + backdrop)
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="card w-full max-w-sm !p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center gap-2">
          {danger && <AlertTriangle size={18} className="shrink-0 text-red-400" />}
          <h3 className="text-base font-bold">{title}</h3>
        </div>
        {description && <p className="mb-3 text-sm text-mist-400">{description}</p>}
        <div className={"flex justify-end gap-2" + (description ? "" : " mt-4")}>
          <button onClick={onCancel} disabled={busy} className="btn-ghost !py-1.5 text-sm disabled:opacity-50">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={
              "!py-1.5 text-sm font-semibold disabled:opacity-50 " +
              (danger
                ? "inline-flex items-center gap-2 rounded-lg bg-red-500 px-5 py-2.5 text-white transition-colors hover:bg-red-600"
                : "btn-primary")
            }
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
