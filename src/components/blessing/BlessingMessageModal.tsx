"use client";

import {useEffect, useState} from "react";
import {Modal} from "@/components/ui/Modal";

type Message = {body: string; reference?: string; title?: string | null};
const disabledKey = "ipec-blessing-messages-disabled";
const lastClosedKey = "ipec-blessing-message-last-closed";
const redisplayDelayMs = 24 * 60 * 60 * 1000;
const copy = {
  en: {closeLabel:"Close welcome message",disable:"Do not show these blessing messages again",notice:"These messages are words of blessing we share with our visitors. If you opt out, they will not appear on future visits.",close:"Close"},
  es: {closeLabel:"Cerrar mensaje de bienvenida",disable:"No volver a mostrar estos mensajes de bendición",notice:"Estos mensajes son palabras de bendición que compartimos con nuestros visitantes. Si eliges no volver a mostrarlos, no aparecerán en futuras visitas.",close:"Cerrar"},
  pt: {closeLabel:"Fechar mensagem de boas-vindas",disable:"Não mostrar estas mensagens de bênção novamente",notice:"Estas mensagens são palavras de bênção que compartilhamos com nossos visitantes. Se você optar por não recebê-las, não aparecerão em futuras visitas.",close:"Fechar"},
  ko: {closeLabel:"환영 메시지 닫기",disable:"이 축복 메시지를 다시 표시하지 않기",notice:"이 메시지는 방문객과 나누는 축복의 말씀입니다. 표시하지 않도록 선택하면 이후 방문에서 나타나지 않습니다.",close:"닫기"},
  de: {closeLabel:"Willkommensnachricht schließen",disable:"Diese Segensbotschaften nicht mehr anzeigen",notice:"Diese Nachrichten sind Segensworte, die wir mit unseren Besuchern teilen. Wenn du sie abwählst, erscheinen sie bei zukünftigen Besuchen nicht mehr.",close:"Schließen"}
} as const;

export function BlessingMessageModal({locale}: {locale: string}) {
  const [open, setOpen] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    const lastClosedAt = Number(localStorage.getItem(lastClosedKey));
    const isWithinRedisplayDelay = Number.isFinite(lastClosedAt) && Date.now() - lastClosedAt < redisplayDelayMs;
    if (localStorage.getItem(disabledKey) === "true" || isWithinRedisplayDelay) return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/blessing-message/?locale=${encodeURIComponent(locale)}`, {cache: "no-store"});
        if (!response.ok) return;
        const nextMessage = await response.json() as Message;
        if (!nextMessage.body) return;
        setMessage(nextMessage);
        setOpen(true);
      } catch {
        // Analytics or blessing lookup failures never block browsing.
      }
    }, 30000);
    return () => window.clearTimeout(timer);
  }, [locale]);

  if (!message) return null;
  const t = copy[locale as keyof typeof copy] ?? copy.en;
  const closeMessage = () => {
    if (disabled) localStorage.setItem(disabledKey, "true");
    localStorage.setItem(lastClosedKey, String(Date.now()));
    setOpen(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeMessage();
        else setOpen(true);
      }}
      title={message.title ?? "A word for you"}
      closeLabel={t.closeLabel}
    >
      <div className="blessing-message">
        <blockquote>{message.body}</blockquote>
        {message.reference ? <p>{message.reference}</p> : null}
      </div>
      <label className="blessing-opt-out">
        <input
          type="checkbox"
          checked={disabled}
          onChange={(event) => setDisabled(event.target.checked)}
        />
        <span>{t.disable}</span>
      </label>
      {disabled ? <p className="blessing-opt-out-notice">{t.notice}</p> : null}
      <div className="modal-actions">
        <button
          type="button"
          className="button"
          onClick={closeMessage}
        >
          {t.close}
        </button>
      </div>
    </Modal>
  );
}
