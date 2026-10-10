"use client";

import {useEffect, useState} from "react";

type Message = {body: string; reference?: string; title?: string | null};
const disabledKey = "ipec-blessing-messages-disabled";

export function BlessingMessageModal({locale}: {locale: string}) {
  const [open, setOpen] = useState(false); const [disabled, setDisabled] = useState(false); const [message, setMessage] = useState<Message | null>(null);
  useEffect(() => { if (localStorage.getItem(disabledKey) === "true" || sessionStorage.getItem("ipec-blessing-shown")) return; const timer = window.setTimeout(async () => {try {const response = await fetch(`/api/blessing-message?locale=${encodeURIComponent(locale)}`, {cache:"no-store"}); if (!response.ok) return; const nextMessage = await response.json() as Message; if (!nextMessage.body) return; setMessage(nextMessage); sessionStorage.setItem("ipec-blessing-shown", "true"); setOpen(true)} catch {}}, 30000); return () => window.clearTimeout(timer); }, [locale]);
  if (!open || !message) return null;
  return <dialog open id="welcome-modal"><button className="modal-close" aria-label="Close welcome message" onClick={() => setOpen(false)}>×</button><p className="eyebrow">{message.title ?? "A word for you"}</p><blockquote>{message.body}</blockquote>{message.reference && <p>{message.reference}</p>}<label><input type="checkbox" checked={disabled} onChange={(event) => setDisabled(event.target.checked)} /> Do not show these blessing messages again</label><p>These messages are words of blessing we share with our visitors.</p><button type="button" onClick={() => {if (disabled) localStorage.setItem(disabledKey, "true"); setOpen(false)}}>Close</button></dialog>;
}
