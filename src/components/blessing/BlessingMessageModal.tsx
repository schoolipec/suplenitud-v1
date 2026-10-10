"use client";

import {useEffect, useState} from "react";

type Message = {body: string; reference?: string};
const disabledKey = "ipec-blessing-messages-disabled";

export function BlessingMessageModal({message, label = "A word for you", disableLabel = "Do not show these blessing messages again", notice = "These messages are words of blessing we share with our visitors."}: {message: Message; label?: string; disableLabel?: string; notice?: string}) {
  const [open, setOpen] = useState(false); const [disabled, setDisabled] = useState(false);
  useEffect(() => { if (localStorage.getItem(disabledKey) === "true" || sessionStorage.getItem("ipec-blessing-shown")) return; const timer = window.setTimeout(() => {setOpen(true); sessionStorage.setItem("ipec-blessing-shown", "true")}, 30000); return () => window.clearTimeout(timer); }, []);
  if (!open) return null;
  return <dialog open id="welcome-modal"><button className="modal-close" aria-label="Close welcome message" onClick={() => setOpen(false)}>×</button><p className="eyebrow">{label}</p><blockquote>{message.body}</blockquote>{message.reference && <p>{message.reference}</p>}<label><input type="checkbox" checked={disabled} onChange={(event) => setDisabled(event.target.checked)} /> {disableLabel}</label><p>{notice}</p><button type="button" onClick={() => {if (disabled) localStorage.setItem(disabledKey, "true"); setOpen(false)}}>Close</button></dialog>;
}
