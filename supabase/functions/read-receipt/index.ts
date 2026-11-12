// Reads a receipt photo with Meta's Muse Spark model and returns structured line items.
// Secret: META_API_KEY (set in Supabase). Optional: META_MODEL (default muse-spark-1.3).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const PROMPT = `You are reading a photo of a restaurant, bar or delivery receipt. Extract it exactly as printed.
Reply with only JSON in this shape:
{"merchant":string,"date":"YYYY-MM-DD" or "","items":[{"name":string,"quantity":number,"price":number}],"subtotal":number|null,"tax":number|null,"tip":number|null,"fees":[{"name":string,"amount":number}],"total":number|null}
Rules:
- "price" is the LINE TOTAL for that row (quantity x unit price), as printed.
- Put service charges, delivery fees, health mandates, kitchen fees and surcharges in "fees". Never put tax or tip there.
- Skip modifiers with no price, payment card lines and change due. Include discounts as items with a negative price.
- If a value is hard to read, make your best guess. Use null when a field is absent.`;

function parseJson(text: string) {
  try { return JSON.parse(text); } catch (_) { /* fall through */ }
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch (_) { /* fall through */ } }
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch (_) { /* fall through */ } }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const key = Deno.env.get("META_API_KEY");
  if (!key) return json({ error: "not_configured" }, 503);

  let body: { image?: string; mediaType?: string };
  try { body = await req.json(); } catch (_) { return json({ error: "bad_request" }, 400); }
  const image = body.image ?? "";
  const mediaType = /^image\/(jpeg|png|webp|gif)$/.test(body.mediaType ?? "") ? body.mediaType : "image/jpeg";
  if (!image || image.length > 11_000_000) return json({ error: "bad_image" }, 400);

  // Usage cap: checked in the database before every Muse call (limits live in public.scan_limits).
  const gate = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/claim_receipt_scan`, {
    method: "POST",
    headers: {
      "apikey": Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      "Authorization": req.headers.get("Authorization") ?? "",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const verdict = gate.ok ? await gate.json() : "gate_error";
  if (verdict !== "ok") {
    console.warn("scan blocked", verdict);
    return json({ error: verdict }, verdict === "gate_error" ? 503 : 429);
  }

  const res = await fetch("https://api.meta.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("META_MODEL") || "muse-spark-1.3",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${image}` } },
        ],
      }],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 500);
    console.error("muse error", res.status, detail);
    return json({ error: res.status === 429 ? "rate_limited" : "upstream", status: res.status }, res.status === 429 ? 429 : 502);
  }

  const out = await res.json();
  const text: string = out?.choices?.[0]?.message?.content ?? "";
  const data = parseJson(typeof text === "string" ? text : JSON.stringify(text));
  if (!data || !Array.isArray(data.items)) {
    console.error("unparseable", String(text).slice(0, 300));
    return json({ error: "invalid_json" }, 422);
  }
  return json(data);
});
