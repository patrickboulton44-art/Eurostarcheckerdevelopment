import { NextRequest, NextResponse } from "next/server";
import { deactivateWatcher, initDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    await initDb();
    await deactivateWatcher(token);

    return new NextResponse(
      `<!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>Unsubscribed</title></head>
      <body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#1a1a2e;color:white;">
        <div style="text-align:center;">
          <h1>Unsubscribed</h1>
          <p>You won't receive any more alerts for this route.</p>
          <a href="/" style="color:#FFD700;">Set up new alerts →</a>
        </div>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
