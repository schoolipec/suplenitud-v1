import Image from "next/image";
import Link from "next/link";
import type {Metadata} from "next";
import {homeCopy, homeExtraCopy, type SupportedLocale} from "@/content/locale-copy";
import {BlessingMessageModal} from "@/components/blessing/BlessingMessageModal";
import {PrayerForm} from "@/components/prayer/PrayerForm";
import {PublishedCopy} from "@/components/site/PublishedCopy";
import {loadPublicContent} from "@/lib/public-content";
import {publicPrayerRequestsEnabled} from "@/lib/public-features";

export const instant = false;
const baseUrl = "https://demo.suplenitud.com";
export const metadata: Metadata = {title: "Iglesia Plenitud en Cristo | Las Vegas", description: "Iglesia Plenitud en Cristo: a place to grow, belong, and serve in Las Vegas.", alternates: {canonical: `${baseUrl}/`, languages: {en: `${baseUrl}/`, es: `${baseUrl}/es/`, pt: `${baseUrl}/pt/`, ko: `${baseUrl}/ko/`, de: `${baseUrl}/de/`}}, openGraph: {url: `${baseUrl}/`, locale: "en"}};

export default async function Home({locale = "en"}: {locale?: SupportedLocale}) {
  const t = homeCopy[locale], extra = homeExtraCopy[locale];
  const content = await loadPublicContent(locale);
  return <main id="main" lang={locale}>
    <section className="hero" id="home"><div className="hero-copy reveal"><PublishedCopy html={content.homeHero} fallback={<><p className="eyebrow">{t.eyebrow}</p><h1>{t.heroTitle}</h1><p className="intro">{t.heroText}</p></>} /><div className="actions">{publicPrayerRequestsEnabled ? <a className="button primary" href="#contact">{t.prayerAction}</a> : null}<a className="text-link" href="#groups">{t.groupsAction}</a></div></div><div className="hero-art"><Image src="/assets/hero-community.png" alt="Familias de la comunidad acercándose a una iglesia" width={1672} height={941} priority /></div></section>
    <section className="live-panel" id="live"><div><p className="live-status"><i />{t.liveStatus}</p><PublishedCopy html={content.homeLive} fallback={<><h2>{t.liveTitle}</h2><p>{t.liveText}</p></>} /></div><a className="button light" href="#live">{t.watchLive}</a></section>
    <section className="section services" id="groups"><div className="section-heading"><PublishedCopy html={content.homeCommunity} fallback={<><p className="eyebrow">{t.communityLabel}</p><h2>{t.communityTitle}</h2></>} /></div><div className="service-grid"><article><span className="service-icon">♙</span><h3>{extra.smallTitle}</h3><p>{extra.smallText}</p><a href="#contact">{extra.join}</a></article><article><span className="service-icon">✦</span><h3>{extra.trainingTitle}</h3><p>{extra.trainingText}</p><a href="#contact">{extra.learn}</a></article><article><span className="service-icon">♡</span><h3>{extra.plenitudeTitle}</h3><p>{extra.plenitudeText}</p><a href="#contact">{extra.discover}</a></article></div></section>
    <section className="section about" id="about"><div className="about-image"><Image src="/assets/small-group.png" alt="Grupo pequeño estudiando la Biblia y conversando" width={1536} height={1024} /></div><div><PublishedCopy html={content.homeAbout} fallback={<><p className="eyebrow">{t.aboutLabel}</p><h2>{t.aboutTitle}</h2><p>{t.aboutText}</p></>} /><Link className="text-link" href={locale === "en" ? "/pastors/" : `/${locale}/pastors/`}>{t.meetPastors}</Link></div></section>
    <section className="section contact" id="contact"><div><PublishedCopy html={content.homeContact} fallback={<><p className="eyebrow">{t.contactLabel}</p><h2>{t.contactTitle}</h2></>} /><p className="address">5000 Spencer St<br />Las Vegas, NV 89119</p><a className="button secondary" href="https://www.google.com/maps/dir/?api=1&destination=5000+Spencer+St,+Las+Vegas,+NV+89119" target="_blank" rel="noreferrer">{t.directions}</a></div>{publicPrayerRequestsEnabled ? <PrayerForm locale={locale} /> : null}</section>
    <section className="section offering" id="giving"><div><p className="eyebrow">{extra.offeringLabel}</p><h2>{extra.offeringTitle}</h2><p>{extra.offeringText}</p><p className="offering-notice">{extra.offeringNotice}</p></div><a className="button secondary offering-cta" href="https://square.link/u/MRxMQSu3?src=embed" target="_blank" rel="noopener noreferrer">{extra.offeringAction}</a></section>
    <section className="culture section"><PublishedCopy html={content.homeVision} fallback={<><p className="eyebrow">{t.visionLabel}</p><h2>{t.visionTitle}</h2><p className="vision-copy">{extra.visionText}</p></>} /><div className="culture-grid"><article><strong className="culture-icon">⌂</strong><h3>{extra.reach}</h3><p>{extra.reachText}</p></article><article><strong className="culture-icon">♙</strong><h3>{extra.strengthen}</h3><p>{extra.strengthenText}</p></article><article><strong className="culture-icon">✦</strong><h3>{extra.form}</h3><p>{extra.formText}</p></article><article><strong className="culture-icon">◎</strong><h3>{t.send}</h3><p>{extra.sendText}</p></article></div><div className="pillars"><span>{extra.presence}</span><span>{extra.character}</span><span>{extra.service}</span></div><blockquote>{extra.cultureQuote}</blockquote><p className="schedule">{extra.schedule}</p></section>
    <section className="social-panel"><div><p className="eyebrow">{extra.socialLabel}</p><h2>{extra.socialTitle}</h2><p>{extra.socialText}</p></div><a className="button secondary" href="https://www.instagram.com/prmarioalsina">{extra.socialAction}</a></section><BlessingMessageModal locale={locale}/>
  </main>;
}
