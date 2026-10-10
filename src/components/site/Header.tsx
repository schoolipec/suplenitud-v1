"use client";
import Image from "next/image";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useState} from "react";
import {ThemeToggle} from "./ThemeToggle";

const locales = [{code:"en",short:"EN",name:"English",flag:"us"},{code:"es",short:"ES",name:"Español",flag:"mx"},{code:"pt",short:"PT",name:"Português",flag:"br"},{code:"ko",short:"KO",name:"한국어",flag:"kr"},{code:"de",short:"DE",name:"Deutsch",flag:"de"}] as const;
const localeCodes = new Set(locales.map(({code}) => code));

export function Header() {
  const pathname=usePathname(), router=useRouter(), [open,setOpen]=useState(false);
  const parts=pathname.split("/").filter(Boolean); const locale=localeCodes.has(parts[0] as typeof locales[number]["code"]) ? parts.shift()! : "en";
  const path=`/${parts.join("/")}`||"/", current=locales.find(({code})=>code===locale)??locales[0];
  const href=(suffix="")=>locale==="en"?`/${suffix}`:`/${locale}/${suffix}`;
  const select=(next:string)=>{router.push(next==="en"?path:`/${next}${path==="/"?"/":path}`);setOpen(false)};
  return <header className="site-header" id="top"><Link className="brand" href={href("#home")} aria-label="Iglesia Plenitud en Cristo, home"><Image className="logo-light" src="/assets/logo-transparent.png" alt="Iglesia Plenitud en Cristo" width={640} height={640} priority/><Image className="logo-dark" src="/assets/logo-dark.png" alt="" width={640} height={640} priority/></Link><nav className="primary-nav" id="primary-nav" aria-label="Primary navigation"><Link href={href("#home")}>Home</Link><Link href={href("#about")}>About</Link><Link href={href("pastors/")}>Pastors</Link><Link href={href("#contact")}>Contact us</Link><Link className="live-link" href={href("#live")}><i/><span>Live</span></Link></nav><div className="header-controls"><div className={`locale-picker${open?" open":""}`}><button id="language" type="button" aria-expanded={open} onClick={()=>setOpen(!open)}><img className="flag" src={`https://flagcdn.com/${current.flag}.svg`} alt=""/><span>{current.short}</span></button><div className="locale-menu">{locales.map(item=><button key={item.code} type="button" className={item.code===locale?"selected":""} onClick={()=>select(item.code)}><img className="flag" src={`https://flagcdn.com/${item.flag}.svg`} alt=""/><span>{item.name}</span><b>✓</b></button>)}</div></div><ThemeToggle/></div></header>;
}
