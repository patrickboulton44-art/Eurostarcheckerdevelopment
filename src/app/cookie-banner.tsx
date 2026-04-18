"use client";

import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setVisible(true);
    } else if (consent === "accepted") {
      loadGA();
    }
    // If "declined", do nothing — no GA
  }, []);

  function loadGA() {
    if (typeof window === "undefined") return;
    if (document.getElementById("ga-script")) return;

    const script1 = document.createElement("script");
    script1.id = "ga-script";
    script1.async = true;
    script1.src = "https://www.googletagmanager.com/gtag/js?id=G-9XCZLJTY3D";
    document.head.appendChild(script1);

    const script2 = document.createElement("script");
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-9XCZLJTY3D');
    `;
    document.head.appendChild(script2);
  }

  function accept() {
    localStorage.setItem("cookie-consent", "accepted");
    loadGA();
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("cookie-consent", "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center">
      <div
        className="w-full max-w-lg rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 border border-white/20"
        style={{
          background: "rgba(0, 30, 100, 0.6)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
      >
        <p className="text-white/80 text-xs flex-1">
          We use cookies for analytics to improve your experience.{" "}
          <a href="/cookies" className="text-white underline">Learn more</a>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer border border-white/20 text-white/60 hover:border-white/40 transition-all"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer hover:opacity-90 transition-all"
            style={{ background: "#FFCC00", color: "#000000" }}
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
