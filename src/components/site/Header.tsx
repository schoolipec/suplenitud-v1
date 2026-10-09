import Image from "next/image";
import Link from "next/link";
import {ThemeToggle} from "./ThemeToggle";

export function Header() {
  return <header className="site-header" id="top">
    <Link className="brand" href="/#home" aria-label="Iglesia Plenitud en Cristo, home">
      <Image className="logo-light" src="/assets/logo-transparent.png" alt="Iglesia Plenitud en Cristo" width={640} height={640} priority />
      <Image className="logo-dark" src="/assets/logo-dark.png" alt="" width={640} height={640} priority />
    </Link>
    <nav className="primary-nav" id="primary-nav" aria-label="Primary navigation">
      <Link href="/#home">Home</Link><Link href="/#about">About</Link><Link href="/pastors/">Pastors</Link><Link href="/#contact">Contact us</Link><Link className="live-link" href="/#live"><i /><span>Live</span></Link>
    </nav>
    <div className="header-controls">
      <div className="locale-picker"><button id="language" type="button" aria-label="Language selection" disabled><Image className="flag" src="https://flagcdn.com/us.svg" alt="" width={24} height={18} /><span>EN</span></button></div>
      <ThemeToggle />
    </div>
  </header>;
}
