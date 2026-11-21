// Turns a pasted recipe (any language) or a photo of one into a structured recipe in English and Dutch,
// with nutrition estimates for ingredients the site doesn't know yet. Also translates a typed recipe.
// Secret: META_API_KEY. Optional: META_MODEL (default muse-spark-1.3). Uses the same daily caps as receipts.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const UNITS = "g, kg, ml, l, lb, oz, cup, tbsp, tsp, clove, unit, piece, packet, portion, pinch";
const CATS = "mains, soups, salsas, sides, desserts, baking, drinks, other";
const SHAPE = `{
 "name": {"en": string, "nl": string},
 "intro": {"en": string, "nl": string},
 "category": one of [${CATS}],
 "servings": integer,
 "time": {"en": string, "nl": string} or null,
 "ingredients": [{
   "key": string,
   "name": {"en": string, "nl": string},
   "plural": {"en": string, "nl": string} or null,
   "amount": number,
   "unit": one of [${UNITS}],
   "note": {"en": string, "nl": string} or null,
   "nutrition": {"calories_per_100g": number, "protein_per_100g": number, "carbs_per_100g": number, "fat_per_100g": number, "grams_per_unit": number}
 }],
 "steps": {"en": [{"title": string, "text": string}], "nl": [{"title": string, "text": string}]}
}`;

function rules(known: string) {
  return `Rules:
- Keep the cook's amounts and wording. Don't invent ingredients or steps that aren't there. Tidy the text into clear, plain sentences.
- Write natural English and natural Dutch (informal "je"). Dutch uses metric words in prose (°C, cm), but keep the amounts and units as given.
- "amount" is a number (fractions as decimals). Use "unit" for countable things (2 onions), "clove" for garlic, "pinch" for a pinch. For vague amounts, estimate a real one and keep the cook's wording as the note: a splash of milk = 2 tbsp, a knob of butter = 1 tbsp, a handful of herbs = 0.25 cup. Only seasonings with no amount (e.g. "salt to taste") use amount 1, unit "pinch" and the note "to taste".
- "key": if the ingredient is one of these known ingredients, use that exact key: ${known || "(none)"}. Otherwise leave key as "".
- "nutrition": typical values per 100 g for the ingredient as bought, and "grams_per_unit" = grams in one of the chosen unit (e.g. 1 cup flour = 125, 1 onion = 110, 1 tbsp oil = 13.6, 1 g = 1).
- "intro": one short, neutral sentence describing the dish. No marketing language.
- "steps": short title plus the instruction text. Same number of steps in both languages.
- If you can't find a recipe in the input, return {"error": "no_recipe"}.
Reply with only JSON.`;
}

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

  let body: { mode?: string; text?: string; image?: string; mediaType?: string; recipe?: unknown; known?: string[] };
  try { body = await req.json(); } catch (_) { return json({ error: "bad_request" }, 400); }
  const mode = body.mode === "translate" ? "translate" : "parse";
  const text = String(body.text ?? "").slice(0, 12000);
  const image = String(body.image ?? "");
  const mediaType = /^image\/(jpeg|png|webp|gif)$/.test(body.mediaType ?? "") ? body.mediaType : "image/jpeg";
  const known = (Array.isArray(body.known) ? body.known : []).slice(0, 300).map(k => String(k).slice(0, 40)).join(", ");
  if (mode === "parse" && !text.trim() && !image) return json({ error: "bad_request" }, 400);
  if (image.length > 11_000_000) return json({ error: "bad_image" }, 400);
  if (mode === "translate" && (!body.recipe || JSON.stringify(body.recipe).length > 40000)) return json({ error: "bad_request" }, 400);

  // same daily caps as receipt scans
  const gate = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/claim_receipt_scan`, {
    method: "POST",
    headers: { "apikey": Deno.env.get("SUPABASE_ANON_KEY") ?? "", "Authorization": req.headers.get("Authorization") ?? "", "Content-Type": "application/json" },
    body: "{}",
  });
  const verdict = gate.ok ? await gate.json() : "gate_error";
  if (verdict !== "ok") return json({ error: verdict }, verdict === "gate_error" ? 503 : 429);

  const prompt = mode === "translate"
    ? `Here is a recipe in JSON where some English or Dutch text may be missing or only in one language. Fill in every missing "en" or "nl" field by translating from the other language, tidy the wording, and fill in any missing "nutrition" values. Keep amounts, units and keys exactly as they are. Return the full recipe in this shape:\n${SHAPE}\n${rules(known)}\n\nRecipe:\n${JSON.stringify(body.recipe)}`
    : `Read this recipe and return it in this JSON shape:\n${SHAPE}\n${rules(known)}${text.trim() ? `\n\nRecipe text:\n${text}` : "\n\nThe recipe is in the photo."}`;

  const content: unknown[] = [{ type: "text", text: prompt }];
  if (mode === "parse" && image) content.push({ type: "image_url", image_url: { url: `data:${mediaType};base64,${image}` } });

  const res = await fetch("https://api.meta.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: Deno.env.get("META_MODEL") || "muse-spark-1.3", messages: [{ role: "user", content }], response_format: { type: "json_object" }, temperature: 0.2 }),
  });
  if (!res.ok) {
    console.error("muse error", res.status, (await res.text()).slice(0, 500));
    return json({ error: res.status === 429 ? "rate_limited" : "upstream" }, res.status === 429 ? 429 : 502);
  }
  const out = await res.json();
  const raw = out?.choices?.[0]?.message?.content ?? "";
  const data = parseJson(typeof raw === "string" ? raw : JSON.stringify(raw));
  if (data?.error === "no_recipe") return json({ error: "no_recipe" }, 422);
  if (!data || !Array.isArray(data.ingredients) || !data.steps) {
    console.error("unparseable", String(raw).slice(0, 300));
    return json({ error: "invalid_json" }, 422);
  }
  return json(data);
});
