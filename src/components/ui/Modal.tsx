"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {IconX} from "@tabler/icons-react";

/**
 * Accessible, reusable modal built on Radix Dialog.
 * Focus is trapped and restored by Radix; the backdrop is inert, and the
 * dialog sits above the site header, drawer and admin navigation.
 * Use `dismissable={false}` together with `showCloseButton={false}` for
 * modals that must only close through their own explicit action.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  closeLabel = "Cerrar",
  showCloseButton = true,
  dismissable = true,
  contentClassName,
  overlayClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  closeLabel?: string;
  showCloseButton?: boolean;
  dismissable?: boolean;
  contentClassName?: string;
  overlayClassName?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClassName ? `modal-overlay ${overlayClassName}` : "modal-overlay"} />
        <Dialog.Content
          className={contentClassName ? `modal-content ${contentClassName}` : "modal-content"}
          aria-describedby={description ? undefined : undefined}
          onEscapeKeyDown={dismissable ? undefined : (event) => event.preventDefault()}
          onPointerDownOutside={dismissable ? undefined : (event) => event.preventDefault()}
        >
          <div className="modal-header">
            <Dialog.Title className="modal-title">{title}</Dialog.Title>
            {showCloseButton ? (
              <Dialog.Close className="modal-close" aria-label={closeLabel}>
                <IconX size={20} aria-hidden />
              </Dialog.Close>
            ) : null}
          </div>
          {description ? <Dialog.Description className="modal-description">{description}</Dialog.Description> : null}
          <div className="modal-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
