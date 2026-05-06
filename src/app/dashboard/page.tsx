"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

const STATIONS = [
  { id: "lon", name: "London St Pancras" },
  { id: "par", name: "Paris Gare du Nord" },
  { id: "bru", name: "Brussels Midi" },
  { id: "ams", name: "Amsterdam Centraal" },
  { id: "rot", name: "Rotterdam Centraal" },
  { id: "lil", name: "Lille Europe" },
];

const CONNECTIONS: Record<string, string[]> = {
  lon: ["par", "bru", "ams", "rot", "lil"],
  par: ["lon", "bru", "ams"],
  bru: ["lon", "par"],
  ams: ["lon", "par"],
  rot: ["lon"],
  lil: ["lon"],
};

const ROUTE_LABELS: Record<string, string> = {
  "lon-par": "London → Paris", "par-lon": "Paris → London",
  "lon-bru": "London → Brussels", "bru-lon": "Brussels → London",
  "lon-ams": "London → Amsterdam", "ams-lon": "Amsterdam → London",
  "lon-rot": "London → Rotterdam", "rot-lon": "Rotterdam → London",
  "lon-lil": "London → Lille", "lil-lon": "Lille → London",
  "par-bru": "Paris → Brussels", "bru-par": "Brussels → Paris",
  "par-ams": "Paris → Amsterdam", "ams-par": "Amsterdam → Paris",
};

const DAYS = [
  { value: 1, label: "Mon" }, { value: 2, label: "Tue" }, { value: 3, label: "Wed" },
  { value: 4, label: "Thu" }, { value: 5, label: "Fri" }, { value: 6, label: "Sat" }, { value: 0, label: "Sun" },
];

interface Watcher {
  id: number; route_id: string; passengers: number; weekdays: string;
  time_slot_pref: string; active: boolean; created_at: string;
}

interface Notification { watcher_id: number; available_date: string; sent_at: string; }

interface DashboardData {
  user: { id: number; email: string; name: string; tier: string } | null;
  watchers: Watcher[]; notifications: Notification[];
}

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const upgraded = searchParams.get("upgraded");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"alerts" | "notifications" | "settings">("alerts");

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit panel
  const [editId, setEditId] = useState<number | null>(null);
  const [editPassengers, setEditPassengers] = useState(1);
  const [editWeekdays, setEditWeekdays] = useState<number[]>([]);
  const [editSlot, setEditSlot] = useState<"any" | "morning" | "afternoon">("any");
  const [saving, setSaving] = useState(false);

  // Create alert flow
  const [createFlow, setCreateFlow] = useState<"hidden" | "origin" | "destination" | "settings">("hidden");
  const [createSaving, setCreateSaving] = useState(false);
  const [newOrigin, setNewOrigin] = useState("");
  const [newDestinations, setNewDestinations] = useState<string[]>([]);
  const [newPassengers, setNewPassengers] = useState(1);
  const [newWeekdays, setNewWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [newSlot, setNewSlot] = useState<"any" | "morning" | "afternoon">("any");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/signin"); return; }
    if (status === "authenticated") {
      fetch("/api/dashboard").then((r) => r.json()).then(setData).finally(() => setLoading(false));
    }
  }, [status, router]);

  async function refreshData() {
    const res = await fetch("/api/dashboard");
    const newData = await res.json();
    setData(newData);
  }

  async function handleDelete(watcherId: number) {
    setDeleting(true);
    await fetch("/api/dashboard/watcher", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watcherId }),
    });
    await refreshData();
    setDeleteId(null);
    setDeleting(false);
  }

  function startEdit(w: Watcher) {
    setEditId(w.id);
    setEditPassengers(w.passengers);
    setEditWeekdays(w.weekdays === "0,1,2,3,4,5,6" ? [0,1,2,3,4,5,6] : w.weekdays.split(",").map(Number));
    setEditSlot(w.time_slot_pref as "any" | "morning" | "afternoon");
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    await fetch("/api/dashboard/watcher", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        watcherId: editId,
        passengers: editPassengers,
        weekdays: editWeekdays,
        timeSlotPref: editSlot,
      }),
    });
    await refreshData();
    setEditId(null);
    setSaving(false);
  }

  async function handleCreateSave() {
    setCreateSaving(true);
    const email = session?.user?.email;
    if (!email) return;

    const today = new Date().toISOString().split("T")[0];
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    const dateTo = threeMonths.toISOString().split("T")[0];

    for (const dest of newDestinations) {
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, routeId: `${newOrigin}-${dest}`,
          dateFrom: today, dateTo,
          passengers: newPassengers,
          weekdays: newWeekdays,
          timeSlotPref: newSlot,
        }),
      });
    }

    await refreshData();
    setCreateSaving(false);
    setCreateFlow("hidden");
    setNewOrigin(""); setNewDestinations([]);
    setNewPassengers(1); setNewWeekdays([0,1,2,3,4,5,6]); setNewSlot("any");
  }

  if (status === "loading" || loading) {
    return <main className="min-h-screen flex items-center justify-center text-white/50">Loading...</main>;
  }
  if (!data?.user) {
    return <main className="min-h-screen flex items-center justify-center text-white/50">Loading...</main>;
  }

  const tier = data.user.tier;
  const isPro = tier === "pro";
  const activeWatchers = data.watchers.filter((w) => w.active);
  const inactiveWatchers = data.watchers.filter((w) => !w.active);

  function toggleEditDay(day: number) {
    setEditWeekdays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  }
  function toggleNewDay(day: number) {
    setNewWeekdays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  }

  return (
    <main className="min-h-screen px-6 sm:px-12 py-16 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Dashboard</h1>
          <p className="text-white/40 text-sm mt-1">{data.user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {isPro ? (
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
              style={{ background: "linear-gradient(135deg, #6C3AED, #DB2777)", color: "white" }}>Pro</span>
          ) : (
            <a href="/pricing" className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/20 text-white/50 hover:border-white/40 transition-colors">Upgrade</a>
          )}
        </div>
      </div>

      {upgraded && (
        <div className="mb-8 p-4 rounded-lg bg-green-900/50 text-green-300 border border-green-800 text-sm">Successfully upgraded to Pro.</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-8 rounded-lg p-1" style={{ background: "#002266" }}>
        {(["alerts", "notifications", "settings"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-md text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all ${
              tab === t ? "bg-white text-black" : "text-white/40 hover:text-white/60"}`}>
            {t === "alerts" ? `Alerts (${activeWatchers.length})` : t === "notifications" ? `Sent (${data.notifications.length})` : "Settings"}
          </button>
        ))}
      </div>

      {/* ===== ALERTS TAB ===== */}
      {tab === "alerts" && (
        <div>
          {activeWatchers.length === 0 && createFlow === "hidden" ? (
            <div className="text-center py-12">
              <p className="text-white/40 mb-4">No active alerts.</p>
              <button onClick={() => { setCreateFlow("origin"); setNewOrigin(""); setNewDestinations([]); }}
                className="text-sm font-bold uppercase tracking-wider px-6 py-3 rounded-lg hover:opacity-90 transition-all inline-block cursor-pointer"
                style={{ background: "#ffffff", color: "#000000" }}>Create Alert</button>
            </div>
          ) : createFlow === "hidden" ? (
            <div className="space-y-3">
              {activeWatchers.map((w) => (
                <div key={w.id} className="rounded-xl p-5" style={{ background: "#002266" }}>
                  {/* Header with route name + icons */}
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-white font-semibold text-sm">{ROUTE_LABELS[w.route_id] || w.route_id}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">Active</span>
                      {/* Edit button */}
                      <button onClick={() => editId === w.id ? setEditId(null) : startEdit(w)}
                        className="text-white/30 hover:text-white/60 cursor-pointer transition-colors" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                        </svg>
                      </button>
                      {/* Delete button */}
                      <button onClick={() => setDeleteId(w.id)}
                        className="text-white/30 hover:text-red-400 cursor-pointer transition-colors" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-white/50">
                    <div>Passengers: <span className="text-white/70">{w.passengers}</span></div>
                    <div>Monitoring: <span className="text-white/70">Rolling 3 months</span></div>
                    {w.weekdays !== "0,1,2,3,4,5,6" && (
                      <div>Days: <span className="text-white/70">{w.weekdays.split(",").map((d: string) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][parseInt(d)]).join(", ")}</span></div>
                    )}
                    {w.time_slot_pref !== "any" && (
                      <div>Slot: <span className="text-white/70 capitalize">{w.time_slot_pref}</span></div>
                    )}
                  </div>
                  <p className="text-white/30 text-xs mt-3">Created {new Date(w.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>

                  {/* Delete confirmation */}
                  {deleteId === w.id && (
                    <div className="mt-4 p-4 rounded-lg border border-red-500/30 bg-red-900/10">
                      <p className="text-red-300 text-sm mb-3">Are you sure you want to delete this route alert?</p>
                      <div className="flex gap-3">
                        <button onClick={() => setDeleteId(null)}
                          className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer border border-white/20 text-white/60 hover:border-white/40 transition-all">No</button>
                        <button onClick={() => handleDelete(w.id)} disabled={deleting}
                          className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50">
                          {deleting ? "Deleting..." : "Yes, delete"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Edit panel */}
                  {editId === w.id && (
                    <div className="mt-4 p-4 rounded-lg border border-white/10" style={{ background: "#001a4d" }}>
                      {/* Passengers */}
                      <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Passengers</p>
                      <div className="flex gap-2 mb-4">
                        {[1,2,3,4].map((n) => (
                          <button key={n} onClick={() => setEditPassengers(n)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer border transition-all ${
                              editPassengers === n ? "bg-white text-black border-white" : "bg-transparent text-white/40 border-white/20"
                            }`}>{n}</button>
                        ))}
                      </div>

                      {/* Weekdays */}
                      <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Days</p>
                      {isPro ? (
                        <div className="flex gap-1 mb-4">
                          {DAYS.map((day) => (
                            <button key={day.value} onClick={() => toggleEditDay(day.value)}
                              className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase cursor-pointer border transition-all ${
                                editWeekdays.includes(day.value) ? "bg-white text-black border-white" : "bg-transparent text-white/40 border-white/20"
                              }`}>{day.label}</button>
                          ))}
                        </div>
                      ) : (
                        <div className="relative mb-4">
                          <div className="flex gap-1 blur-sm pointer-events-none select-none">
                            {DAYS.map((day) => (
                              <div key={day.value} className="flex-1 py-2 rounded-lg text-xs font-semibold uppercase text-center border border-white/20 text-white/40">{day.label}</div>
                            ))}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <a href="/pricing" className="text-xs font-bold text-white/60 hover:text-white transition-colors">Upgrade to Pro to unlock</a>
                          </div>
                        </div>
                      )}

                      {/* Time slot */}
                      <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Time Slot</p>
                      {isPro ? (
                        <div className="flex gap-2 mb-4">
                          {(["any", "morning", "afternoon"] as const).map((s) => (
                            <button key={s} onClick={() => setEditSlot(s)}
                              className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase cursor-pointer border transition-all ${
                                editSlot === s ? "bg-white text-black border-white" : "bg-transparent text-white/40 border-white/20"
                              }`}>{s}</button>
                          ))}
                        </div>
                      ) : (
                        <div className="relative mb-4">
                          <div className="flex gap-2 blur-sm pointer-events-none select-none">
                            {["Any", "Morning", "Afternoon"].map((s) => (
                              <div key={s} className="flex-1 py-2 rounded-lg text-xs font-semibold uppercase text-center border border-white/20 text-white/40">{s}</div>
                            ))}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <a href="/pricing" className="text-xs font-bold text-white/60 hover:text-white transition-colors">Upgrade to Pro to unlock</a>
                          </div>
                        </div>
                      )}

                      <button onClick={saveEdit} disabled={saving}
                        className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
                        style={{ background: "#ffffff", color: "#000000" }}>
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Pro promo for free users */}
              {!isPro && (
                <div className="rounded-2xl p-6 mt-4"
                  style={{ background: "linear-gradient(135deg, #6C3AED 0%, #DB2777 50%, #F472B6 100%)" }}>
                  <h3 className="text-white font-bold text-sm uppercase mb-1">Get there first with Pro</h3>
                  <p className="text-white/80 text-xs mb-4">Your alerts check every 60 minutes. Pro checks every 5.</p>
                  <ul className="space-y-1 text-xs text-white/90 mb-4">
                    <li>&#10003; 18x faster checks</li>
                    <li>&#10003; Multiple destinations</li>
                    <li>&#10003; Weekday &amp; time slot filtering</li>
                  </ul>
                  <a href="/pricing" className="block w-full py-2.5 rounded-lg font-bold uppercase tracking-wider text-xs text-center hover:opacity-90 transition-all"
                    style={{ background: "#ffffff", color: "#000000" }}>Upgrade — £3.99/mo</a>
                </div>
              )}

              <button onClick={() => { setCreateFlow("origin"); setNewOrigin(""); setNewDestinations([]); setNewPassengers(1); setNewWeekdays([0,1,2,3,4,5,6]); setNewSlot("any"); }}
                className="block w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors mt-4 cursor-pointer">
                + Create another alert
              </button>
            </div>
          ) : null}

          {/* ===== CREATE ALERT FLOW (inline) ===== */}
          {createFlow === "origin" && (
            <div>
              <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-2">Where are you starting?</h2>
              <p className="text-white/50 text-sm mb-6">Select your departure station.</p>
              <div className="grid gap-2 mb-6">
                {STATIONS.map((s) => (
                  <button key={s.id} onClick={() => { setNewOrigin(s.id); setNewDestinations([]); }}
                    className={`w-full text-left px-5 py-4 rounded-xl text-sm font-medium cursor-pointer border transition-all ${
                      newOrigin === s.id ? "bg-white text-black border-white" : "bg-transparent text-white/70 border-white/15 hover:border-white/30"
                    }`}>{s.name}</button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCreateFlow("hidden")}
                  className="px-6 py-3 rounded-lg text-sm font-semibold uppercase tracking-wider cursor-pointer border border-white/20 text-white/60 hover:border-white/40 transition-all">Cancel</button>
                <button onClick={() => setCreateFlow("destination")} disabled={!newOrigin}
                  className="flex-1 py-3 rounded-lg font-bold text-sm uppercase tracking-wider cursor-pointer disabled:opacity-30 hover:opacity-90 transition-all"
                  style={{ background: "#ffffff", color: "#000000" }}>Next</button>
              </div>
            </div>
          )}

          {createFlow === "destination" && (
            <div>
              <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-2">Where are you going?</h2>
              <p className="text-white/50 text-sm mb-2">{isPro ? "Select one or more destinations." : "Select your destination."}</p>
              {!isPro && <p className="text-white/30 text-xs mb-6">* Pro users can monitor multiple destinations.</p>}
              <div className="grid gap-2 mb-6">
                {(CONNECTIONS[newOrigin] || []).map((destId) => {
                  const s = STATIONS.find((st) => st.id === destId)!;
                  const selected = newDestinations.includes(destId);
                  return (
                    <button key={destId} onClick={() => {
                      if (selected) setNewDestinations((prev) => prev.filter((d) => d !== destId));
                      else if (isPro) setNewDestinations((prev) => [...prev, destId]);
                      else setNewDestinations([destId]);
                    }}
                      className={`w-full text-left px-5 py-4 rounded-xl text-sm font-medium cursor-pointer border transition-all ${
                        selected ? "bg-white text-black border-white" : "bg-transparent text-white/70 border-white/15 hover:border-white/30"
                      }`}>
                      {s.name}
                      {selected && isPro && newDestinations.length > 1 && <span className="float-right text-black/40">&#10003;</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCreateFlow("origin")}
                  className="px-6 py-3 rounded-lg text-sm font-semibold uppercase tracking-wider cursor-pointer border border-white/20 text-white/60 hover:border-white/40 transition-all">Back</button>
                <button onClick={() => setCreateFlow("settings")} disabled={newDestinations.length === 0}
                  className="flex-1 py-3 rounded-lg font-bold text-sm uppercase tracking-wider cursor-pointer disabled:opacity-30 hover:opacity-90 transition-all"
                  style={{ background: "#ffffff", color: "#000000" }}>Next</button>
              </div>
            </div>
          )}

          {createFlow === "settings" && (
            <div>
              <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-2">Alert settings</h2>
              <p className="text-white/50 text-sm mb-6">Configure your preferences.</p>

              {/* Passengers */}
              <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Passengers</p>
              <div className="flex gap-2 mb-5">
                {[1,2,3,4].map((n) => (
                  <button key={n} onClick={() => setNewPassengers(n)}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold cursor-pointer border transition-all ${
                      newPassengers === n ? "bg-white text-black border-white" : "bg-transparent text-white/40 border-white/20"
                    }`}>{n}</button>
                ))}
              </div>

              {/* Weekdays */}
              <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Days</p>
              {isPro ? (
                <div className="flex gap-1 mb-5">
                  {DAYS.map((day) => (
                    <button key={day.value} onClick={() => toggleNewDay(day.value)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase cursor-pointer border transition-all ${
                        newWeekdays.includes(day.value) ? "bg-white text-black border-white" : "bg-transparent text-white/40 border-white/20"
                      }`}>{day.label}</button>
                  ))}
                </div>
              ) : (
                <div className="relative mb-5">
                  <div className="flex gap-1 blur-sm pointer-events-none select-none">
                    {DAYS.map((day) => (
                      <div key={day.value} className="flex-1 py-2 rounded-lg text-xs font-semibold uppercase text-center border border-white/20 text-white/40">{day.label}</div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <a href="/pricing" className="text-xs font-bold text-white/60 hover:text-white transition-colors">Upgrade to Pro to unlock</a>
                  </div>
                </div>
              )}

              {/* Time slot */}
              <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Time Slot</p>
              {isPro ? (
                <div className="flex gap-2 mb-6">
                  {(["any", "morning", "afternoon"] as const).map((s) => (
                    <button key={s} onClick={() => setNewSlot(s)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase cursor-pointer border transition-all ${
                        newSlot === s ? "bg-white text-black border-white" : "bg-transparent text-white/40 border-white/20"
                      }`}>{s}</button>
                  ))}
                </div>
              ) : (
                <div className="relative mb-6">
                  <div className="flex gap-2 blur-sm pointer-events-none select-none">
                    {["Any", "Morning", "Afternoon"].map((s) => (
                      <div key={s} className="flex-1 py-2 rounded-lg text-xs font-semibold uppercase text-center border border-white/20 text-white/40">{s}</div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <a href="/pricing" className="text-xs font-bold text-white/60 hover:text-white transition-colors">Upgrade to Pro to unlock</a>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setCreateFlow("destination")}
                  className="px-6 py-3 rounded-lg text-sm font-semibold uppercase tracking-wider cursor-pointer border border-white/20 text-white/60 hover:border-white/40 transition-all">Back</button>
                <button onClick={handleCreateSave} disabled={createSaving}
                  className="flex-1 py-3 rounded-lg font-bold text-sm uppercase tracking-wider cursor-pointer disabled:opacity-30 hover:opacity-90 transition-all"
                  style={{ background: "#ffffff", color: "#000000" }}>
                  {createSaving ? "Creating..." : "Create Alert"}
                </button>
              </div>
            </div>
          )}

          {inactiveWatchers.length > 0 && createFlow === "hidden" && (
            <div className="mt-8">
              <h3 className="text-xs uppercase tracking-widest text-white/30 mb-3">Inactive</h3>
              <div className="space-y-2">
                {inactiveWatchers.map((w) => (
                  <div key={w.id} className="rounded-xl p-4 opacity-50" style={{ background: "#002266" }}>
                    <div className="flex justify-between items-center">
                      <span className="text-white/50 text-sm">{ROUTE_LABELS[w.route_id] || w.route_id}</span>
                      <span className="text-xs text-white/30">Unsubscribed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== NOTIFICATIONS TAB ===== */}
      {tab === "notifications" && (
        <div>
          {data.notifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/40">No notifications sent yet.</p>
              <p className="text-white/30 text-sm mt-2">When Snap dates become available, they&rsquo;ll appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.notifications.map((n, i) => {
                const watcher = data.watchers.find((w) => w.id === n.watcher_id);
                const routeLabel = watcher ? (ROUTE_LABELS[watcher.route_id] || watcher.route_id) : "Unknown route";
                const dateStr = new Date(n.available_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
                const sentStr = new Date(n.sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={i} className="rounded-xl p-4 flex justify-between items-center" style={{ background: "#002266" }}>
                    <div>
                      <p className="text-white text-sm font-semibold">{routeLabel}</p>
                      <p className="text-white/50 text-xs">Snap available: {dateStr}</p>
                    </div>
                    <p className="text-white/30 text-xs">{sentStr}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== SETTINGS TAB ===== */}
      {tab === "settings" && (
        <div className="space-y-6">
          <div className="rounded-xl p-5" style={{ background: "#002266" }}>
            <h3 className="text-xs uppercase tracking-widest text-white/40 mb-4">Account</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/50 text-sm">Email</span>
                <span className="text-white text-sm">{data.user.email}</span>
              </div>
              {data.user.name && (
                <div className="flex justify-between">
                  <span className="text-white/50 text-sm">Name</span>
                  <span className="text-white text-sm">{data.user.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white/50 text-sm">Plan</span>
                <span className="text-white text-sm capitalize">{tier}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {!isPro && (
              <a href="/pricing" className="flex-1 py-3 rounded-lg font-bold uppercase tracking-wider text-sm text-center cursor-pointer hover:opacity-90 transition-all"
                style={{ background: "#ffffff", color: "#000000" }}>Upgrade to Pro</a>
            )}
            <a href="/account" className="flex-1 py-3 rounded-lg font-bold uppercase tracking-wider text-sm text-center cursor-pointer border border-white/20 text-white/60 hover:border-white/40 transition-all">
              Account Settings
            </a>
          </div>

          <button onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full py-3 rounded-lg font-bold uppercase tracking-wider text-sm cursor-pointer border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-all">
            Sign Out
          </button>
        </div>
      )}

      <footer className="mt-16 text-center text-xs text-white/20">
        <a href="/" className="hover:text-white/40 transition-colors">Home</a>
        <span className="mx-2">·</span>
        <a href="/privacy" className="hover:text-white/40 transition-colors">Privacy</a>
      </footer>
    </main>
  );
}

export default function Dashboard() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
