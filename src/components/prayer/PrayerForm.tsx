"use client";

import {FormEvent, useState} from "react";
import {getAvailableChannels} from "@/lib/prayer-validation";

type Locale = "en" | "es" | "pt" | "ko" | "de";

const copy: Record<Locale, {
  title: string;
  prayerOnly: string;
  prayerAndContact: string;
  message: string;
  messagePlaceholder: string;
  name: string;
  email: string;
  emailOptional: string;
  consentStore: string;
  consentContact: string;
  country: string;
  countryPlaceholder: string;
  channel: string;
  phone: string;
  whatsapp: string;
  timeZone: string;
  timeZonePlaceholder: string;
  availability: string;
  availabilityPlaceholder: string;
  noAvailability: string;
  submit: string;
  submitting: string;
  success: string;
  error: string;
  required: string;
}> = {
  en: {
    title: "How can we pray for you?",
    prayerOnly: "I only want you to pray for this request",
    prayerAndContact: "I want to be contacted by a prayer minister",
    message: "Your prayer request",
    messagePlaceholder: "Write your request here...",
    name: "Name",
    email: "Email",
    emailOptional: "Email (optional)",
    consentStore: "I consent to the church storing and managing this prayer request.",
    consentContact: "I consent to being contacted by a prayer minister about this request.",
    country: "Country",
    countryPlaceholder: "Select your country",
    channel: "Preferred contact channel",
    phone: "Phone number",
    whatsapp: "WhatsApp number",
    timeZone: "Your time zone",
    timeZonePlaceholder: "Select your time zone",
    availability: "Preferred time slot",
    availabilityPlaceholder: "Select a time slot",
    noAvailability: "No available time slots for your selection. Your request will be saved as pending.",
    submit: "Send request",
    submitting: "Sending...",
    success: "Your request has been received. We will pray for you.",
    error: "There was an error sending your request. Please try again.",
    required: "This field is required",
  },
  es: {
    title: "¿Cómo podemos orar por ti?",
    prayerOnly: "Solo deseo que oren por esta petición",
    prayerAndContact: "Deseo ser contactado por un hermano encargado de oración",
    message: "Tu petición de oración",
    messagePlaceholder: "Escribe tu petición aquí...",
    name: "Nombre",
    email: "Correo electrónico",
    emailOptional: "Correo electrónico (opcional)",
    consentStore: "Acepto que la iglesia almacene y administre esta petición de oración.",
    consentContact: "Acepto ser contactado por un hermano encargado de oración sobre esta petición.",
    country: "País",
    countryPlaceholder: "Selecciona tu país",
    channel: "Canal de contacto preferido",
    phone: "Número de teléfono",
    whatsapp: "Número de WhatsApp",
    timeZone: "Tu zona horaria",
    timeZonePlaceholder: "Selecciona tu zona horaria",
    availability: "Franja horaria preferida",
    availabilityPlaceholder: "Selecciona una franja horaria",
    noAvailability: "No hay franjas horarias disponibles para tu selección. Tu solicitud se guardará como pendiente.",
    submit: "Enviar petición",
    submitting: "Enviando...",
    success: "Tu petición ha sido recibida. Oraremos por ti.",
    error: "Hubo un error al enviar tu petición. Por favor intenta de nuevo.",
    required: "Este campo es obligatorio",
  },
  pt: {
    title: "Como podemos orar por você?",
    prayerOnly: "Apenas desejo que orem por este pedido",
    prayerAndContact: "Desejo ser contactado por um irmão responsável pela oração",
    message: "Seu pedido de oração",
    messagePlaceholder: "Escreva seu pedido aqui...",
    name: "Nome",
    email: "E-mail",
    emailOptional: "E-mail (opcional)",
    consentStore: "Aceito que a igreja armazene e administre este pedido de oração.",
    consentContact: "Aceito ser contactado por um irmão responsável pela oração sobre este pedido.",
    country: "País",
    countryPlaceholder: "Selecione seu país",
    channel: "Canal de contato preferido",
    phone: "Número de telefone",
    whatsapp: "Número de WhatsApp",
    timeZone: "Seu fuso horário",
    timeZonePlaceholder: "Selecione seu fuso horário",
    availability: "Faixa de horário preferida",
    availabilityPlaceholder: "Selecione uma faixa de horário",
    noAvailability: "Não há faixas de horário disponíveis para sua seleção. Seu pedido será salvo como pendente.",
    submit: "Enviar pedido",
    submitting: "Enviando...",
    success: "Seu pedido foi recebido. Oraremos por você.",
    error: "Houve um erro ao enviar seu pedido. Por favor tente novamente.",
    required: "Este campo é obrigatório",
  },
  ko: {
    title: "어떻게 기도해 드릴까요?",
    prayerOnly: "이 요청에 대해서만 기도해 주시길 원합니다",
    prayerAndContact: "기도 담당 형제로부터 연락받기를 원합니다",
    message: "기도 요청",
    messagePlaceholder: "요청을 여기에 입력하세요...",
    name: "이름",
    email: "이메일",
    emailOptional: "이메일 (선택)",
    consentStore: "교회가 이 기도 요청을 저장하고 관리하는 데 동의합니다.",
    consentContact: "이 요청에 대해 기도 담당 형제로부터 연락받는 데 동의합니다.",
    country: "국가",
    countryPlaceholder: "국가를 선택하세요",
    channel: "선호하는 연락 채널",
    phone: "전화번호",
    whatsapp: "WhatsApp 번호",
    timeZone: "시간대",
    timeZonePlaceholder: "시간대를 선택하세요",
    availability: "선호하는 시간대",
    availabilityPlaceholder: "시간대를 선택하세요",
    noAvailability: "선택에 사용 가능한 시간대가 없습니다. 요청이 보류 상태로 저장됩니다.",
    submit: "요청 보내기",
    submitting: "보내는 중...",
    success: "요청이 접수되었습니다. 기도하겠습니다.",
    error: "요청을 보내는 중 오류가 발생했습니다. 다시 시도해 주세요.",
    required: "필수 항목입니다",
  },
  de: {
    title: "Wie können wir für dich beten?",
    prayerOnly: "Ich möchte nur, dass ihr für diese Bitte betet",
    prayerAndContact: "Ich möchte von einem Gebetsbruder kontaktiert werden",
    message: "Deine Gebetsbitte",
    messagePlaceholder: "Schreibe deine Bitte hier...",
    name: "Name",
    email: "E-Mail",
    emailOptional: "E-Mail (optional)",
    consentStore: "Ich stimme zu, dass die Kirche diese Gebetsbitte speichert und verwaltet.",
    consentContact: "Ich stimme zu, von einem Gebetsbruder über diese Bitte kontaktiert zu werden.",
    country: "Land",
    countryPlaceholder: "Wähle dein Land",
    channel: "Bevorzugter Kontaktkanal",
    phone: "Telefonnummer",
    whatsapp: "WhatsApp-Nummer",
    timeZone: "Deine Zeitzone",
    timeZonePlaceholder: "Wähle deine Zeitzone",
    availability: "Bevorzugter Zeitraum",
    availabilityPlaceholder: "Wähle einen Zeitraum",
    noAvailability: "Keine verfügbaren Zeiträume für deine Auswahl. Deine Bitte wird als offen gespeichert.",
    submit: "Bitte senden",
    submitting: "Senden...",
    success: "Deine Bitte ist eingegangen. Wir werden für dich beten.",
    error: "Beim Senden deiner Bitte ist ein Fehler aufgetreten. Bitte versuche es erneut.",
    required: "Dieses Feld ist erforderlich",
  },
};

const COUNTRIES = [
  {code: "US", name: "United States"},
  {code: "CA", name: "Canada"},
  {code: "MX", name: "Mexico"},
  {code: "GB", name: "United Kingdom"},
  {code: "ES", name: "Spain"},
  {code: "AR", name: "Argentina"},
  {code: "BR", name: "Brazil"},
  {code: "CO", name: "Colombia"},
  {code: "CL", name: "Chile"},
  {code: "PE", name: "Peru"},
  {code: "VE", name: "Venezuela"},
  {code: "EC", name: "Ecuador"},
  {code: "BO", name: "Bolivia"},
  {code: "PY", name: "Paraguay"},
  {code: "UY", name: "Uruguay"},
  {code: "CR", name: "Costa Rica"},
  {code: "PA", name: "Panama"},
  {code: "DO", name: "Dominican Republic"},
  {code: "PR", name: "Puerto Rico"},
  {code: "GT", name: "Guatemala"},
  {code: "HN", name: "Honduras"},
  {code: "SV", name: "El Salvador"},
  {code: "NI", name: "Nicaragua"},
  {code: "CU", name: "Cuba"},
  {code: "JM", name: "Jamaica"},
  {code: "HT", name: "Haiti"},
  {code: "AU", name: "Australia"},
  {code: "NZ", name: "New Zealand"},
  {code: "DE", name: "Germany"},
  {code: "FR", name: "France"},
  {code: "IT", name: "Italy"},
  {code: "PT", name: "Portugal"},
  {code: "NL", name: "Netherlands"},
  {code: "BE", name: "Belgium"},
  {code: "CH", name: "Switzerland"},
  {code: "AT", name: "Austria"},
  {code: "SE", name: "Sweden"},
  {code: "NO", name: "Norway"},
  {code: "DK", name: "Denmark"},
  {code: "FI", name: "Finland"},
  {code: "PL", name: "Poland"},
  {code: "CZ", name: "Czech Republic"},
  {code: "SK", name: "Slovakia"},
  {code: "HU", name: "Hungary"},
  {code: "RO", name: "Romania"},
  {code: "BG", name: "Bulgaria"},
  {code: "GR", name: "Greece"},
  {code: "TR", name: "Turkey"},
  {code: "IL", name: "Israel"},
  {code: "ZA", name: "South Africa"},
  {code: "NG", name: "Nigeria"},
  {code: "KE", name: "Kenya"},
  {code: "GH", name: "Ghana"},
  {code: "IN", name: "India"},
  {code: "PK", name: "Pakistan"},
  {code: "BD", name: "Bangladesh"},
  {code: "PH", name: "Philippines"},
  {code: "VN", name: "Vietnam"},
  {code: "TH", name: "Thailand"},
  {code: "MY", name: "Malaysia"},
  {code: "SG", name: "Singapore"},
  {code: "ID", name: "Indonesia"},
  {code: "JP", name: "Japan"},
  {code: "KR", name: "South Korea"},
  {code: "CN", name: "China"},
  {code: "TW", name: "Taiwan"},
  {code: "HK", name: "Hong Kong"},
  {code: "RU", name: "Russia"},
  {code: "UA", name: "Ukraine"},
];

const TIME_ZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Lisbon",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
];

type AvailabilitySlot = {
  id: string;
  startTime: string;
  endTime: string;
  contactName: string;
};

export function PrayerForm({locale = "en"}: {locale?: Locale}) {
  const t = copy[locale] || copy.en;
  const [requestType, setRequestType] = useState<"PRAYER_ONLY" | "PRAYER_AND_CONTACT">("PRAYER_ONLY");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consentStore, setConsentStore] = useState(false);
  const [consentContact, setConsentContact] = useState(false);
  const [country, setCountry] = useState("");
  const [contactChannel, setContactChannel] = useState<"PHONE" | "WHATSAPP">("WHATSAPP");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [availabilitySlotId, setAvailabilitySlotId] = useState("");
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{success: boolean; message: string} | null>(null);

  const channels = country ? getAvailableChannels(country) : ["WHATSAPP"];

  async function loadAvailabilitySlots() {
    if (!timeZone || !country) {
      setAvailabilitySlots([]);
      return;
    }
    setLoadingSlots(true);
    try {
      const response = await fetch(`/api/prayer/availability?timeZone=${encodeURIComponent(timeZone)}&country=${encodeURIComponent(country)}`);
      if (response.ok) {
        const data = await response.json();
        setAvailabilitySlots(data.slots || []);
      } else {
        setAvailabilitySlots([]);
      }
    } catch {
      setAvailabilitySlots([]);
    }
    setLoadingSlots(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    const payload: Record<string, unknown> = {
      requestType,
      message,
      name,
      email: email || undefined,
      consentStore,
    };

    if (requestType === "PRAYER_AND_CONTACT") {
      payload.consentToContact = consentContact;
      payload.country = country;
      payload.contactChannel = contactChannel;
      payload.timeZone = timeZone;
      if (contactChannel === "PHONE") {
        payload.phone = phone;
      } else {
        payload.whatsapp = whatsapp;
      }
      if (availabilitySlotId) {
        payload.availabilitySlotId = availabilitySlotId;
      }
    }

    try {
      const response = await fetch("/api/prayer", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setResult({success: true, message: t.success});
        (event.target as HTMLFormElement).reset();
        setMessage("");
        setName("");
        setEmail("");
        setConsentStore(false);
        setConsentContact(false);
        setCountry("");
        setContactChannel("WHATSAPP");
        setPhone("");
        setWhatsapp("");
        setTimeZone("");
        setAvailabilitySlotId("");
        setAvailabilitySlots([]);
      } else {
        setResult({success: false, message: t.error});
      }
    } catch {
      setResult({success: false, message: t.error});
    }

    setSubmitting(false);
  }

  return (
    <form className="prayer-form" onSubmit={submit}>
      <h3>{t.title}</h3>

      <div className="prayer-options">
        <label className="prayer-option">
          <input
            type="radio"
            name="requestType"
            value="PRAYER_ONLY"
            checked={requestType === "PRAYER_ONLY"}
            onChange={() => setRequestType("PRAYER_ONLY")}
          />
          <span>{t.prayerOnly}</span>
        </label>
        <label className="prayer-option">
          <input
            type="radio"
            name="requestType"
            value="PRAYER_AND_CONTACT"
            checked={requestType === "PRAYER_AND_CONTACT"}
            onChange={() => setRequestType("PRAYER_AND_CONTACT")}
          />
          <span>{t.prayerAndContact}</span>
        </label>
      </div>

      <label>
        <span>{t.message}</span>
        <textarea
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.messagePlaceholder}
          required
          minLength={10}
          maxLength={2000}
          rows={4}
        />
      </label>

      <label>
        <span>{t.name}</span>
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
        />
      </label>

      <label>
        <span>{t.emailOptional}</span>
        <input
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>

      {requestType === "PRAYER_AND_CONTACT" && (
        <>
          <label>
            <span>{t.country}</span>
            <select
              name="country"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setContactChannel(getAvailableChannels(e.target.value)[0]);
              }}
              required
            >
              <option value="">{t.countryPlaceholder}</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </label>

          {country && (
            <>
              <label>
                <span>{t.channel}</span>
                <select
                  name="contactChannel"
                  value={contactChannel}
                  onChange={(e) => setContactChannel(e.target.value as "PHONE" | "WHATSAPP")}
                  required
                >
                  {channels.map((ch) => (
                    <option key={ch} value={ch}>{ch === "PHONE" ? t.phone : t.whatsapp}</option>
                  ))}
                </select>
              </label>

              {contactChannel === "PHONE" && (
                <label>
                  <span>{t.phone}</span>
                  <input
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    required
                    placeholder="+1234567890"
                  />
                </label>
              )}

              {contactChannel === "WHATSAPP" && (
                <label>
                  <span>{t.whatsapp}</span>
                  <input
                    name="whatsapp"
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    autoComplete="tel"
                    required
                    placeholder="+1234567890"
                  />
                </label>
              )}

              <label>
                <span>{t.timeZone}</span>
                <select
                  name="timeZone"
                  value={timeZone}
                  onChange={(e) => {
                    setTimeZone(e.target.value);
                    setAvailabilitySlotId("");
                    loadAvailabilitySlots();
                  }}
                  required
                >
                  <option value="">{t.timeZonePlaceholder}</option>
                  {TIME_ZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </label>

              {timeZone && (
                <label>
                  <span>{t.availability}</span>
                  {loadingSlots ? (
                    <p>{t.submitting}</p>
                  ) : availabilitySlots.length > 0 ? (
                    <select
                      name="availabilitySlotId"
                      value={availabilitySlotId}
                      onChange={(e) => setAvailabilitySlotId(e.target.value)}
                    >
                      <option value="">{t.availabilityPlaceholder}</option>
                      {availabilitySlots.map((slot) => (
                        <option key={slot.id} value={slot.id}>
                          {slot.startTime} - {slot.endTime} ({slot.contactName})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="prayer-no-availability">{t.noAvailability}</p>
                  )}
                </label>
              )}
            </>
          )}

          <label className="prayer-consent">
            <input
              name="consentContact"
              type="checkbox"
              checked={consentContact}
              onChange={(e) => setConsentContact(e.target.checked)}
              required
            />
            <span>{t.consentContact}</span>
          </label>
        </>
      )}

      <label className="prayer-consent">
        <input
          name="consentStore"
          type="checkbox"
          checked={consentStore}
          onChange={(e) => setConsentStore(e.target.checked)}
          required
        />
        <span>{t.consentStore}</span>
      </label>

      <button className="button primary" type="submit" disabled={submitting}>
        {submitting ? t.submitting : t.submit}
      </button>

      {result && (
        <p className="form-message" role="status">
          {result.message}
        </p>
      )}
    </form>
  );
}
