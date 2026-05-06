"use client";

import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";

function PricingContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const success = searchParams.get("success");
  const cancelled = searchParams.get("cancelled");
  const tier = (session?.user as Record<string, unknown>)?.tier as string || "free";

  async function handleUpgrade() {
    if (status !== "authenticated") {
      router.push("/auth/signup");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-6 sm:px-12 py-16 max-w-3xl mx-auto">
      <a href="/" className="text-white/40 text-sm hover:text-white/60 transition-colors mb-8 inline-block">
        &larr; Back
      </a>

      <h1 className="text-4xl sm:text-5xl font-bold text-white uppercase tracking-tight mb-3">
        Choose your plan
      </h1>
      <p className="text-white/50 mb-12 max-w-md">
        Free gets you covered. Pro gets you there first.
      </p>

      {success && (
        <div className="mb-8 p-4 rounded-lg bg-green-900/50 text-green-300 border border-green-800 text-sm">
          Successfully upgraded to Pro.
        </div>
      )}

      {cancelled && (
        <div className="mb-8 p-4 rounded-lg bg-yellow-900/50 text-yellow-300 border border-yellow-800 text-sm">
          Payment cancelled. You can upgrade anytime.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Free */}
        <div className="rounded-2xl border border-white/10 p-8" style={{ background: "#002266" }}>
          <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Free</div>
          <div className="text-4xl font-bold text-white mb-1">
            £0<span className="text-lg font-normal text-white/40">/mo</span>
          </div>
          <p className="text-white/40 text-sm mb-8">The essentials</p>

          <ul className="space-y-3 text-sm mb-8">
            <li className="flex items-start gap-2">
              <span className="text-white/60 mt-0.5">&#10003;</span>
              <span className="text-white/70">Checks every 60 minutes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/60 mt-0.5">&#10003;</span>
              <span className="text-white/70">Email notifications</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/60 mt-0.5">&#10003;</span>
              <span className="text-white/70">All routes</span>
            </li>
          </ul>

          {tier === "free" && status === "authenticated" ? (
            <div className="w-full py-3 rounded-lg text-center text-white/40 border border-white/10 text-sm">
              Current plan
            </div>
          ) : (
            <a
              href={status === "authenticated" ? "/" : "/auth/signup"}
              className="block w-full py-3 rounded-lg text-center text-white/60 border border-white/20 hover:border-white/40 transition-colors text-sm"
            >
              {status === "authenticated" ? "Go to dashboard" : "Get started"}
            </a>
          )}
        </div>

        {/* Pro */}
        <div
          className="rounded-2xl p-8 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #6C3AED 0%, #DB2777 50%, #F472B6 100%)",
          }}
        >
          <div className="text-xs uppercase tracking-widest text-white/70 mb-2">Pro</div>
          <div className="text-4xl font-bold text-white mb-1">
            £3.99<span className="text-lg font-normal text-white/70">/mo</span>
          </div>
          <p className="text-white/70 text-sm mb-8">Be first in line</p>

          <ul className="space-y-3 text-sm mb-8">
            <li className="flex items-start gap-2">
              <span className="text-white mt-0.5">&#10003;</span>
              <span className="text-white/90">Checks every <strong className="text-white">5 minutes</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white mt-0.5">&#10003;</span>
              <span className="text-white/90">18x faster than the free plan</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white mt-0.5">&#10003;</span>
              <span className="text-white/90">Monitor multiple destinations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white mt-0.5">&#10003;</span>
              <span className="text-white/90">Email notifications</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white mt-0.5">&#10003;</span>
              <span className="text-white/90">All routes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white mt-0.5">&#10003;</span>
              <span className="text-white/90">Weekday filtering</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white mt-0.5">&#10003;</span>
              <span className="text-white/90">Morning / afternoon slot preference</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white mt-0.5">&#10003;</span>
              <span className="text-white/90">Cancel anytime</span>
            </li>
          </ul>

          {tier === "pro" ? (
            <div className="w-full py-3 rounded-lg text-center text-white bg-white/20 text-sm font-semibold">
              Current plan
            </div>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-3.5 rounded-lg font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50 hover:opacity-90 transition-all text-sm"
              style={{ background: "#ffffff", color: "#000000" }}
            >
              {loading ? "Loading..." : "Upgrade to Pro"}
            </button>
          )}
        </div>
      </div>

      <p className="mt-8 text-xs text-white/30 text-center">
        Payments handled securely by Stripe. Cancel anytime from your account.
      </p>
    </main>
  );
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}
