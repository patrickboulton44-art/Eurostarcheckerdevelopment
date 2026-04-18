"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";

const STATIONS = [
  { id: "lon", name: "London St Pancras", code: "7015400", region: "gb" },
  { id: "par", name: "Paris Gare du Nord", code: "8727100", region: "fr" },
  { id: "bru", name: "Brussels Midi", code: "8814001", region: "be" },
  { id: "ams", name: "Amsterdam Centraal", code: "8400058", region: "nl" },
  { id: "rot", name: "Rotterdam Centraal", code: "8400530", region: "nl" },
  { id: "lil", name: "Lille Europe", code: "8728210", region: "fr" },
];

// Valid Snap connections: origin → [destinations]
const CONNECTIONS: Record<string, string[]> = {
  lon: ["par", "bru", "ams", "rot", "lil"],
  par: ["lon", "bru", "ams"],
  bru: ["lon", "par"],
  ams: ["lon", "par"],
  rot: ["lon"],
  lil: ["lon"],
};

function routeId(origin: string, dest: string) {
  return `${origin}-${dest}`;
}

const FAREWELL: Record<string, { phrase: string; sub: string }> = {
  fr: { phrase: "Bon Voyage!", sub: "When tickets become available on your dates, you will be notified via email." },
  gb: { phrase: "Enjoy your journey!", sub: "When tickets become available on your dates, you will be notified via email." },
  nl: { phrase: "Goede reis!", sub: "When tickets become available on your dates, you will be notified via email." },
  be: { phrase: "Bon Voyage!", sub: "When tickets become available on your dates, you will be notified via email." },
};

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export default function Home() {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tier = (session?.user as any)?.tier as string || "free";

  const [showLanding, setShowLanding] = useState(true);
  const [landingExiting, setLandingExiting] = useState(false);
  const [introPhase, setIntroPhase] = useState<"split" | "together" | "fading" | "hello">("split");
  const [logoSnap, setLogoSnap] = useState<"idle" | "split" | "together">("idle");

  function triggerLogoSnap() {
    if (logoSnap !== "idle") return;
    setLogoSnap("split");
    setTimeout(() => setLogoSnap("together"), 400);
    setTimeout(() => setLogoSnap("idle"), 1400);
  }
  const [helloIndex, setHelloIndex] = useState(0);
  const [step, setStep] = useState(0);

  const HELLOS = [
    "Hello",
    "Bonjour",
    "Hallo",
    "Привіт",
    "Hola",
    "Ciao",
    "Olá",
    "Hej",
    "Szia",
    "Ahoj",
    "Salut",
    "Hei",
    "Merhaba",
  ];

  // Intro animation sequence
  useEffect(() => {
    if (!showLanding) return;
    // Phase 1: "Euro" and "snap" slide in from sides → snap together
    const t1 = setTimeout(() => setIntroPhase("together"), 800);
    // Phase 2: hold together briefly
    const t2 = setTimeout(() => setIntroPhase("fading"), 2200);
    // Phase 3: fade out and show hello carousel
    const t3 = setTimeout(() => setIntroPhase("hello"), 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [showLanding]);

  // Hello carousel cycling
  useEffect(() => {
    if (!showLanding || introPhase !== "hello") return;
    const interval = setInterval(() => {
      setHelloIndex((prev) => (prev + 1) % HELLOS.length);
    }, 2000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLanding, introPhase]);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [animating, setAnimating] = useState(false);

  const [origin, setOrigin] = useState("");
  const [destinations, setDestinations] = useState<string[]>([]);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [timeSlotPref, setTimeSlotPref] = useState<"any" | "morning" | "afternoon">("any");
  const [passengers, setPassengers] = useState(1);

  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isSignedIn = !!session;
  const isPro = tier === "pro";

  // Steps: 0=origin, 1=destination, 2=days, 3=passengers, 4=account (if !signed in), 5=confirm, 6=success
  const accountStep = isSignedIn ? -1 : 4;
  const confirmStep = isSignedIn ? 4 : 5;
  const totalSteps = isSignedIn ? 5 : 6;

  const availableDestinations = origin ? CONNECTIONS[origin] || [] : [];

  function toggleDestination(dest: string) {
    if (destinations.includes(dest)) {
      setDestinations((prev) => prev.filter((d) => d !== dest));
    } else {
      if (isPro) {
        setDestinations((prev) => [...prev, dest]);
      } else {
        // Free: single destination only
        setDestinations([dest]);
      }
    }
  }

  function goNext() {
    if (step >= totalSteps - 1) return;
    setDirection("left");
    setAnimating(true);
    setTimeout(() => { setStep((s) => s + 1); setAnimating(false); }, 300);
  }

  function goBack() {
    if (step <= 0) return;
    setDirection("right");
    setAnimating(true);
    setTimeout(() => { setStep((s) => s - 1); setAnimating(false); }, 300);
  }

  function toggleDay(day: number) {
    setWeekdays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  }

  async function handleAuthSubmit() {
    setAuthLoading(true);
    setAuthError(null);

    if (authMode === "signup") {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword, name: authName }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error); setAuthLoading(false); return; }
      const signInRes = await signIn("credentials", { email: authEmail, password: authPassword, redirect: false });
      if (signInRes?.error) { setAuthError("Account created. Please sign in."); setAuthLoading(false); return; }
    } else {
      const res = await signIn("credentials", { email: authEmail, password: authPassword, redirect: false });
      if (res?.error) { setAuthError("Invalid email or password"); setAuthLoading(false); return; }
    }

    setAuthLoading(false);
    // Jump to the confirm step (which is accountStep + 1 in the not-signed-in flow)
    setDirection("left");
    setAnimating(true);
    setTimeout(() => {
      setStep(accountStep + 1);
      setAnimating(false);
    }, 300);
  }

  async function handleSubmit() {
    setSubmitLoading(true);
    const email = session?.user?.email || authEmail;

    // Rolling date range: today → 3 months out
    const today = new Date().toISOString().split("T")[0];
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    const dateTo = threeMonths.toISOString().split("T")[0];

    // Subscribe to each route
    for (const dest of destinations) {
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          routeId: routeId(origin, dest),
          dateFrom: today,
          dateTo,
          passengers,
          weekdays,
          timeSlotPref,
        }),
      });
    }

    setSubmitLoading(false);
    setSubmitted(true);
    goNext();
  }

  useEffect(() => {
    if (isSignedIn && step === accountStep) goNext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Reset destinations when origin changes
  useEffect(() => { setDestinations([]); }, [origin]);

  const canProceed = () => {
    switch (step) {
      case 0: return !!origin;
      case 1: return destinations.length > 0;
      case 2: return weekdays.length > 0;
      case 3: return passengers >= 1;
      default: return true;
    }
  };

  const originStation = STATIONS.find((s) => s.id === origin);
  const destStations = destinations.map((d) => STATIONS.find((s) => s.id === d)!).filter(Boolean);
  const primaryDest = destStations[0];
  const farewell = primaryDest ? FAREWELL[primaryDest.region] : FAREWELL.gb;

  const slideClass = animating
    ? direction === "left" ? "translate-x-[-100%] opacity-0" : "translate-x-[100%] opacity-0"
    : "translate-x-0 opacity-100";

  const currentStep = () => {
    // Step 0: Origin
    if (step === 0) {
      return (
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white uppercase tracking-tight mb-2">
            Where are you starting?
          </h2>
          <p className="text-white/50 text-sm mb-8">Select your departure station.</p>
          <div className="grid gap-2">
            {STATIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setOrigin(s.id)}
                className={`w-full text-left px-5 py-4 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                  origin === s.id
                    ? "bg-white text-black border-white"
                    : "bg-transparent text-white/70 border-white/15 hover:border-white/30"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Step 1: Destinations
    if (step === 1) {
      return (
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white uppercase tracking-tight mb-2">
            Where are you going?
          </h2>
          <p className="text-white/50 text-sm mb-2">
            {isPro
              ? "Select one or more destinations to monitor."
              : "Select your destination."}
          </p>
          {!isPro && (
            <p className="text-white/30 text-xs mb-6">
              * Pro users can monitor multiple destinations at once.
            </p>
          )}
          <div className="grid gap-2">
            {availableDestinations.map((destId) => {
              const s = STATIONS.find((st) => st.id === destId)!;
              const selected = destinations.includes(destId);
              return (
                <button
                  key={destId}
                  type="button"
                  onClick={() => toggleDestination(destId)}
                  className={`w-full text-left px-5 py-4 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                    selected
                      ? "bg-white text-black border-white"
                      : "bg-transparent text-white/70 border-white/15 hover:border-white/30"
                  }`}
                >
                  {s.name}
                  {selected && isPro && destinations.length > 1 && (
                    <span className="float-right text-black/40">&#10003;</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // Step 2: Days + Time slot
    if (step === 2) {
      return (
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white uppercase tracking-tight mb-2">
            Which days?
          </h2>
          <p className="text-white/50 text-sm mb-8">Select preferred days of the week.</p>
          <div className="flex gap-2 mb-6">
            {DAYS.map((day) => (
              <button key={day.value} type="button" onClick={() => toggleDay(day.value)}
                className={`flex-1 py-3 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all cursor-pointer border ${
                  weekdays.includes(day.value) ? "bg-white text-black border-white" : "bg-transparent text-white/40 border-white/20 hover:border-white/40"
                }`}>{day.label}</button>
            ))}
          </div>
          <p className="text-xs uppercase tracking-widest text-white/50 mb-2">Time slot</p>
          <div className="flex gap-2 mb-4">
            {([ { value: "any", label: "Any" }, { value: "morning", label: "Morning" }, { value: "afternoon", label: "Afternoon" } ] as const).map((opt) => (
              <button key={opt.value} type="button" onClick={() => setTimeSlotPref(opt.value)}
                className={`flex-1 py-3 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all cursor-pointer border ${
                  timeSlotPref === opt.value ? "bg-white text-black border-white" : "bg-transparent text-white/40 border-white/20 hover:border-white/40"
                }`}>{opt.label}</button>
            ))}
          </div>
          <p className="text-white/30 text-xs">Morning: 6am–1pm / Afternoon: 1pm–8pm</p>
          <p className="text-white/30 text-xs mt-3">* Weekday and time slot filtering is available to Pro users only. Free users will be notified for all days and times.</p>
        </div>
      );
    }

    // Step 3: Passengers
    if (step === 3) {
      return (
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white uppercase tracking-tight mb-2">
            How many travellers?
          </h2>
          <p className="text-white/50 text-sm mb-8">Eurostar Snap allows up to 4 passengers.</p>
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} type="button" onClick={() => setPassengers(n)}
                className={`flex-1 py-4 rounded-xl text-lg font-bold transition-all cursor-pointer border ${
                  passengers === n ? "bg-white text-black border-white" : "bg-transparent text-white/50 border-white/20 hover:border-white/40"
                }`}>{n}</button>
            ))}
          </div>
        </div>
      );
    }

    // Account step
    if (step === accountStep) {
      return (
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white uppercase tracking-tight mb-2">Create your account</h2>
          <p className="text-white/50 text-sm mb-8">Sign up to start receiving alerts.</p>
          <button onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-3 cursor-pointer hover:opacity-90 transition-all mb-4 border border-white/20"
            style={{ background: "#ffffff", color: "#000000" }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-white/30 text-xs uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>
          <div className="flex gap-2 mb-4">
            <button type="button" onClick={() => { setAuthMode("signup"); setAuthError(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide cursor-pointer border transition-all ${authMode === "signup" ? "bg-white text-black border-white" : "bg-transparent text-white/40 border-white/20"}`}>Sign Up</button>
            <button type="button" onClick={() => { setAuthMode("signin"); setAuthError(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide cursor-pointer border transition-all ${authMode === "signin" ? "bg-white text-black border-white" : "bg-transparent text-white/40 border-white/20"}`}>Sign In</button>
          </div>
          {authMode === "signup" && (
            <input type="text" placeholder="Name (optional)" value={authName} onChange={(e) => setAuthName(e.target.value)}
              className="w-full rounded-lg px-4 py-3 text-white border border-white/20 focus:border-white/60 focus:outline-none transition-colors placeholder-white/30 mb-3 text-sm" style={{ background: "#002878" }} />
          )}
          <input type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required
            className="w-full rounded-lg px-4 py-3 text-white border border-white/20 focus:border-white/60 focus:outline-none transition-colors placeholder-white/30 mb-3 text-sm" style={{ background: "#002878" }} />
          <input type="password" placeholder={authMode === "signup" ? "Password (min 6 characters)" : "Password"} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required
            className="w-full rounded-lg px-4 py-3 text-white border border-white/20 focus:border-white/60 focus:outline-none transition-colors placeholder-white/30 mb-4 text-sm" style={{ background: "#002878" }} />
          {authError && <div className="mb-4 p-3 rounded-lg bg-red-900/50 text-red-300 border border-red-800 text-sm text-center">{authError}</div>}
          <button onClick={handleAuthSubmit} disabled={authLoading || !authEmail || !authPassword}
            className="w-full py-3 rounded-lg font-bold uppercase tracking-wider text-sm cursor-pointer disabled:opacity-50 hover:opacity-90 transition-all"
            style={{ background: "#ffffff", color: "#000000" }}>
            {authLoading ? "Loading..." : authMode === "signup" ? "Create Account" : "Sign In"}
          </button>
        </div>
      );
    }

    // Confirm step — check both possible positions (signed in or just signed in)
    if ((step === confirmStep || step === confirmStep + 1) && !submitted) {
      const routeLabels = destinations.map((d) => {
        const dest = STATIONS.find((s) => s.id === d);
        return `${originStation?.name} → ${dest?.name}`;
      });

      // Detect if user selected any Pro features
      const hasCustomDays = weekdays.length > 0 && weekdays.length < 7;
      const hasCustomSlot = timeSlotPref !== "any";
      const hasMultiDest = destinations.length > 1;
      const usedProFeatures: string[] = [];
      if (hasCustomDays) usedProFeatures.push(`Weekday filter: ${DAYS.filter(d => weekdays.includes(d.value)).map(d => d.label).join(", ")}`);
      if (hasCustomSlot) usedProFeatures.push(`Time slot: ${timeSlotPref === "morning" ? "Morning (6am–1pm)" : "Afternoon (1pm–8pm)"}`);
      if (hasMultiDest) usedProFeatures.push(`Multiple destinations (${destinations.length})`);
      const needsPro = !isPro && usedProFeatures.length > 0;

      function continueWithFree() {
        setWeekdays([0, 1, 2, 3, 4, 5, 6]);
        setTimeSlotPref("any");
        if (destinations.length > 1) setDestinations([destinations[0]]);
      }

      return (
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white uppercase tracking-tight mb-2">Ready to go</h2>
          <p className="text-white/50 text-sm mb-8">Review your alert and start monitoring.</p>
          <div className="rounded-xl p-5 space-y-3 mb-6" style={{ background: "#002266" }}>
            <div className="flex justify-between">
              <span className="text-white/50 text-sm">Route{destinations.length > 1 ? "s" : ""}</span>
              <span className="text-white text-sm font-semibold text-right">{routeLabels.join(", ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50 text-sm">Monitoring</span>
              <span className="text-white text-sm">Rolling 3 months</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50 text-sm">Passengers</span>
              <span className="text-white text-sm">{passengers}</span>
            </div>
            {(isPro || hasCustomDays) && (
              <div className="flex justify-between">
                <span className="text-white/50 text-sm">Days</span>
                <span className="text-white text-sm">{weekdays.length === 7 || weekdays.length === 0 ? "All" : DAYS.filter(d => weekdays.includes(d.value)).map(d => d.label).join(", ")}</span>
              </div>
            )}
            {(isPro || hasCustomSlot) && (
              <div className="flex justify-between">
                <span className="text-white/50 text-sm">Time slot</span>
                <span className="text-white text-sm capitalize">{timeSlotPref}</span>
              </div>
            )}
          </div>

          {needsPro && (
            <div className="rounded-xl p-5 mb-6" style={{ background: "linear-gradient(135deg, #6C3AED 0%, #DB2777 50%, #F472B6 100%)" }}>
              <h3 className="text-white font-bold text-sm uppercase mb-3">Pro features selected</h3>
              <ul className="space-y-1 text-sm text-white/90 mb-2">
                {usedProFeatures.map((f, i) => (
                  <li key={i}>&#10003; {f}</li>
                ))}
              </ul>
              <p className="text-white/60 text-xs uppercase tracking-wider mt-3 mb-2">Other Pro features</p>
              <ul className="space-y-1 text-sm text-white/70 mb-4">
                {!hasCustomDays && <li>&#10003; Weekday filtering</li>}
                {!hasCustomSlot && <li>&#10003; Morning / afternoon preference</li>}
                {!hasMultiDest && <li>&#10003; Monitor multiple destinations</li>}
                <li>&#10003; Checks every 5 minutes (18x faster)</li>
                <li>&#10003; Cancel anytime</li>
              </ul>
              <a href="/pricing"
                className="block w-full py-3 rounded-lg font-bold uppercase tracking-wider text-sm text-center hover:opacity-90 transition-all mb-3"
                style={{ background: "#ffffff", color: "#000000" }}>
                Upgrade to Pro — £3.99/mo
              </a>
              <button
                onClick={continueWithFree}
                className="w-full text-center text-white/50 text-sm hover:text-white/70 transition-colors cursor-pointer">
                Continue with free plan
              </button>
            </div>
          )}

          {!needsPro && (
            <button onClick={handleSubmit} disabled={submitLoading}
              className="w-full py-3.5 rounded-lg font-bold text-base uppercase tracking-wider cursor-pointer disabled:opacity-50 hover:opacity-90 transition-all"
              style={{ background: "#ffffff", color: "#000000" }}>
              {submitLoading ? "Setting up..." : "Start Monitoring"}
            </button>
          )}
        </div>
      );
    }

    // Success
    if (submitted) {
      return (
        <div className="text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white uppercase tracking-tight mb-4">{farewell.phrase}</h2>
          <p className="text-white/60 text-base mb-8 max-w-sm mx-auto">{farewell.sub}</p>
          {!isPro && (
            <div className="rounded-2xl p-6 mb-6 text-left"
              style={{ background: "linear-gradient(135deg, #6C3AED 0%, #DB2777 50%, #F472B6 100%)" }}>
              <h3 className="text-white font-bold text-lg uppercase mb-1">Upgrade to Pro</h3>
              <p className="text-white/80 text-sm mb-4">Get notified 18x faster — every 5 minutes instead of 90.</p>
              <ul className="space-y-2 text-sm text-white/90 mb-5">
                <li>&#10003; Checks every 5 minutes</li>
                <li>&#10003; Monitor multiple destinations</li>
                <li>&#10003; Weekday filtering</li>
                <li>&#10003; Morning / afternoon preference</li>
                <li>&#10003; Cancel anytime</li>
              </ul>
              <a href="/pricing" className="block w-full py-3 rounded-lg font-bold uppercase tracking-wider text-sm text-center hover:opacity-90 transition-all"
                style={{ background: "#ffffff", color: "#000000" }}>Upgrade — £3.99/mo</a>
            </div>
          )}
          <a href="/dashboard" className="block w-full py-3 rounded-lg font-bold uppercase tracking-wider text-sm text-center hover:opacity-90 transition-all mb-3 border border-white/20 text-white/60">
            Go to Dashboard
          </a>
          <a href="/" onClick={(e) => { e.preventDefault(); setStep(0); setSubmitted(false); setOrigin(""); setDestinations([]); }} className="block text-center text-white/40 text-sm hover:text-white/60 transition-colors">
            Set up another alert
          </a>
        </div>
      );
    }
    return null;
  };

  const greetings = [
    { text: "Bon Voyage!", size: "text-6xl" },
    { text: "Goede reis!", size: "text-5xl" },
    { text: "Auf Wiedersehen!", size: "text-4xl" },
    { text: "Buon viaggio!", size: "text-5xl" },
    { text: "Buen viaje!", size: "text-6xl" },
    { text: "Gute Reise!", size: "text-4xl" },
    { text: "Boa viagem!", size: "text-5xl" },
    { text: "God resa!", size: "text-4xl" },
    { text: "Bon Voyage!", size: "text-5xl" },
    { text: "Jó utat!", size: "text-6xl" },
    { text: "Bonne route!", size: "text-4xl" },
    { text: "Goede reis!", size: "text-6xl" },
    { text: "Buon viaggio!", size: "text-4xl" },
    { text: "Auf Wiedersehen!", size: "text-5xl" },
    { text: "Buen viaje!", size: "text-4xl" },
    { text: "Gute Reise!", size: "text-6xl" },
  ];

  if (showLanding) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className={`text-center transition-all duration-500 ease-in-out ${landingExiting ? "opacity-0 translate-x-[-80px]" : "opacity-100 translate-x-0"}`}>

          {/* Euro + snap intro */}
          {introPhase !== "hello" && (
            <div className={`h-28 sm:h-36 flex items-center justify-center mb-6 transition-opacity duration-700 ${introPhase === "fading" ? "opacity-0" : "opacity-100"}`}>
              <span
                className="text-6xl sm:text-8xl font-bold text-white uppercase tracking-tight transition-transform duration-700 ease-out inline-block"
                style={{ transform: introPhase === "split" ? "translateX(-50vw)" : "translateX(0)" }}
              >
                Euro
              </span>
              <span
                className="text-6xl sm:text-8xl font-bold uppercase tracking-tight transition-transform duration-700 ease-out inline-block"
                style={{ color: "#FFCC00", transform: introPhase === "split" ? "translateX(50vw)" : "translateX(0)" }}
              >
                snap
              </span>
            </div>
          )}

          {/* Hello carousel — appears after intro fades */}
          {introPhase === "hello" && (
            <>
              <div className="h-28 sm:h-36 relative mb-6" style={{ clipPath: "inset(-10px -100vw -10px -100vw)" }}>
                {HELLOS.map((hello, i) => (
                  <div
                    key={hello}
                    className="absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out"
                    style={{
                      transform: i === helloIndex ? "translateY(0)" : i === (helloIndex - 1 + HELLOS.length) % HELLOS.length ? "translateY(-100%)" : "translateY(100%)",
                      opacity: i === helloIndex ? 1 : 0,
                    }}
                  >
                    <h1 className="text-6xl sm:text-8xl font-bold text-white uppercase tracking-tight">
                      {hello}
                    </h1>
                  </div>
                ))}
              </div>
              <p className="text-white/40 text-sm mb-10 animate-fade-in">Find the cheapest Eurostar Snap deals, fast.</p>
              <button
                onClick={() => {
                  setLandingExiting(true);
                  setTimeout(() => setShowLanding(false), 500);
                }}
                className="px-12 py-4 rounded-2xl font-bold text-base uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-all border border-white/30 text-white animate-fade-in"
              >
                Start Now
              </button>
              <a href="/auth/signin" className="block mt-4 text-white/40 text-sm hover:text-white/60 transition-colors animate-fade-in-delay-1">
                Been here before? Login
              </a>
            </>
          )}
        </div>

        <footer className="fixed bottom-0 left-0 right-0 text-center py-3 text-xs text-white/20">
          <a href="/privacy" className="hover:text-white/40 transition-colors">Privacy Policy</a>
        </footer>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile background carousel — horizontal scroll left, fades on left edge */}
      <div
        className="lg:hidden fixed inset-0 overflow-hidden pointer-events-none transition-opacity duration-700 z-0"
        style={{ opacity: step === 0 ? 1 : step === 1 ? 0.4 : 0 }}
      >
        {/* Left fade */}
        <div className="absolute inset-0 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right, #003399 0%, transparent 20%)" }} />

        {/* Horizontal scrolling rows at different vertical positions */}
        <div className="absolute inset-0 flex flex-col justify-between py-16">
          <div className="animate-scroll-left whitespace-nowrap">
            <span className="text-5xl font-bold text-white/[0.07] uppercase tracking-tight inline-block mr-8">Bon Voyage!</span>
            <span className="text-4xl font-bold text-white/[0.05] uppercase tracking-tight inline-block mr-8">Gute Reise!</span>
            <span className="text-5xl font-bold text-white/[0.07] uppercase tracking-tight inline-block mr-8">Goede reis!</span>
            <span className="text-4xl font-bold text-white/[0.05] uppercase tracking-tight inline-block mr-8">Buon viaggio!</span>
            <span className="text-5xl font-bold text-white/[0.07] uppercase tracking-tight inline-block mr-8">Bon Voyage!</span>
            <span className="text-4xl font-bold text-white/[0.05] uppercase tracking-tight inline-block mr-8">Gute Reise!</span>
            <span className="text-5xl font-bold text-white/[0.07] uppercase tracking-tight inline-block mr-8">Goede reis!</span>
            <span className="text-4xl font-bold text-white/[0.05] uppercase tracking-tight inline-block mr-8">Buon viaggio!</span>
          </div>
          <div className="animate-scroll-left-slow whitespace-nowrap">
            <span className="text-6xl font-bold text-white/[0.06] uppercase tracking-tight inline-block mr-10">Buen viaje!</span>
            <span className="text-5xl font-bold text-white/[0.08] uppercase tracking-tight inline-block mr-10">Boa viagem!</span>
            <span className="text-6xl font-bold text-white/[0.06] uppercase tracking-tight inline-block mr-10">God resa!</span>
            <span className="text-5xl font-bold text-white/[0.08] uppercase tracking-tight inline-block mr-10">Jó utat!</span>
            <span className="text-6xl font-bold text-white/[0.06] uppercase tracking-tight inline-block mr-10">Buen viaje!</span>
            <span className="text-5xl font-bold text-white/[0.08] uppercase tracking-tight inline-block mr-10">Boa viagem!</span>
            <span className="text-6xl font-bold text-white/[0.06] uppercase tracking-tight inline-block mr-10">God resa!</span>
            <span className="text-5xl font-bold text-white/[0.08] uppercase tracking-tight inline-block mr-10">Jó utat!</span>
          </div>
          <div className="animate-scroll-left whitespace-nowrap">
            <span className="text-4xl font-bold text-white/[0.07] uppercase tracking-tight inline-block mr-8">Auf Wiedersehen!</span>
            <span className="text-5xl font-bold text-white/[0.05] uppercase tracking-tight inline-block mr-8">Bonne route!</span>
            <span className="text-4xl font-bold text-white/[0.07] uppercase tracking-tight inline-block mr-8">Goede reis!</span>
            <span className="text-5xl font-bold text-white/[0.05] uppercase tracking-tight inline-block mr-8">Bon Voyage!</span>
            <span className="text-4xl font-bold text-white/[0.07] uppercase tracking-tight inline-block mr-8">Auf Wiedersehen!</span>
            <span className="text-5xl font-bold text-white/[0.05] uppercase tracking-tight inline-block mr-8">Bonne route!</span>
            <span className="text-4xl font-bold text-white/[0.07] uppercase tracking-tight inline-block mr-8">Goede reis!</span>
            <span className="text-5xl font-bold text-white/[0.05] uppercase tracking-tight inline-block mr-8">Bon Voyage!</span>
          </div>
          <div className="animate-scroll-left-slow whitespace-nowrap">
            <span className="text-5xl font-bold text-white/[0.06] uppercase tracking-tight inline-block mr-8">Buon viaggio!</span>
            <span className="text-6xl font-bold text-white/[0.08] uppercase tracking-tight inline-block mr-8">Gute Reise!</span>
            <span className="text-5xl font-bold text-white/[0.06] uppercase tracking-tight inline-block mr-8">Buen viaje!</span>
            <span className="text-6xl font-bold text-white/[0.08] uppercase tracking-tight inline-block mr-8">Boa viagem!</span>
            <span className="text-5xl font-bold text-white/[0.06] uppercase tracking-tight inline-block mr-8">Buon viaggio!</span>
            <span className="text-6xl font-bold text-white/[0.08] uppercase tracking-tight inline-block mr-8">Gute Reise!</span>
            <span className="text-5xl font-bold text-white/[0.06] uppercase tracking-tight inline-block mr-8">Buen viaje!</span>
            <span className="text-6xl font-bold text-white/[0.08] uppercase tracking-tight inline-block mr-8">Boa viagem!</span>
          </div>
          <div className="animate-scroll-left whitespace-nowrap">
            <span className="text-4xl font-bold text-white/[0.07] uppercase tracking-tight inline-block mr-8">Bon Voyage!</span>
            <span className="text-5xl font-bold text-white/[0.05] uppercase tracking-tight inline-block mr-8">Jó utat!</span>
            <span className="text-4xl font-bold text-white/[0.07] uppercase tracking-tight inline-block mr-8">God resa!</span>
            <span className="text-5xl font-bold text-white/[0.05] uppercase tracking-tight inline-block mr-8">Goede reis!</span>
            <span className="text-4xl font-bold text-white/[0.07] uppercase tracking-tight inline-block mr-8">Bon Voyage!</span>
            <span className="text-5xl font-bold text-white/[0.05] uppercase tracking-tight inline-block mr-8">Jó utat!</span>
            <span className="text-4xl font-bold text-white/[0.07] uppercase tracking-tight inline-block mr-8">God resa!</span>
            <span className="text-5xl font-bold text-white/[0.05] uppercase tracking-tight inline-block mr-8">Goede reis!</span>
          </div>
        </div>
      </div>

      {/* Left side — form */}
      <div className="w-full lg:w-[55%] min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 relative z-10">
        {/* Nav */}
        <div className="fixed top-0 left-0 right-0 flex justify-between items-center px-6 sm:px-12 py-4 text-sm z-20">
          <button onClick={triggerLogoSnap} className="text-white/70 font-bold uppercase text-xs tracking-wider cursor-pointer bg-transparent border-0 p-0 overflow-hidden">
            <span className="inline-block transition-transform duration-400 ease-out" style={{ transform: logoSnap === "split" ? "translateX(-12px)" : "translateX(0)" }}>Euro</span>
            <span className="inline-block transition-transform duration-400 ease-out" style={{ color: "#FFCC00", transform: logoSnap === "split" ? "translateX(12px)" : "translateX(0)" }}>snap</span>
          </button>
          <div className="flex gap-4">
            {isSignedIn ? (
              <>
                <a href="/dashboard" className="text-white/40 hover:text-white transition-colors text-xs">Dashboard</a>
                <a href="/pricing" className="text-white/40 hover:text-white transition-colors text-xs">Pricing</a>
              </>
            ) : (
              <>
                <a href="/pricing" className="text-white/40 hover:text-white transition-colors text-xs">Pricing</a>
                <a href="/auth/signin" className="text-white/40 hover:text-white transition-colors text-xs">Sign In</a>
              </>
            )}
          </div>
        </div>

        {!submitted && (
          <div className="flex gap-2 mb-8">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-white" : i < step ? "w-3 bg-white/50" : "w-3 bg-white/15"
              }`} />
            ))}
          </div>
        )}

        <div className="w-full max-w-md">
          <div className={`transition-all duration-300 ease-in-out ${slideClass}`}>
            <div className="lg:bg-transparent lg:backdrop-blur-none lg:border-0 lg:rounded-none lg:p-0 bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-2xl p-5">
              {currentStep()}
            </div>
          </div>
        </div>

        {!submitted && step !== accountStep && step !== confirmStep && step !== confirmStep + 1 && (
          <div className="flex gap-3 mt-8 w-full max-w-md">
            {step > 0 && (
              <button onClick={goBack} className="px-6 py-3 rounded-lg text-sm font-semibold uppercase tracking-wider cursor-pointer border border-white/20 text-white/60 hover:border-white/40 transition-all">Back</button>
            )}
            <button onClick={goNext} disabled={!canProceed()}
              className="flex-1 py-3 rounded-lg font-bold text-sm uppercase tracking-wider cursor-pointer disabled:opacity-30 hover:opacity-90 transition-all"
              style={{ background: "#ffffff", color: "#000000" }}>Next</button>
          </div>
        )}

        {(step === accountStep || ((step === confirmStep || step === confirmStep + 1) && !submitted)) && step > 0 && (
          <div className="mt-4">
            <button onClick={goBack} className="text-white/40 text-sm hover:text-white/60 transition-colors cursor-pointer">&larr; Back</button>
          </div>
        )}
      </div>

      {/* Right side — greeting carousel (desktop only) */}
      <div className="hidden lg:block w-[45%] h-screen fixed right-0 top-0 overflow-hidden">
        {/* Fade to left */}
        <div className="absolute inset-0 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right, #003399 0%, transparent 30%)" }} />

        {/* Scrolling columns */}
        <div className="absolute inset-0 flex gap-6 px-8">
          {/* Column 1 — scrolls up */}
          <div className="flex-1 flex flex-col gap-4 animate-scroll-up">
            {[...greetings, ...greetings].map((g, i) => (
              <div
                key={`c1-${i}`}
                className={`${g.size} font-bold text-white/[0.07] uppercase tracking-tight whitespace-nowrap`}
                style={{ paddingLeft: `${(i * 17) % 60}px` }}
              >
                {g.text}
              </div>
            ))}
          </div>
          {/* Column 2 — scrolls down */}
          <div className="flex-1 flex flex-col gap-4 animate-scroll-down">
            {[...greetings.slice(5), ...greetings, ...greetings.slice(0, 5)].map((g, i) => (
              <div
                key={`c2-${i}`}
                className={`${g.size} font-bold text-white/[0.07] uppercase tracking-tight whitespace-nowrap`}
                style={{ paddingLeft: `${(i * 23) % 80}px` }}
              >
                {g.text}
              </div>
            ))}
          </div>
          {/* Column 3 — scrolls up slower */}
          <div className="flex-1 flex flex-col gap-4 animate-scroll-up-slow">
            {[...greetings.slice(8), ...greetings, ...greetings.slice(0, 8)].map((g, i) => (
              <div
                key={`c3-${i}`}
                className={`${g.size} font-bold text-white/[0.10] uppercase tracking-tight whitespace-nowrap`}
                style={{ paddingLeft: `${(i * 13) % 50}px` }}
              >
                {g.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 lg:w-[55%] text-center py-3 text-xs text-white/20 z-20">
        <a href="/privacy" className="hover:text-white/40 transition-colors">Privacy Policy</a>
      </footer>
    </main>
  );
}
