"use client";

import {IconBrandTelegram, IconBrandWhatsapp, IconPhone} from "@tabler/icons-react";
import {FormEvent, useState} from "react";

type Locale = "en" | "es" | "pt" | "ko" | "de";
export const PRAYER_MESSAGE_MAX_LENGTH = 500;

type Copy = {title: string; intro: string; name: string; namePlaceholder: string; request: string; requestPlaceholder: string; counter: (used: number, remaining: number) => string; submit: string; submitting: string; contactPrompt: string; call: string; whatsapp: string; telegram: string; successTitle: string; successText: string; close: string; error: string; contactMessage: string};

const copy: Record<Locale, Copy> = {
  en: {title: "How can we pray for you?", intro: "Share your request. We will receive it with respect and present it before the Lord and the congregation.", name: "Name", namePlaceholder: "Enter your name", request: "Prayer request", requestPlaceholder: "Share your request here...", counter: (used, remaining) => `${used} used · ${remaining} remaining`, submit: "Send request", submitting: "Sending...", contactPrompt: "Would you like to contact us? Choose a channel.", call: "Call us", whatsapp: "Contact us on WhatsApp", telegram: "Contact us on Telegram", successTitle: "Request received", successText: "Thank you for sharing your prayer request. We have received it successfully and will present it before the congregation for prayer.", close: "Close", error: "We could not send your request. Please try again.", contactMessage: "I would like to share a prayer request."},
  es: {title: "¿Cómo podemos orar por usted?", intro: "Comparta su petición. La recibiremos con respeto y la presentaremos ante el Señor y la congregación.", name: "Nombre", namePlaceholder: "Escriba su nombre", request: "Petición de oración", requestPlaceholder: "Comparta aquí su petición...", counter: (used, remaining) => `${used} usados · ${remaining} restantes`, submit: "Enviar petición", submitting: "Enviando...", contactPrompt: "¿Desea contactarnos? Elija un canal.", call: "Llamarnos", whatsapp: "Contactarnos por WhatsApp", telegram: "Contactarnos por Telegram", successTitle: "Petición recibida", successText: "Gracias por haber compartido su petición de oración. La hemos recibido exitosamente y la presentaremos ante la congregación para orar.", close: "Cerrar", error: "No pudimos enviar su petición. Inténtelo nuevamente.", contactMessage: "Quiero compartir una petición de oración."},
  pt: {title: "Como podemos orar por você?", intro: "Compartilhe seu pedido. Nós o receberemos com respeito e o apresentaremos ao Senhor e à congregação.", name: "Nome", namePlaceholder: "Digite seu nome", request: "Pedido de oração", requestPlaceholder: "Compartilhe seu pedido aqui...", counter: (used, remaining) => `${used} usados · ${remaining} restantes`, submit: "Enviar pedido", submitting: "Enviando...", contactPrompt: "Deseja falar conosco? Escolha um canal.", call: "Ligar para nós", whatsapp: "Falar pelo WhatsApp", telegram: "Falar pelo Telegram", successTitle: "Pedido recebido", successText: "Obrigado por compartilhar seu pedido de oração. Nós o recebemos com sucesso e o apresentaremos à congregação para orar.", close: "Fechar", error: "Não foi possível enviar seu pedido. Tente novamente.", contactMessage: "Quero compartilhar um pedido de oração."},
  ko: {title: "어떻게 기도해 드릴까요?", intro: "기도 제목을 나누어 주세요. 존중하는 마음으로 받아 주님과 회중 앞에 올려 드리겠습니다.", name: "이름", namePlaceholder: "이름을 입력하세요", request: "기도 요청", requestPlaceholder: "기도 제목을 입력하세요...", counter: (used, remaining) => `${used}자 사용 · ${remaining}자 남음`, submit: "기도 요청 보내기", submitting: "보내는 중...", contactPrompt: "연락을 원하시나요? 채널을 선택하세요.", call: "전화하기", whatsapp: "WhatsApp으로 연락하기", telegram: "Telegram으로 연락하기", successTitle: "기도 요청이 접수되었습니다", successText: "기도 요청을 나누어 주셔서 감사합니다. 성공적으로 접수되었으며 회중과 함께 기도하겠습니다.", close: "닫기", error: "기도 요청을 보낼 수 없습니다. 다시 시도해 주세요.", contactMessage: "기도 요청을 나누고 싶습니다."},
  de: {title: "Wie können wir für Sie beten?", intro: "Teilen Sie Ihre Bitte. Wir nehmen sie respektvoll entgegen und bringen sie vor den Herrn und die Gemeinde.", name: "Name", namePlaceholder: "Geben Sie Ihren Namen ein", request: "Gebetsanliegen", requestPlaceholder: "Teilen Sie Ihr Anliegen hier...", counter: (used, remaining) => `${used} verwendet · ${remaining} übrig`, submit: "Bitte senden", submitting: "Wird gesendet...", contactPrompt: "Möchten Sie uns kontaktieren? Wählen Sie einen Kanal.", call: "Anrufen", whatsapp: "Über WhatsApp kontaktieren", telegram: "Über Telegram kontaktieren", successTitle: "Bitte eingegangen", successText: "Vielen Dank, dass Sie Ihr Gebetsanliegen geteilt haben. Wir haben es erhalten und werden es der Gemeinde zum Gebet vorlegen.", close: "Schließen", error: "Ihre Bitte konnte nicht gesendet werden. Bitte versuchen Sie es erneut.", contactMessage: "Ich möchte ein Gebetsanliegen teilen."},
};

const churchPhone = "+17023282536";

export function PrayerForm({locale = "en"}: {locale?: Locale}) {
  const t = copy[locale] ?? copy.en;
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const remaining = PRAYER_MESSAGE_MAX_LENGTH - message.length;
  const contactMessage = encodeURIComponent(t.contactMessage);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(false);
    try {
      const response = await fetch("/api/prayer", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({name, message})});
      if (!response.ok) throw new Error("prayer_request_failed");
      setName("");
      setMessage("");
      setIsSuccessOpen(true);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return <form className="prayer-form" onSubmit={submit}>
    <h3>{t.title}</h3><p className="prayer-intro">{t.intro}</p>
    <div className="prayer-field"><label htmlFor="prayer-name">{t.name} <span className="prayer-required" aria-hidden="true">*</span></label><input id="prayer-name" name="name" value={name} onChange={(event) => setName(event.target.value)} placeholder={t.namePlaceholder} autoComplete="name" minLength={2} maxLength={100} required /></div>
    <div className="prayer-field"><label htmlFor="prayer-message">{t.request} <span className="prayer-required" aria-hidden="true">*</span></label><textarea id="prayer-message" name="message" value={message} onChange={(event) => setMessage(event.target.value.slice(0, PRAYER_MESSAGE_MAX_LENGTH))} placeholder={t.requestPlaceholder} maxLength={PRAYER_MESSAGE_MAX_LENGTH} aria-describedby="prayer-message-count" required rows={5} /><p id="prayer-message-count" className="prayer-counter" role="status">{t.counter(message.length, remaining)}</p></div>
    <button className="button primary prayer-submit" type="submit" disabled={submitting}>{submitting ? t.submitting : t.submit}</button>
    <section className="prayer-contact-actions" aria-label={t.contactPrompt}><p>{t.contactPrompt}</p><div><a href={`tel:${churchPhone}`} aria-label={t.call} title={t.call}><IconPhone aria-hidden size={25} stroke={2} /></a><a href={`https://wa.me/${churchPhone.slice(1)}?text=${contactMessage}`} target="_blank" rel="noreferrer" aria-label={t.whatsapp} title={t.whatsapp}><IconBrandWhatsapp aria-hidden size={27} stroke={2} /></a><a href={`https://t.me/${churchPhone}?text=${contactMessage}`} target="_blank" rel="noreferrer" aria-label={t.telegram} title={t.telegram}><IconBrandTelegram aria-hidden size={27} stroke={2} /></a></div></section>
    {error ? <p className="form-message prayer-error" role="alert">{t.error}</p> : null}
    {isSuccessOpen ? <div className="prayer-modal-backdrop" role="presentation"><section className="prayer-modal" role="dialog" aria-modal="true" aria-labelledby="prayer-success-title"><h4 id="prayer-success-title">{t.successTitle}</h4><p>{t.successText}</p><button className="button primary" type="button" onClick={() => setIsSuccessOpen(false)}>{t.close}</button></section></div> : null}
  </form>;
}
