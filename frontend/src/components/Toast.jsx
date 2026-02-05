import { useEffect } from 'react';

export default function Toast({ open, message, onClose, durationMs = 2500 }) {
  useEffect(() => {
    if (!open) return undefined;
    if (!durationMs) return undefined;

    const t = window.setTimeout(() => {
      if (typeof onClose === 'function') onClose();
    }, durationMs);

    return () => window.clearTimeout(t);
  }, [open, durationMs, onClose]);

  if (!open) return null;

  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      <div className="toast">
        <div className="toast-icon" aria-hidden="true">
          ✓
        </div>
        <div className="toast-body">
          <div className="toast-title">{message || ''}</div>
        </div>
        <button className="toast-close" type="button" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
      </div>
    </div>
  );
}

