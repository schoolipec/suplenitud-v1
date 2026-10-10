"use client";
import Image from "next/image";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useState} from "react";
import {ThemeToggle} from "./ThemeToggle";

const locales = [{code:"en",short:"EN",name:"English",flag:"us"},{code:"es",short:"ES",name:"Español",flag:"mx"},{code:"pt",short:"PT",name:"Português",flag:"br"},{code:"ko",short:"KO",name:"한국어",flag:"kr"},{code:"de",short:"DE",name:"Deutsch",flag:"de"}] as const;
const localeCodes = new Set(locales.map(({code}) => code));
const navigation = {en:["Home","About","Pastors","Contact us","Live"],es:["Inicio","Conócenos","Pastores","Contáctanos","En vivo"],pt:["Início","Sobre nós","Pastores","Contato","Ao vivo"],ko:["홈","교회 소개","목회자","문의","라이브"],de:["Startseite","Über uns","Pastoren","Kontakt","Live"]} as const;

export function Header() {
  const pathname=usePathname(), router=useRouter(), [open,setOpen]=useState(false), [menuOpen,setMenuOpen]=useState(false);
  const parts=pathname.split("/").filter(Boolean); const locale=localeCodes.has(parts[0] as typeof locales[number]["code"]) ? parts.shift()! : "en";
  const path=`/${parts.join("/")}`||"/", current=locales.find(({code})=>code===locale)??locales[0], labels=navigation[locale as keyof typeof navigation]??navigation.en;
  const href=(suffix="")=>locale==="en"?`/${suffix}`:`/${locale}/${suffix}`;
  const select=(next:string)=>{router.push(next==="en"?path:`/${next}${path==="/"?"/":path}`);setOpen(false)};
  const closeMenu=()=>setMenuOpen(false);
  return <header className="site-header" id="top"><Link className="brand" href={href("#home")} aria-label="Iglesia Plenitud en Cristo, home" onClick={closeMenu}><Image className="logo-light" src="/assets/logo-transparent.png" alt="Iglesia Plenitud en Cristo" width={640} height={640} priority/><Image className="logo-dark" src="/assets/logo-dark.png" alt="" width={640} height={640} priority/></Link><button className="menu-toggle" type="button" aria-controls="primary-nav" aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}><span className="sr-only">Menu</span><span/><span/><span/></button><nav className={`primary-nav${menuOpen?" open":""}`} id="primary-nav" aria-label="Primary navigation"><Link href={href("#home")} onClick={closeMenu}>{labels[0]}</Link><Link href={href("#about")} onClick={closeMenu}>{labels[1]}</Link><Link href={href("pastors/")} onClick={closeMenu}>{labels[2]}</Link><Link href={href("#contact")} onClick={closeMenu}>{labels[3]}</Link><Link className="live-link" href={href("#live")} onClick={closeMenu}><i/><span>{labels[4]}</span></Link></nav><div className="header-controls"><div className={`locale-picker${open?" open":""}`}><button id="language" type="button" aria-expanded={open} onClick={()=>setOpen(!open)}><Image className="flag" src={`https://flagcdn.com/${current.flag}.svg`} alt="" width={24} height={18}/><span>{current.short}</span></button><div className="locale-menu">{locales.map(item=><button key={item.code} type="button" className={item.code===locale?"selected":""} onClick={()=>select(item.code)}><Image className="flag" src={`https://flagcdn.com/${item.flag}.svg`} alt="" width={24} height={18}/><span>{item.name}</span><b>✓</b></button>)}</div></div><ThemeToggle/></div></header>;
}
