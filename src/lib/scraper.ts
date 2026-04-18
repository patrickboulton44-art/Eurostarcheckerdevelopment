export interface TimeSlot {
  slot: "morning" | "afternoon";
  earliest: string; // e.g. "06:01"
  latest: string; // e.g. "13:00"
  price: number | null; // pence
  available: boolean;
}

export interface DateAvailability {
  date: string; // YYYY-MM-DD
  price: number | null; // price in pence/cents (cheapest across slots)
  available: boolean;
  timeSlots: TimeSlot[];
}

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:134.0) Gecko/20100101 Firefox/134.0",
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function jitter(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  return new Promise((r) => setTimeout(r, delay));
}

function parseTimeSlots(outboundSlots: Array<{
  id?: string;
  departureWindow?: { earliest?: string; latest?: string };
  fare?: { price?: number } | null;
}>): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (const slot of outboundSlots) {
    const earliest = slot.departureWindow?.earliest || "";
    const latest = slot.departureWindow?.latest || "";
    // Extract time portion (format: "YYYY-MM-DD HH:MM")
    const earliestTime = earliest.includes(" ") ? earliest.split(" ")[1] : earliest;
    const latestTime = latest.includes(" ") ? latest.split(" ")[1] : latest;

    const hour = parseInt(earliestTime.split(":")[0] || "0");
    const slotName: "morning" | "afternoon" = hour < 13 ? "morning" : "afternoon";

    const hasFare = slot.fare && slot.fare.price !== undefined && slot.fare.price !== null;

    slots.push({
      slot: slotName,
      earliest: earliestTime,
      latest: latestTime,
      price: hasFare ? Math.round(slot.fare!.price! * 100) : null,
      available: !!hasFare,
    });
  }

  return slots;
}

// SSR page returns __NEXT_DATA__ with all availability — plain fetch, no headless browser needed
export async function checkAvailability(
  originCode: string,
  destCode: string,
  year: number,
  month: number // 1-indexed
): Promise<DateAvailability[]> {
  // Small jitter to look natural without hitting Vercel timeout
  await jitter(200, 1500);

  const targetDate = `${year}-${String(month).padStart(2, "0")}-15`;
  const searchUrl = `https://snap.eurostar.com/uk-en/search?origin=${originCode}&destination=${destCode}&outbound=${targetDate}&adult=1`;

  console.log(`[scraper] Fetching: ${searchUrl}`);

  const res = await fetch(searchUrl, {
    headers: {
      "User-Agent": randomUA(),
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-GB,en;q=0.9,fr;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    },
  });

  if (!res.ok) {
    console.log(`[scraper] HTTP ${res.status} for ${searchUrl}`);
    return [];
  }

  const html = await res.text();

  // Extract __NEXT_DATA__ JSON from the HTML
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
  if (!match) {
    console.log(`[scraper] No __NEXT_DATA__ found in HTML`);
    return [];
  }

  let nextData;
  try {
    nextData = JSON.parse(match[1]);
  } catch {
    console.log(`[scraper] Failed to parse __NEXT_DATA__`);
    return [];
  }

  const availabilityData: DateAvailability[] = [];
  const pageProps = nextData?.props?.pageProps;

  if (!pageProps) {
    console.log(`[scraper] No pageProps found`);
    return [];
  }

  // Parse time slots for the searched date
  const outboundSlots = pageProps.outboundTimeSlots || [];
  const searchDate = pageProps.searchValues?.outbound || targetDate;
  const timeSlots = parseTimeSlots(outboundSlots);

  // Structure: cheapestFares = { outboundCheapestFares: [...], inboundCheapestFares: [...] }
  const cheapestFares = pageProps.cheapestFares;
  if (cheapestFares?.outboundCheapestFares && Array.isArray(cheapestFares.outboundCheapestFares)) {
    for (const fare of cheapestFares.outboundCheapestFares) {
      if (fare.date && fare.price !== undefined && fare.price !== null) {
        // Attach time slots if this is the searched date
        const slotsForDate = fare.date === searchDate ? timeSlots : [];
        availabilityData.push({
          date: fare.date,
          price: Math.round(fare.price * 100),
          available: true,
          timeSlots: slotsForDate,
        });
      }
    }
  }

  // If time slots have fares but date wasn't in cheapestFares, add it
  const hasSlotFares = timeSlots.some(s => s.available);
  const alreadyHaveSearchDate = availabilityData.some(a => a.date === searchDate);
  if (hasSlotFares && !alreadyHaveSearchDate) {
    const cheapestSlot = timeSlots.filter(s => s.price !== null).sort((a, b) => a.price! - b.price!)[0];
    availabilityData.push({
      date: searchDate,
      price: cheapestSlot?.price || null,
      available: true,
      timeSlots,
    });
  }

  const slotsWithFares = outboundSlots.filter((s: { fare: unknown }) => s.fare !== null).length;
  console.log(`[scraper] ${originCode} → ${destCode} | ${searchDate} | dates: ${availabilityData.length} | slots: ${slotsWithFares} morning/afternoon`);

  return availabilityData;
}
