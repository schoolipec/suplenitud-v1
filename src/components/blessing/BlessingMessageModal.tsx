"use client";

import {useEffect, useId, useState} from "react";
import {Modal} from "@/components/ui/Modal";

type Message = {body: string; reference?: string; title?: string | null};

const disabledKey = "ipec-blessing-messages-disabled";
const lastClosedKey = "ipec-blessing-message-last-closed";
const displayDelayMs = 30_000;
const redisplayDelayMs = 24 * 60 * 60 * 1000;

const copy = {
  en: {
    closeLabel: "Close welcome message",
    disable: "Do not show these blessing messages again",
    notice: "These messages are words of blessing we share with our visitors. If you opt out, they will not appear on future visits.",
    churchHeader: "Fullness in Christ",
    verseBadge: "Verse of the Day",
    devotional: "May the living Word of God fill your heart with peace and renew your strength today.",
    amen: "Amen • Close",
  },
  es: {
    closeLabel: "Cerrar mensaje de bienvenida",
    disable: "No volver a mostrar estos mensajes de bendición",
    notice: "Estos mensajes son palabras de bendición que compartimos con nuestros visitantes. Si eliges no volver a mostrarlos, no aparecerán en futuras visitas.",
    churchHeader: "Plenitud en Cristo",
    verseBadge: "Versículo de Hoy",
    devotional: "Que la palabra viva de Dios llene tu corazón de paz y renueve tus fuerzas en este día.",
    amen: "Amén • Cerrar",
  },
  pt: {
    closeLabel: "Fechar mensagem de boas-vindas",
    disable: "Não mostrar estas mensagens de bênção novamente",
    notice: "Estas mensagens são palavras de bênção que compartilhamos com nossos visitantes. Se você optar por não recebê-las, não aparecerão em futuras visitas.",
    churchHeader: "Plenitude em Cristo",
    verseBadge: "Versículo do Dia",
    devotional: "Que a palavra viva de Deus encha seu coração de paz e renove suas forças neste dia.",
    amen: "Amém • Fechar",
  },
  ko: {
    closeLabel: "환영 메시지 닫기",
    disable: "이 축복 메시지를 다시 표시하지 않기",
    notice: "이 메시지는 방문객과 나누는 축복의 말씀입니다. 표시하지 않도록 선택하면 이후 방문에서 나타나지 않습니다.",
    churchHeader: "그리스도의 충만",
    verseBadge: "오늘의 말씀",
    devotional: "살아 계신 하나님의 말씀이 오늘 당신의 마음에 평안을 채우고 새 힘을 주시기를 축복합니다.",
    amen: "아멘 • 닫기",
  },
  de: {
    closeLabel: "Willkommensnachricht schließen",
    disable: "Diese Segensbotschaften nicht mehr anzeigen",
    notice: "Diese Nachrichten sind Segensworte, die wir mit unseren Besuchern teilen. Wenn du sie abwählst, erscheinen sie bei zukünftigen Besuchen nicht mehr.",
    churchHeader: "Fülle in Christus",
    verseBadge: "Bibelvers des Tages",
    devotional: "Möge das lebendige Wort Gottes dein Herz mit Frieden erfüllen und deine Kraft heute erneuern.",
    amen: "Amen • Schließen",
  },
} as const;

// El almacenamiento puede estar bloqueado (modo privado, politicas del navegador).
// En ese caso el modal sigue funcionando; simplemente no recuerda la eleccion.
function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento disponible no se puede persistir la preferencia.
  }
}

export function BlessingMessageModal({locale}: {locale: string}) {
  const [open, setOpen] = useState(false);
  const [optOut, setOptOut] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const noticeId = useId();

  useEffect(() => {
    const lastClosedAt = Number(readStorage(lastClosedKey));
    const isWithinRedisplayDelay = Number.isFinite(lastClosedAt) && Date.now() - lastClosedAt < redisplayDelayMs;
    if (readStorage(disabledKey) === "true" || isWithinRedisplayDelay) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/blessing-message/?locale=${encodeURIComponent(locale)}`, {cache: "no-store", signal: controller.signal});
        if (!response.ok) return;
        const nextMessage = (await response.json()) as Message;
        if (!nextMessage.body) return;
        setMessage(nextMessage);
        setOpen(true);
      } catch {
        // Un fallo de este mensaje nunca bloquea la navegacion.
      }
    }, displayDelayMs);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [locale]);

  if (!message) return null;

  const t = copy[locale as keyof typeof copy] ?? copy.en;
  const title = message.title || t.verseBadge;

  // Cierre sin opt-out: se oculta 24 horas. Con opt-out: se desactiva de forma permanente.
  const closeMessage = () => {
    if (optOut) writeStorage(disabledKey, "true");
    writeStorage(lastClosedKey, String(Date.now()));
    setOpen(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeMessage();
      }}
      title={title}
      closeLabel={t.closeLabel}
      contentClassName="modal-bible"
      overlayClassName="modal-bible-overlay"
    >
      <div className="bible-container">
        <div className="bible-ribbon" aria-hidden="true">
          <div className="bible-ribbon-tail" />
        </div>

        <div className="bible-pages">
          {/* Pagina izquierda: identificacion del mensaje */}
          <div className="bible-page bible-page-left">
            <div className="bible-page-inner">
              <div className="bible-page-header">
                <span className="bible-church-badge">{t.churchHeader}</span>
                <span className="bible-cross" aria-hidden="true" />
              </div>

              <div className="bible-left-content">
                <h3 className="bible-word-title">{title}</h3>
                <div className="bible-ornament" aria-hidden="true">
                  <span className="bible-ornament-line" />
                  <span className="bible-ornament-mark" />
                  <span className="bible-ornament-line" />
                </div>
                <p className="bible-devotional-text">{t.devotional}</p>
              </div>
            </div>
          </div>

          <div className="bible-spine" aria-hidden="true">
            <div className="bible-spine-line" />
          </div>

          {/* Pagina derecha: versiculo y todas las acciones en orden de lectura */}
          <div className="bible-page bible-page-right">
            <div className="bible-page-inner">
              <div className="bible-page-header">
                <span className="bible-verse-badge">{t.verseBadge}</span>
              </div>

              <div className="bible-right-content">
                <blockquote className="bible-verse-blockquote">
                  <span className="bible-drop-quote" aria-hidden="true">“</span>
                  <span className="bible-verse-body">{message.body}</span>
                  <span className="bible-end-quote" aria-hidden="true">”</span>
                </blockquote>
                {message.reference ? <cite className="bible-verse-reference">{message.reference}</cite> : null}
              </div>

              <div className="bible-actions">
                <label className="blessing-opt-out bible-opt-out">
                  <input
                    type="checkbox"
                    checked={optOut}
                    aria-describedby={optOut ? noticeId : undefined}
                    onChange={(event) => setOptOut(event.target.checked)}
                  />
                  <span>{t.disable}</span>
                </label>
                {optOut ? (
                  <p id={noticeId} className="blessing-opt-out-notice bible-opt-out-notice">
                    {t.notice}
                  </p>
                ) : null}
                <button type="button" className="bible-amen-button" onClick={closeMessage}>
                  {t.amen}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
