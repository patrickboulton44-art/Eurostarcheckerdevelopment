const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "alerts@eurosnap.app";
const FROM_NAME = "Eurosnap";

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function addBrevoContact(email: string, name?: string, tier?: string) {
  if (!BREVO_API_KEY) return;

  await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      attributes: {
        FIRSTNAME: name || "",
        TIER: tier || "free",
      },
      updateEnabled: true,
    }),
  });
}

export async function deleteBrevoContact(email: string) {
  if (!BREVO_API_KEY) return;

  await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
    method: "DELETE",
    headers: {
      "api-key": BREVO_API_KEY,
    },
  });
}

export async function sendEmail({ to, subject, html }: EmailParams) {
  if (!BREVO_API_KEY) {
    console.log(`[EMAIL MOCK] To: ${to}, Subject: ${subject}`);
    return;
  }

  if (process.env.STAGING === "true") {
    console.log(`[EMAIL STAGING SKIP] To: ${to}, Subject: ${subject}`);
    return;
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Brevo API error: ${res.status} ${error}`);
  }
}

export function buildConfirmationEmail(
  origin: string,
  destination: string,
  dateFrom: string,
  dateTo: string,
  passengers: number,
  unsubscribeToken: string,
  instantAccess: boolean = false
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://eurosnap.app";
  const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${unsubscribeToken}`;

  const fromStr = new Date(dateFrom).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const toStr = new Date(dateTo).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const cadenceLabel = instantAccess ? "Every 5 minutes" : "Every 90 minutes";

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
        <h1 style="margin:0 0 8px;font-size:28px;color:#ffffff;font-weight:bold;">You're all set.</h1>
        <p style="margin:0 0 32px;font-size:16px;color:#888888;">We'll email you when Snap dates open up.</p>

        <div style="background:#111111;border-radius:12px;padding:24px;margin-bottom:24px;">
          <table style="width:100%;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;color:#666666;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Route</td>
              <td style="padding:8px 0;color:#ffffff;font-size:16px;text-align:right;font-weight:600;">${origin} → ${destination}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666666;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Dates</td>
              <td style="padding:8px 0;color:#ffffff;font-size:16px;text-align:right;">${fromStr} – ${toStr}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666666;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Passengers</td>
              <td style="padding:8px 0;color:#ffffff;font-size:16px;text-align:right;">${passengers}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666666;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Checking</td>
              <td style="padding:8px 0;color:#ffffff;font-size:16px;text-align:right;">${cadenceLabel}</td>
            </tr>
          </table>
        </div>

        <p style="margin:0 0 32px;font-size:14px;color:#666666;line-height:1.5;">
          Eurostar Snap dates sell out fast. When availability opens for your route and dates, you'll get an email straight away so you can book before they're gone.
        </p>

        <p style="margin:0;font-size:12px;color:#444444;text-align:center;">
          <a href="${unsubscribeUrl}" style="color:#444444;">Unsubscribe</a>
        </p>
      </div>
    </body>
    </html>
  `;
}

export function buildAvailabilityEmail(
  origin: string,
  destination: string,
  dates: { date: string; price: number | null }[],
  unsubscribeToken: string,
  originCode?: string,
  destCode?: string,
  passengers?: number
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://eurosnap.app";
  const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${unsubscribeToken}`;

  const pax = passengers || 1;

  const dateRows = dates
    .map((d) => {
      const dateStr = new Date(d.date).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "long",
      });
      const priceStr = d.price ? `£${(d.price / 100).toFixed(2)}` : "Available";
      const dateBookUrl = originCode && destCode
        ? `https://snap.eurostar.com/uk-en/search?origin=${originCode}&destination=${destCode}&outbound=${d.date}&adult=${pax}`
        : "https://snap.eurostar.com/uk-en";
      return `<tr>
        <td style="padding:14px 16px;border-bottom:1px solid #222;font-size:15px;color:#ffffff;">${dateStr}</td>
        <td style="padding:14px 16px;border-bottom:1px solid #222;font-size:15px;font-weight:bold;color:#FFD700;">${priceStr}</td>
        <td style="padding:14px 12px;border-bottom:1px solid #222;text-align:right;">
          <a href="${dateBookUrl}" style="display:inline-block;background:#FFD700;color:#003366;padding:8px 16px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;white-space:nowrap;">Book Now</a>
        </td>
      </tr>`;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <p style="margin:0;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;"><span style="color:#ffffff;">Euro</span><span style="color:#FFCC00;">snap</span></p>
        </div>
        <div style="background:#003399;color:white;padding:28px;border-radius:16px 16px 0 0;text-align:center;">
          <h1 style="margin:0;font-size:26px;font-weight:bold;">Snap Dates Available!</h1>
          <p style="margin:8px 0 0;opacity:0.8;font-size:16px;">${origin} → ${destination}</p>
        </div>
        <div style="background:#111111;padding:24px;border-radius:0 0 16px 16px;">
          <p style="margin:0 0 16px;color:#999;font-size:14px;">New dates just opened up:</p>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="padding:10px 16px;text-align:left;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px;">Date</th>
                <th style="padding:10px 16px;text-align:left;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px;">Price</th>
                <th style="padding:10px 12px;"></th>
              </tr>
            </thead>
            <tbody>${dateRows}</tbody>
          </table>
          <p style="margin-top:16px;font-size:11px;color:#555;text-align:center;">
            Each button takes you directly to that date on Eurostar Snap
          </p>
          <p style="margin-top:24px;font-size:12px;color:#444;text-align:center;">
            <a href="${unsubscribeUrl}" style="color:#444;">Unsubscribe from these alerts</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
