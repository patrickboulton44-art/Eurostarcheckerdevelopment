"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function Account() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any;
  const tier = user?.tier || "free";
  const isGoogle = !!(user?.image || session?.user?.name); // Google users have image/name from OAuth

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 6) {
      setPasswordStatus({ type: "error", message: "New password must be at least 6 characters" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "Passwords don't match" });
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setPasswordStatus({ type: "success", message: "Password updated" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordStatus({ type: "error", message: data.error });
      }
    } catch {
      setPasswordStatus({ type: "error", message: "Something went wrong" });
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleSignOut() {
    setSignOutLoading(true);
    await signOut({ callbackUrl: "/" });
  }

  if (status === "loading" || status === "unauthenticated") {
    return <main className="min-h-screen flex items-center justify-center text-white/50">Loading...</main>;
  }

  return (
    <main className="min-h-screen px-6 sm:px-12 py-16 max-w-lg mx-auto">
      <a href="/" className="text-white/40 text-sm hover:text-white/60 transition-colors mb-8 inline-block">
        &larr; Back
      </a>

      <h1 className="text-3xl font-bold text-white uppercase tracking-tight mb-10">
        Account
      </h1>

      {/* Profile Info */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-widest text-white/40 mb-4">Profile</h2>
        <div className="rounded-xl p-5 space-y-4" style={{ background: "#002266" }}>
          <div className="flex justify-between items-center">
            <span className="text-white/50 text-sm">Email</span>
            <span className="text-white text-sm">{session?.user?.email}</span>
          </div>
          {session?.user?.name && (
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-sm">Name</span>
              <span className="text-white text-sm">{session.user.name}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-white/50 text-sm">Sign-in method</span>
            <span className="text-white text-sm flex items-center gap-2">
              {isGoogle ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Google
                </>
              ) : (
                "Email & password"
              )}
            </span>
          </div>
        </div>
      </section>

      {/* Plan */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-widest text-white/40 mb-4">Plan</h2>
        <div className="rounded-xl p-5 flex justify-between items-center" style={{ background: "#002266" }}>
          <div>
            <span className="text-white font-semibold">{tier === "pro" ? "Pro" : "Free"}</span>
            <span className="text-white/40 text-sm ml-2">
              {tier === "pro" ? "£3.99/mo — checks every 5 min" : "Checks every 90 min"}
            </span>
          </div>
          {tier !== "pro" && (
            <a
              href="/pricing"
              className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all"
              style={{ background: "#ffffff", color: "#000000" }}
            >
              Upgrade
            </a>
          )}
        </div>
      </section>

      {/* Change Password — only for email/password users */}
      {!isGoogle && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-widest text-white/40 mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="rounded-xl p-5 space-y-4" style={{ background: "#002266" }}>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-white/50 mb-1 block">Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full rounded-lg px-4 py-3 text-white border border-white/20 focus:border-white/60 focus:outline-none transition-colors text-sm"
                style={{ background: "#001a4d" }}
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-white/50 mb-1 block">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg px-4 py-3 text-white border border-white/20 focus:border-white/60 focus:outline-none transition-colors text-sm"
                style={{ background: "#001a4d" }}
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-white/50 mb-1 block">Confirm new password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg px-4 py-3 text-white border border-white/20 focus:border-white/60 focus:outline-none transition-colors text-sm"
                style={{ background: "#001a4d" }}
              />
            </label>

            {passwordStatus && (
              <div className={`p-3 rounded-lg text-center text-sm ${
                passwordStatus.type === "success"
                  ? "bg-green-900/50 text-green-300 border border-green-800"
                  : "bg-red-900/50 text-red-300 border border-red-800"
              }`}>
                {passwordStatus.message}
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-3 rounded-lg font-bold uppercase tracking-wider text-sm cursor-pointer disabled:opacity-50 hover:opacity-90 transition-all border border-white/20 text-white"
            >
              {passwordLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>
      )}

      {/* Sign Out */}
      <section className="space-y-3">
        <button
          onClick={handleSignOut}
          disabled={signOutLoading}
          className="w-full py-3 rounded-lg font-bold uppercase tracking-wider text-sm cursor-pointer disabled:opacity-50 hover:opacity-90 transition-all border border-white/20 text-white/60"
        >
          {signOutLoading ? "Signing out..." : "Sign Out"}
        </button>

        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="w-full py-3 rounded-lg font-bold uppercase tracking-wider text-sm cursor-pointer hover:bg-red-900/20 transition-all border border-red-500/30 text-red-400"
          >
            Delete Account
          </button>
        ) : (
          <div className="rounded-xl p-5 border border-red-500/30 bg-red-900/10">
            <p className="text-red-300 text-sm mb-4">This will permanently delete your account, all alerts, and notification history. This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-3 rounded-lg font-bold uppercase tracking-wider text-sm cursor-pointer border border-white/20 text-white/60 hover:border-white/40 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeleteLoading(true);
                  await fetch("/api/auth/delete-account", { method: "POST" });
                  await signOut({ callbackUrl: "/" });
                }}
                disabled={deleteLoading}
                className="flex-1 py-3 rounded-lg font-bold uppercase tracking-wider text-sm cursor-pointer bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
