"use client";

import {useEffect, useState} from "react";

type Message = {body: string; reference?: string; title?: string | null};
const disabledKey = "ipec-blessing-messages-disabled";
const copy = {
  en: {closeLabel:"Close welcome message",disable:"Do not show these blessing messages again",notice:"These messages are words of blessing we share with our visitors. If you opt out, they will not appear on future visits.",close:"Close"},
  es: {closeLabel:"Cerrar mensaje de bienvenida",disable:"No volver a mostrar estos mensajes de bendición",notice:"Estos mensajes son palabras de bendición que compartimos con nuestros visitantes. Si eliges no volver a mostrarlos, no aparecerán en futuras visitas.",close:"Cerrar"},
  pt: {closeLabel:"Fechar mensagem de boas-vindas",disable:"Não mostrar estas mensagens de bênção novamente",notice:"Estas mensagens são palavras de bênção que compartilhamos com nossos visitantes. Se você optar por não recebê-las, não aparecerão em futuras visitas.",close:"Fechar"},
  ko: {closeLabel:"환영 메시지 닫기",disable:"이 축복 메시지를 다시 표시하지 않기",notice:"이 메시지는 방문객과 나누는 축복의 말씀입니다. 표시하지 않도록 선택하면 이후 방문에서 나타나지 않습니다.",close:"닫기"},
  de: {closeLabel:"Willkommensnachricht schließen",disable:"Diese Segensbotschaften nicht mehr anzeigen",notice:"Diese Nachrichten sind Segensworte, die wir mit unseren Besuchern teilen. Wenn du sie abwählst, erscheinen sie bei zukünftigen Besuchen nicht mehr.",close:"Schließen"}
} as const;

export function BlessingMessageModal({locale}: {locale: string}) {
  const [open, setOpen] = useState(false); const [disabled, setDisabled] = useState(false); const [message, setMessage] = useState<Message | null>(null);
  useEffect(() => { if (localStorage.getItem(disabledKey) === "true" || sessionStorage.getItem("ipec-blessing-shown")) return; const timer = window.setTimeout(async () => {try {const response = await fetch(`/api/blessing-message/?locale=${encodeURIComponent(locale)}`, {cache:"no-store"}); if (!response.ok) return; const nextMessage = await response.json() as Message; if (!nextMessage.body) return; setMessage(nextMessage); sessionStorage.setItem("ipec-blessing-shown", "true"); setOpen(true)} catch {}}, 30000); return () => window.clearTimeout(timer); }, [locale]);
  if (!open || !message) return null;
  const t = copy[locale as keyof typeof copy] ?? copy.en;
  return <dialog open id="welcome-modal"><button className="modal-close" aria-label={t.closeLabel} onClick={() => setOpen(false)}>×</button><p className="eyebrow">{message.title ?? "A word for you"}</p><blockquote>{message.body}</blockquote>{message.reference && <p>{message.reference}</p>}<label><input type="checkbox" checked={disabled} onChange={(event) => setDisabled(event.target.checked)} /> {t.disable}</label><p>{t.notice}</p><button type="button" onClick={() => {if (disabled) localStorage.setItem(disabledKey, "true"); setOpen(false)}}>{t.close}</button></dialog>;
}
