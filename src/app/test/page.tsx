"use client";

import { useState } from "react";

const ROUTES = [
  { id: "lon-par", label: "London → Paris" },
  { id: "par-lon", label: "Paris → London" },
  { id: "lon-bru", label: "London → Brussels" },
  { id: "bru-lon", label: "Brussels → London" },
  { id: "lon-ams", label: "London → Amsterdam" },
  { id: "ams-lon", label: "Amsterdam → London" },
  { id: "lon-rot", label: "London → Rotterdam" },
  { id: "rot-lon", label: "Rotterdam → London" },
  { id: "lon-lil", label: "London → Lille" },
  { id: "lil-lon", label: "Lille → London" },
  { id: "par-bru", label: "Paris → Brussels" },
  { id: "bru-par", label: "Brussels → Paris" },
  { id: "par-ams", label: "Paris → Amsterdam" },
  { id: "ams-par", label: "Amsterdam → Paris" },
];

interface AvailabilityResult {
  route: string;
  month: string;
  datesFound: number;
  availability: { date: string; price: string | null; available: boolean; timeSlots: { slot: string; time: string; price: string | null; available: boolean }[] }[];
}

export default function TestPage() {
  const [routeId, setRouteId] = useState("lon-par");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/test-scrape?route=${routeId}&month=${month}`);
      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Failed to fetch");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-6 sm:px-12 py-16 max-w-2xl">
      <a href="/" className="text-white/40 text-sm hover:text-white/60 transition-colors mb-8 inline-block">
        &larr; Back
      </a>

      <h1 className="text-4xl font-bold text-white uppercase tracking-tight mb-2">
        Scraper Test
      </h1>
      <p className="text-white/50 text-sm mb-8">
        Live test of the Eurostar Snap availability scraper. No headless browser — plain HTTP fetch.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={routeId}
          onChange={(e) => setRouteId(e.target.value)}
          className="flex-1 rounded-lg px-4 py-3 text-white border border-white/20 focus:border-white/60 focus:outline-none"
          style={{ background: "#002878" }}
        >
          {ROUTES.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>

        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg px-4 py-3 text-white border border-white/20 focus:border-white/60 focus:outline-none"
          style={{ background: "#002878" }}
        />

        <button
          onClick={handleCheck}
          disabled={loading}
          className="px-6 py-3 rounded-lg font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50 hover:opacity-90 transition-all"
          style={{ background: "#ffffff", color: "#000000" }}
        >
          {loading ? "Checking..." : "Check"}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-900/50 text-red-300 border border-red-800 text-sm mb-6">
          {error}
        </div>
      )}

      {result && (
        <div>
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-white font-semibold">{result.route}</h2>
            <span className="text-white/40 text-sm">{result.month}</span>
            <span className={`text-sm font-semibold ${result.datesFound > 0 ? "text-green-400" : "text-white/40"}`}>
              {result.datesFound} {result.datesFound === 1 ? "date" : "dates"} found
            </span>
          </div>

          {result.datesFound > 0 ? (
            <div className="rounded-lg border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10" style={{ background: "#002266" }}>
                    <th className="text-left px-4 py-3 text-white/50 uppercase text-xs tracking-widest">Date</th>
                    <th className="text-left px-4 py-3 text-white/50 uppercase text-xs tracking-widest">Day</th>
                    <th className="text-right px-4 py-3 text-white/50 uppercase text-xs tracking-widest">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {result.availability.map((a) => {
                    const d = new Date(a.date);
                    const dayName = d.toLocaleDateString("en-GB", { weekday: "short" });
                    const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                    return (
                      <tr key={a.date} className="border-b border-white/5">
                        <td className="px-4 py-3 text-white">{dateStr}</td>
                        <td className="px-4 py-3 text-white/60">{dayName}</td>
                        <td className="px-4 py-3 text-white font-semibold text-right">
                          {a.price || "—"}
                          {a.timeSlots && a.timeSlots.length > 0 && (
                            <div className="flex gap-2 mt-1 justify-end">
                              {a.timeSlots.map((s) => (
                                <span key={s.slot} className={`text-xs px-2 py-0.5 rounded ${s.available ? "bg-green-900/50 text-green-300" : "bg-white/5 text-white/30"}`}>
                                  {s.slot === "morning" ? "AM" : "PM"} {s.available ? s.price : "—"}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 rounded-lg border border-white/10 text-center text-white/40" style={{ background: "#002266" }}>
              No Snap availability for this route and month.
            </div>
          )}
        </div>
      )}
    </main>
  );
}
