"use client";

import { useState, useEffect } from "react";

// Banner expires 24 hours after deploy — 14 April 2026 ~20:00 UTC
const EXPIRES = new Date("2026-04-15T20:00:00Z").getTime();

export default function MaintenanceBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (Date.now() > EXPIRES) setExpired(true);
  }, []);

  if (dismissed || expired) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm" style={{ background: "#FFCC00", color: "#000000" }}>
      <div className="max-w-3xl mx-auto flex items-center justify-center gap-3">
        <p className="flex-1">
          Due to a server issue, some users may not have received emails for the previous few days. We apologise for any inconvenience. The fix has been pushed and the service should be fully functional again.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-black/60 hover:text-black cursor-pointer font-bold text-lg leading-none"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
