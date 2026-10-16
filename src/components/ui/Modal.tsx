"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {IconX} from "@tabler/icons-react";
import {useEffect, useRef} from "react";

/**
 * Accessible, reusable modal built on Radix Dialog.
 * Focus is trapped and restored, the backdrop is inert, and the dialog
 * sits above the site header, drawer and admin navigation.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  closeLabel = "Cerrar",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  closeLabel?: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      const target = contentRef.current?.querySelector<HTMLElement>(
        "[data-autofocus], button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
      );
      (target ?? contentRef.current)?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      previouslyFocused?.focus();
    };
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          ref={contentRef}
          className="modal-content"
          aria-describedby={description ? "modal-description" : undefined}
          onOpenAutoFocus={(event) => {
            if (!contentRef.current?.contains(event.target as Node)) {
              event.preventDefault();
              contentRef.current?.focus();
            }
          }}
        >
          <div className="modal-header">
            <Dialog.Title className="modal-title" id="modal-title">{title}</Dialog.Title>
            <Dialog.Close className="modal-close" aria-label={closeLabel}>
              <IconX size={20} aria-hidden />
            </Dialog.Close>
          </div>
          {description ? <Dialog.Description className="modal-description" id="modal-description">{description}</Dialog.Description> : null}
          <div className="modal-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
