"use client";

import {useEffect, useState} from "react";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 480);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, {passive: true});
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  if (!visible) return null;
  return <button className="scroll-to-top" type="button" onClick={() => window.scrollTo({top: 0, behavior: "smooth"})} aria-label="Back to top">↑</button>;
}
