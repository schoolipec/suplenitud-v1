"use client";

import {FormEvent, useMemo, useRef, useState} from "react";

type Locale = "en" | "es" | "pt" | "ko" | "de";

export const PRAYER_MESSAGE_MAX_LENGTH = 1000;

type Copy = {
  title: string;
  name: string;
  requiredMark: string;
  emailOptional: string;
  message: string;
  messagePlaceholder: string;
  characters: string;
  requestType: string;
  prayerOnlyTitle: string;
  prayerOnlyText: string;
  prayerAndContactTitle: string;
  prayerAndContactText: string;
  channel: string;
  directCallTitle: string;
  directCallText: string;
  whatsappTitle: string;
  whatsappText: string;
  directOnlyNote: string;
  country: string;
  countryPlaceholder: string;
  countrySearchPlaceholder: string;
  countryNoMatch: string;
  phone: string;
  whatsapp: string;
  timeZone: string;
  timeZonePlaceholder: string;
  availability: string;
  availabilityPlaceholder: string;
  noAvailability: string;
  consentStore: string;
  consentContact: string;
  submit: string;
  submitting: string;
  success: string;
  error: string;
};

const copy: Record<Locale, Copy> = {
  en: {
    title: "How can we pray for you?",
    name: "Name",
    requiredMark: "required",
    emailOptional: "Email (optional)",
    message: "Prayer request",
    messagePlaceholder: "Write your request here...",
    characters: "characters",
    requestType: "How should we pray?",
    prayerOnlyTitle: "Pray only",
    prayerOnlyText: "I only want you to pray for this request. No contact.",
    prayerAndContactTitle: "Pray and contact me",
    prayerAndContactText: "I want to be contacted by a prayer minister.",
    channel: "How should we contact you?",
    directCallTitle: "Direct call",
    directCallText: "A phone call from a prayer minister.",
    whatsappTitle: "WhatsApp",
    whatsappText: "A WhatsApp message, from anywhere in the world.",
    directOnlyNote: "Direct calls are available only in the United States (including Puerto Rico), Canada, and Mexico. For other countries, please choose WhatsApp.",
    country: "Country",
    countryPlaceholder: "Select your country",
    countrySearchPlaceholder: "Search country…",
    countryNoMatch: "No matching country.",
    phone: "Phone number",
    whatsapp: "WhatsApp number",
    timeZone: "Your time zone",
    timeZonePlaceholder: "Select your time zone",
    availability: "Preferred time slot",
    availabilityPlaceholder: "Select a time slot",
    noAvailability: "No available time slots for your selection. Your request will be saved as pending.",
    consentStore: "I consent to the church storing and managing this prayer request.",
    consentContact: "I consent to being contacted by a prayer minister about this request.",
    submit: "Send request",
    submitting: "Sending...",
    success: "Your request has been received. We will pray for you.",
    error: "There was an error sending your request. Please try again.",
  },
  es: {
    title: "¿Cómo podemos orar por ti?",
    name: "Nombre",
    requiredMark: "obligatorio",
    emailOptional: "Correo electrónico (opcional)",
    message: "Petición de oración",
    messagePlaceholder: "Escribe tu petición aquí...",
    characters: "caracteres",
    requestType: "¿Cómo debemos orar?",
    prayerOnlyTitle: "Solo oración",
    prayerOnlyText: "Solo deseo que oren por esta petición. Sin contacto.",
    prayerAndContactTitle: "Oración y contacto",
    prayerAndContactText: "Deseo ser contactado por un hermano encargado de oración.",
    channel: "¿Cómo debemos contactarte?",
    directCallTitle: "Llamada directa",
    directCallText: "Una llamada telefónica de un hermano encargado de oración.",
    whatsappTitle: "WhatsApp",
    whatsappText: "Un mensaje de WhatsApp, desde cualquier parte del mundo.",
    directOnlyNote: "Las llamadas directas están disponibles solo en Estados Unidos (incluido Puerto Rico), Canadá y México. Para otros países, elige WhatsApp.",
    country: "País",
    countryPlaceholder: "Selecciona tu país",
    countrySearchPlaceholder: "Buscar país…",
    countryNoMatch: "Sin resultados.",
    phone: "Número de teléfono",
    whatsapp: "Número de WhatsApp",
    timeZone: "Tu zona horaria",
    timeZonePlaceholder: "Selecciona tu zona horaria",
    availability: "Franja horaria preferida",
    availabilityPlaceholder: "Selecciona una franja horaria",
    noAvailability: "No hay franjas horarias disponibles para tu selección. Tu solicitud se guardará como pendiente.",
    consentStore: "Acepto que la iglesia almacene y administre esta petición de oración.",
    consentContact: "Acepto ser contactado por un hermano encargado de oración sobre esta petición.",
    submit: "Enviar petición",
    submitting: "Enviando...",
    success: "Tu petición ha sido recibida. Oraremos por ti.",
    error: "Hubo un error al enviar tu petición. Por favor intenta de nuevo.",
  },
  pt: {
    title: "Como podemos orar por você?",
    name: "Nome",
    requiredMark: "obrigatório",
    emailOptional: "E-mail (opcional)",
    message: "Pedido de oração",
    messagePlaceholder: "Escreva seu pedido aqui...",
    characters: "caracteres",
    requestType: "Como devemos orar?",
    prayerOnlyTitle: "Apenas oração",
    prayerOnlyText: "Apenas desejo que orem por este pedido. Sem contato.",
    prayerAndContactTitle: "Oração e contato",
    prayerAndContactText: "Desejo ser contactado por um irmão responsável pela oração.",
    channel: "Como devemos entrar em contato?",
    directCallTitle: "Ligação direta",
    directCallText: "Uma ligação de um irmão responsável pela oração.",
    whatsappTitle: "WhatsApp",
    whatsappText: "Uma mensagem de WhatsApp, de qualquer lugar do mundo.",
    directOnlyNote: "Ligações diretas estão disponíveis apenas nos Estados Unidos (incluindo Porto Rico), Canadá e México. Para outros países, escolha WhatsApp.",
    country: "País",
    countryPlaceholder: "Selecione seu país",
    countrySearchPlaceholder: "Buscar país…",
    countryNoMatch: "Nenhum resultado.",
    phone: "Número de telefone",
    whatsapp: "Número de WhatsApp",
    timeZone: "Seu fuso horário",
    timeZonePlaceholder: "Selecione seu fuso horário",
    availability: "Faixa de horário preferida",
    availabilityPlaceholder: "Selecione uma faixa de horário",
    noAvailability: "Não há faixas de horário disponíveis para sua seleção. Seu pedido será salvo como pendente.",
    consentStore: "Aceito que a igreja armazene e administre este pedido de oração.",
    consentContact: "Aceito ser contactado por um irmão responsável pela oração sobre este pedido.",
    submit: "Enviar pedido",
    submitting: "Enviando...",
    success: "Seu pedido foi recebido. Oraremos por você.",
    error: "Houve um erro ao enviar seu pedido. Por favor tente novamente.",
  },
  ko: {
    title: "어떻게 기도해 드릴까요?",
    name: "이름",
    requiredMark: "필수",
    emailOptional: "이메일 (선택)",
    message: "기도 요청",
    messagePlaceholder: "요청을 여기에 입력하세요...",
    characters: "자",
    requestType: "어떻게 기도할까요?",
    prayerOnlyTitle: "기도만",
    prayerOnlyText: "이 요청에 대해서만 기도해 주시길 원합니다. 연락 없음.",
    prayerAndContactTitle: "기도와 연락",
    prayerAndContactText: "기도 담당 형제로부터 연락받기를 원합니다.",
    channel: "어떻게 연락할까요?",
    directCallTitle: "직접 전화",
    directCallText: "기도 담당 형제의 전화.",
    whatsappTitle: "WhatsApp",
    whatsappText: "전 세계 어디서나 WhatsApp 메시지.",
    directOnlyNote: "직접 전화는 미국(푸에르토리코 포함), 캐나다, 멕시코에서만 가능합니다. 다른 국가에서는 WhatsApp을 선택하세요.",
    country: "국가",
    countryPlaceholder: "국가를 선택하세요",
    countrySearchPlaceholder: "국가 검색…",
    countryNoMatch: "결과 없음.",
    phone: "전화번호",
    whatsapp: "WhatsApp 번호",
    timeZone: "시간대",
    timeZonePlaceholder: "시간대를 선택하세요",
    availability: "선호하는 시간대",
    availabilityPlaceholder: "시간대를 선택하세요",
    noAvailability: "선택에 사용 가능한 시간대가 없습니다. 요청이 보류 상태로 저장됩니다.",
    consentStore: "교회가 이 기도 요청을 저장하고 관리하는 데 동의합니다.",
    consentContact: "이 요청에 대해 기도 담당 형제로부터 연락받는 데 동의합니다.",
    submit: "요청 보내기",
    submitting: "보내는 중...",
    success: "요청이 접수되었습니다. 기도하겠습니다.",
    error: "요청을 보내는 중 오류가 발생했습니다. 다시 시도해 주세요.",
  },
  de: {
    title: "Wie können wir für dich beten?",
    name: "Name",
    requiredMark: "erforderlich",
    emailOptional: "E-Mail (optional)",
    message: "Gebetsbitte",
    messagePlaceholder: "Schreibe deine Bitte hier...",
    characters: "Zeichen",
    requestType: "Wie sollen wir beten?",
    prayerOnlyTitle: "Nur Gebet",
    prayerOnlyText: "Ich möchte nur, dass ihr für diese Bitte betet. Kein Kontakt.",
    prayerAndContactTitle: "Gebet und Kontakt",
    prayerAndContactText: "Ich möchte von einem Gebetsbruder kontaktiert werden.",
    channel: "Wie sollen wir dich kontaktieren?",
    directCallTitle: "Direktanruf",
    directCallText: "Ein Anruf von einem Gebetsbruder.",
    whatsappTitle: "WhatsApp",
    whatsappText: "Eine WhatsApp-Nachricht, von überall auf der Welt.",
    directOnlyNote: "Direktanrufe gibt es nur in den Vereinigten Staaten (einschließlich Puerto Rico), Kanada und Mexiko. Für andere Länder wähle bitte WhatsApp.",
    country: "Land",
    countryPlaceholder: "Wähle dein Land",
    countrySearchPlaceholder: "Land suchen…",
    countryNoMatch: "Keine Treffer.",
    phone: "Telefonnummer",
    whatsapp: "WhatsApp-Nummer",
    timeZone: "Deine Zeitzone",
    timeZonePlaceholder: "Wähle deine Zeitzone",
    availability: "Bevorzugter Zeitraum",
    availabilityPlaceholder: "Wähle einen Zeitraum",
    noAvailability: "Keine verfügbaren Zeiträume für deine Auswahl. Deine Bitte wird als offen gespeichert.",
    consentStore: "Ich stimme zu, dass die Kirche diese Gebetsbitte speichert und verwaltet.",
    consentContact: "Ich stimme zu, von einem Gebetsbruder über diese Bitte kontaktiert zu werden.",
    submit: "Bitte senden",
    submitting: "Senden...",
    success: "Deine Bitte ist eingegangen. Wir werden für dich beten.",
    error: "Beim Senden deiner Bitte ist ein Fehler aufgetreten. Bitte versuche es erneut.",
  },
};

const DIRECT_COUNTRIES: Record<Locale, {code: string; name: string}[]> = {
  en: [
    {code: "US", name: "United States"},
    {code: "PR", name: "Puerto Rico"},
    {code: "CA", name: "Canada"},
    {code: "MX", name: "Mexico"},
  ],
  es: [
    {code: "US", name: "Estados Unidos"},
    {code: "PR", name: "Puerto Rico"},
    {code: "CA", name: "Canadá"},
    {code: "MX", name: "México"},
  ],
  pt: [
    {code: "US", name: "Estados Unidos"},
    {code: "PR", name: "Porto Rico"},
    {code: "CA", name: "Canadá"},
    {code: "MX", name: "México"},
  ],
  ko: [
    {code: "US", name: "미국"},
    {code: "PR", name: "푸에르토리코"},
    {code: "CA", name: "캐나다"},
    {code: "MX", name: "멕시코"},
  ],
  de: [
    {code: "US", name: "Vereinigte Staaten"},
    {code: "PR", name: "Puerto Rico"},
    {code: "CA", name: "Kanada"},
    {code: "MX", name: "Mexiko"},
  ],
};

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
  label: string;
  date: string;
  startTime: string;
  endTime: string;
};

export function PrayerForm({locale = "en", suggestedCountry}: {locale?: Locale; suggestedCountry?: string}) {
  const t = copy[locale] || copy.en;
  const directCountries = DIRECT_COUNTRIES[locale] || DIRECT_COUNTRIES.en;
  const [requestType, setRequestType] = useState<"PRAYER_ONLY" | "PRAYER_AND_CONTACT">("PRAYER_ONLY");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consentStore, setConsentStore] = useState(false);
  const [consentContact, setConsentContact] = useState(false);
  const [contactChannel, setContactChannel] = useState<"PHONE" | "WHATSAPP" | "">("");
  const [country, setCountry] = useState(suggestedCountry ?? "");
  const [countryQuery, setCountryQuery] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [availabilitySlotId, setAvailabilitySlotId] = useState("");
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{success: boolean; message: string} | null>(null);
  const countryBoxRef = useRef<HTMLDivElement>(null);

  const remaining = PRAYER_MESSAGE_MAX_LENGTH - message.length;

  const filteredCountries = useMemo(() => {
    const query = countryQuery.trim().toLowerCase();
    if (!query) return directCountries;
    return directCountries.filter(
      (entry) => entry.name.toLowerCase().includes(query) || entry.code.toLowerCase().includes(query),
    );
  }, [countryQuery, directCountries]);

  const selectedCountryName = directCountries.find((entry) => entry.code === country)?.name ?? "";

  async function loadAvailabilitySlots(channel: "PHONE" | "WHATSAPP", zone: string, countryCode: string) {
    if (!zone) {
      setAvailabilitySlots([]);
      return;
    }
    setLoadingSlots(true);
    try {
      const params = new URLSearchParams({timeZone: zone, channel});
      if (countryCode) params.set("country", countryCode);
      const response = await fetch(`/api/prayer/availability?${params.toString()}`);
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

  function refreshSlots(channel: "PHONE" | "WHATSAPP" | "", zone: string, countryCode: string) {
    setAvailabilitySlotId("");
    if (channel === "PHONE" || channel === "WHATSAPP") {
      if (channel === "PHONE" && !countryCode) {
        setAvailabilitySlots([]);
        return;
      }
      void loadAvailabilitySlots(channel, zone, countryCode);
    }
  }

  function resetContact() {
    setContactChannel("");
    setCountry(suggestedCountry ?? "");
    setCountryQuery("");
    setPhone("");
    setWhatsapp("");
    setTimeZone("");
    setAvailabilitySlotId("");
    setAvailabilitySlots([]);
    setConsentContact(false);
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
      consentToStore: consentStore,
    };

    if (requestType === "PRAYER_AND_CONTACT" && (contactChannel === "PHONE" || contactChannel === "WHATSAPP")) {
      payload.consentToContact = consentContact;
      payload.contactChannel = contactChannel;
      payload.timeZone = timeZone;
      if (contactChannel === "PHONE") {
        payload.country = country;
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
        resetContact();
        setRequestType("PRAYER_ONLY");
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

      <div className="prayer-field">
        <label htmlFor="prayer-name">
          {t.name} <span className="prayer-required" aria-hidden="true">*</span>
          <span className="admin-sr-only">({t.requiredMark})</span>
        </label>
        <input
          id="prayer-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
          aria-required="true"
          minLength={2}
          maxLength={100}
        />
      </div>

      <div className="prayer-field">
        <label htmlFor="prayer-email">{t.emailOptional}</label>
        <input
          id="prayer-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      <div className="prayer-field">
        <label htmlFor="prayer-message">
          {t.message} <span className="prayer-required" aria-hidden="true">*</span>
          <span className="admin-sr-only">({t.requiredMark})</span>
        </label>
        <textarea
          id="prayer-message"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, PRAYER_MESSAGE_MAX_LENGTH))}
          placeholder={t.messagePlaceholder}
          required
          aria-required="true"
          aria-describedby="prayer-message-count"
          minLength={10}
          maxLength={PRAYER_MESSAGE_MAX_LENGTH}
          rows={4}
        />
        <p id="prayer-message-count" className="prayer-counter" role="status">
          {remaining} {t.characters}
        </p>
      </div>

      <fieldset className="prayer-field">
        <legend>{t.requestType}</legend>
        <div className="prayer-type-cards">
          <label className="prayer-type-card">
            <input
              type="radio"
              name="requestType"
              value="PRAYER_ONLY"
              checked={requestType === "PRAYER_ONLY"}
              onChange={() => {
                setRequestType("PRAYER_ONLY");
                resetContact();
              }}
            />
            <span className="prayer-card-dot" aria-hidden="true" />
            <span className="prayer-card-text">
              <strong>{t.prayerOnlyTitle}</strong>
              <span>{t.prayerOnlyText}</span>
            </span>
          </label>
          <label className="prayer-type-card">
            <input
              type="radio"
              name="requestType"
              value="PRAYER_AND_CONTACT"
              checked={requestType === "PRAYER_AND_CONTACT"}
              onChange={() => setRequestType("PRAYER_AND_CONTACT")}
            />
            <span className="prayer-card-dot" aria-hidden="true" />
            <span className="prayer-card-text">
              <strong>{t.prayerAndContactTitle}</strong>
              <span>{t.prayerAndContactText}</span>
            </span>
          </label>
        </div>
      </fieldset>

      {requestType === "PRAYER_AND_CONTACT" && (
        <>
          <fieldset className="prayer-field">
            <legend>{t.channel}</legend>
            <div className="prayer-type-cards">
              <label className="prayer-type-card">
                <input
                  type="radio"
                  name="contactChannel"
                  value="PHONE"
                  checked={contactChannel === "PHONE"}
                  onChange={() => {
                    setContactChannel("PHONE");
                    refreshSlots("PHONE", timeZone, country);
                  }}
                />
                <span className="prayer-card-dot" aria-hidden="true" />
                <span className="prayer-card-text">
                  <strong>{t.directCallTitle}</strong>
                  <span>{t.directCallText}</span>
                </span>
              </label>
              <label className="prayer-type-card">
                <input
                  type="radio"
                  name="contactChannel"
                  value="WHATSAPP"
                  checked={contactChannel === "WHATSAPP"}
                  onChange={() => {
                    setContactChannel("WHATSAPP");
                    refreshSlots("WHATSAPP", timeZone, "");
                  }}
                />
                <span className="prayer-card-dot" aria-hidden="true" />
                <span className="prayer-card-text">
                  <strong>{t.whatsappTitle}</strong>
                  <span>{t.whatsappText}</span>
                </span>
              </label>
            </div>
          </fieldset>

          {contactChannel === "PHONE" && (
            <>
              <p className="admin-field-note">{t.directOnlyNote}</p>
              <div className="prayer-field" ref={countryBoxRef}>
                <label htmlFor="prayer-country-search">{t.country}</label>
                <div className="prayer-combobox">
                  <input
                    id="prayer-country-search"
                    type="text"
                    role="combobox"
                    aria-expanded={countryOpen}
                    aria-controls="prayer-country-list"
                    aria-autocomplete="list"
                    placeholder={t.countrySearchPlaceholder}
                    value={countryOpen ? countryQuery : selectedCountryName}
                    onFocus={() => {
                      setCountryQuery("");
                      setCountryOpen(true);
                    }}
                    onChange={(e) => {
                      setCountryQuery(e.target.value);
                      setCountryOpen(true);
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setCountryOpen(false), 120);
                    }}
                    autoComplete="off"
                  />
                  {countryOpen && (
                    <ul id="prayer-country-list" role="listbox" className="prayer-combobox-list">
                      {filteredCountries.map((entry) => (
                        <li key={entry.code} role="option" aria-selected={entry.code === country}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setCountry(entry.code);
                              setCountryQuery("");
                              setCountryOpen(false);
                              refreshSlots("PHONE", timeZone, entry.code);
                            }}
                          >
                            {entry.name}
                          </button>
                        </li>
                      ))}
                      {filteredCountries.length === 0 ? (
                        <li className="prayer-combobox-empty">{t.countryNoMatch}</li>
                      ) : null}
                    </ul>
                  )}
                </div>
                <input type="hidden" name="country" value={country} />
                {!country ? <p className="prayer-field-hint">{t.countryPlaceholder}</p> : null}
              </div>
              <div className="prayer-field">
                <label htmlFor="prayer-phone">{t.phone}</label>
                <input
                  id="prayer-phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  required
                  placeholder="+1234567890"
                />
              </div>
            </>
          )}

          {contactChannel === "WHATSAPP" && (
            <div className="prayer-field">
              <label htmlFor="prayer-whatsapp">{t.whatsapp}</label>
              <input
                id="prayer-whatsapp"
                name="whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                autoComplete="tel"
                required
                placeholder="+1234567890"
              />
            </div>
          )}

          {contactChannel !== "" && (
            <div className="prayer-field">
              <label htmlFor="prayer-timezone">{t.timeZone}</label>
              <select
                id="prayer-timezone"
                name="timeZone"
                value={timeZone}
                onChange={(e) => {
                  setTimeZone(e.target.value);
                  refreshSlots(contactChannel as "PHONE" | "WHATSAPP", e.target.value, contactChannel === "PHONE" ? country : "");
                }}
                required
              >
                <option value="">{t.timeZonePlaceholder}</option>
                {TIME_ZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          )}

          {contactChannel !== "" && timeZone && (
            <div className="prayer-field">
              <label htmlFor="prayer-slot">{t.availability}</label>
              {loadingSlots ? (
                <p role="status">{t.submitting}</p>
              ) : availabilitySlots.length > 0 ? (
                <select
                  id="prayer-slot"
                  name="availabilitySlotId"
                  value={availabilitySlotId}
                  onChange={(e) => setAvailabilitySlotId(e.target.value)}
                >
                  <option value="">{t.availabilityPlaceholder}</option>
                  {availabilitySlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="prayer-no-availability">{t.noAvailability}</p>
              )}
            </div>
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
