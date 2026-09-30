'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MdWarning, MdClose } from 'react-icons/md';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  pending = false,
}) {
  // Escape closes it. Without this the only way out is the mouse, which is a
  // surprise on a dialog that otherwise looks like every other modal.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !pending) onCancel?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, pending, onCancel]);

  if (!open || typeof document === 'undefined') return null;

  /*
   * Rendered into document.body rather than where it is written.
   *
   * ConfirmSubmit puts this next to a Remove button, which lives in a table
   * cell styled `text-align: right; white-space: nowrap`. Both inherit, so the
   * dialog came out with its title against the right edge and its message on
   * one unwrapped line that ran past the rounded corner. position: fixed does
   * not escape inheritance, and a transformed ancestor would have trapped the
   * overlay in the cell as well. A portal settles both.
   */
  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        // Only the backdrop itself, so a drag that ends outside the dialog
        // does not dismiss it.
        if (event.target === event.currentTarget && !pending) onCancel?.();
      }}
    >
      <div className="modal-content modal-content--sm">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">
            <MdClose />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div
            aria-hidden="true"
            style={{
              width: '40px',
              height: '40px',
              minWidth: '40px',
              borderRadius: '10px',
              background: 'var(--error-glow)',
              color: 'var(--error)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
            }}
          >
            <MdWarning />
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={pending}>
            {/* Derived, so a Remove dialog does not say it is deleting. */}
            {pending ? `${confirmLabel}…` : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
