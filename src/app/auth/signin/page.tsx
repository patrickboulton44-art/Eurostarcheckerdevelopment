"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white uppercase tracking-tight mb-8">
          Sign In
        </h1>

        {/* Google */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-3 cursor-pointer hover:opacity-90 transition-all mb-4 border border-white/20"
          style={{ background: "#ffffff", color: "#000000" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="text-white/30 text-xs uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

        {/* Email/Password */}
        <form onSubmit={handleSubmit}>
          <label className="block mb-4">
            <span className="text-xs uppercase tracking-widest text-white/50 mb-2 block">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg px-4 py-3 text-white border border-white/20 focus:border-white/60 focus:outline-none transition-colors"
              style={{ background: "#002878" }}
            />
          </label>

          <label className="block mb-6">
            <span className="text-xs uppercase tracking-widest text-white/50 mb-2 block">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg px-4 py-3 text-white border border-white/20 focus:border-white/60 focus:outline-none transition-colors"
              style={{ background: "#002878" }}
            />
          </label>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/50 text-red-300 border border-red-800 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50 hover:opacity-90 transition-all"
            style={{ background: "#ffffff", color: "#000000" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-white/40 text-sm">
          Don&rsquo;t have an account?{" "}
          <a href="/" className="text-white underline hover:text-white/80">Start here</a>
        </p>
      </div>
    </main>
  );
}
