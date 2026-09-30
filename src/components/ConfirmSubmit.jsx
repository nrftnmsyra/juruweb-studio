'use client';

import { useRef, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

/**
 * A destructive button that asks first.
 *
 * Wraps a server-action form: the visible button only opens the dialog, and the
 * form is submitted from the dialog's confirm. Lets a Server Component keep a
 * plain `<form action={serverAction}>` while still getting a confirmation step.
 */
export default function ConfirmSubmit({
  action,
  fields = {},
  title,
  message,
  confirmLabel = 'Remove',
  className = 'btn btn-danger btn-sm',
  children,
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef(null);

  return (
    <>
      <form ref={formRef} action={action}>
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {/* type=button so a click opens the dialog instead of submitting. */}
        <button type="button" className={className} onClick={() => setOpen(true)}>
          {children}
        </button>
      </form>

      <ConfirmDialog
        open={open}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </>
  );
}
