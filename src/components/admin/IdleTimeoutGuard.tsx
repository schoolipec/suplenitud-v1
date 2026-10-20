"use client";

import {useCallback, useEffect, useRef} from "react";
import {useRouter} from "next/navigation";
import {authClient} from "@/lib/auth-client";
import {useAdminShell} from "@/components/admin/AdminShellProvider";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;
const WARNING_BEFORE_MS = 2 * 60 * 1000;

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "mousedown", "mousemove", "keydown", "scroll", "touchstart", "click",
];

export function IdleTimeoutGuard() {
  const {t} = useAdminShell();
  const router = useRouter();
  const lastActivityRef = useRef(0);
  const warningShownRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (warningShownRef.current) {
      warningShownRef.current = false;
      dialogRef.current?.close();
    }
  }, []);

  const performSignOut = useCallback(async () => {
    try {
      await authClient.signOut();
    } finally {
      router.replace("/admin/sign-in");
    }
  }, [router]);

  useEffect(() => {
    lastActivityRef.current = Date.now();
    const handler = () => { lastActivityRef.current = Date.now(); };

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handler, {passive: true});
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= IDLE_TIMEOUT_MS) {
        clearInterval(interval);
        void performSignOut();
        return;
      }

      if (elapsed >= IDLE_TIMEOUT_MS - WARNING_BEFORE_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        dialogRef.current?.showModal();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handler);
      }
    };
  }, [performSignOut]);

  const idleMessages = t.idleTimeout;

  return (
    <dialog ref={dialogRef} className="idle-timeout-dialog" aria-labelledby="idle-timeout-title">
      <h2 id="idle-timeout-title">{idleMessages.title}</h2>
      <p>{idleMessages.message}</p>
      <div className="idle-timeout-actions">
        <button type="button" className="admin-button-primary" onClick={resetTimer}>
          {idleMessages.staySignedIn}
        </button>
        <button type="button" className="admin-button-secondary" onClick={() => void performSignOut()}>
          {idleMessages.signOut}
        </button>
      </div>
    </dialog>
  );
}
