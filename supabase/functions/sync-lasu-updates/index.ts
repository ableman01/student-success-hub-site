import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const sourceUrl = "https://www.lasu.edu.ng/home/news/ajax/index.php";
const sourceBase = "https://www.lasu.edu.ng/home/news/read.php?id=";

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return json({ error: "Use POST to sync official updates." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase service configuration is missing." }, 500);
  }

  try {
    const claimResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/claim_lasu_update_sync`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(10_000),
    });
    if (!claimResponse.ok) {
      console.error("Could not claim LASU sync window:", claimResponse.status, (await claimResponse.text()).slice(0, 300));
      return json({ error: "Could not start the official updates sync." }, 502);
    }
    if (await claimResponse.json() !== true) {
      return json({ ok: true, skipped: true, reason: "A LASU updates sync ran recently." });
    }

    const sourceResponse = await fetch(sourceUrl, {
      headers: { "User-Agent": "LASU Student Success Hub official updates checker" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!sourceResponse.ok) {
      return json({ error: `LASU news returned HTTP ${sourceResponse.status}.` }, 502);
    }

    const html = await sourceResponse.text();
    if (html.length > 1_000_000) {
      return json({ error: "LASU news response exceeded the expected size." }, 502);
    }

    const items = parseNewsCards(html);
    if (!items.length) {
      return json({ error: "No LASU news items could be read; existing updates were left unchanged." }, 502);
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/lasu_official_updates?on_conflict=source_key`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(items),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const details = (await response.text()).slice(0, 300);
      console.error("Could not save LASU updates:", response.status, details);
      return json({ error: "Could not save the latest LASU updates." }, 502);
    }

    return json({ ok: true, source: sourceUrl, synced: items.length, checkedAt: new Date().toISOString() });
  } catch (error) {
    console.error("LASU update sync failed:", error);
    return json({ error: "Could not check the LASU news page." }, 502);
  }
});

function parseNewsCards (html: string) {
  const cards = html.match(/<div class="single-latest-item">[\s\S]*?(?=<div class="single-latest-item">|$)/gi) ?? [];
  const seen = new Set<string>();
  const results = [];

  for (const card of cards) {
    const links = [...card.matchAll(/href=["'](?:\.\.\/news\/)?read\.php\?id=(\d+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    const articleLink = links.find(match => cleanText(match[2]).length > 12);
    if (!articleLink) continue;

    const sourceKey = articleLink[1];
    const title = cleanText(articleLink[2]).slice(0, 300);
    if (!sourceKey || seen.has(sourceKey) || !title) continue;
    seen.add(sourceKey);

    const dateMatch = card.match(/zmdi-calendar-check[^>]*><\/i>\s*([^<]+)/i);
    const dateText = cleanText(dateMatch?.[1] ?? "");
    const summaryMatch = card.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);

    results.push({
      source_key: sourceKey,
      title,
      summary: cleanText(summaryMatch?.[1] ?? "").slice(0, 500),
      category: categorize(title),
      official_url: `${sourceBase}${sourceKey}`,
      published_at: parseLasuDate(dateText),
      source_label: "LASU official website",
      last_seen_at: new Date().toISOString(),
    });
  }

  return results.slice(0, 25);
}

function cleanText (value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function categorize (title: string) {
  const text = title.toLowerCase();
  if (/scholarship|nelfund|loan application|internship|vacanc|job opportunit|fellowship|grant|opportunit/.test(text)) return "opportunity";
  if (/deadline|extension|closing date|last date|postpon|suspend/.test(text)) return "deadline";
  if (/registration|matric|screening|admission|clearance|course reg/.test(text)) return "registration";
  if (/academic calendar|examination|lecture|semester|resumption|result/.test(text)) return "academic";
  return "announcement";
}

function parseLasuDate (value: string) {
  const match = value.match(/^(\d{1,2})\s+([a-z]{3,9})\s+(\d{4}),?\s+(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!match) return null;

  const [, day, monthName, year, hourText, minute, meridiem] = match;
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const month = months[monthName.slice(0, 3).toLowerCase()];
  if (!month) return null;

  let hour = Number(hourText) % 12;
  if (meridiem.toLowerCase() === "pm") hour += 12;
  const paddedDay = day.padStart(2, "0");
  const paddedHour = String(hour).padStart(2, "0");
  const parsed = new Date(`${year}-${month}-${paddedDay}T${paddedHour}:${minute}:00+01:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function json (value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
