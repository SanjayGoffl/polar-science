// Benchmarks free AI models with the keys in .env (keys are never printed).
//   npm run ai:check
import "dotenv/config";
const OR = process.env.OPENROUTER_API_KEY, GM = process.env.GEMINI_API_KEY;
const prompt = `Reply with ONE JSON object only: {"headline": string, "keyPoints": string[], "usedSections": string[]}. Use only this text.
<section number="1">The 40th Scientific Expedition to Antarctica returned to Cape Town on April 10, 2021, after a journey of ~12 thousand nautical miles in 94 days.</section>
<section number="2">The team reached Bharati on February 27, 2021, and Maitri on March 08, 2021.</section>`;
const valid = (t) => { try { const j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)); return Array.isArray(j.usedSections) && j.keyPoints?.length > 0; } catch { return false; } };
const report = (m, status, ms, ok, note) => console.log(`${m.padEnd(46)} ${String(status).padEnd(4)} ${String(ms).padStart(6)}ms  ${ok ? "valid JSON" : "INVALID   "}  ${note ?? ""}`);
if (!OR && !GM) console.log("No OPENROUTER_API_KEY or GEMINI_API_KEY in .env; the offline summariser will be used.");
if (OR) for (const m of (process.env.AI_CHECK_MODELS ?? "google/gemma-4-31b-it:free,nvidia/nemotron-3-super-120b-a12b:free,google/gemma-4-26b-a4b-it:free,openrouter/free").split(",")) {
  const t0 = Date.now();
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${OR}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: m, messages: [{ role: "user", content: prompt }], temperature: 0.3, max_tokens: 500, response_format: { type: "json_object" } }), signal: AbortSignal.timeout(60000) });
    const j = await r.json(); const txt = j.choices?.[0]?.message?.content ?? "";
    report(m, r.status, Date.now() - t0, valid(txt), j.error?.message);
  } catch (e) { report(m, "ERR", Date.now() - t0, false, e.message); }
}
if (GM) for (const m of (process.env.AI_CHECK_GEMINI ?? "gemini-flash-latest,gemini-flash-lite-latest").split(",")) {
  const t0 = Date.now();
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": GM }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 800, responseMimeType: "application/json" } }), signal: AbortSignal.timeout(60000) });
    const j = await r.json(); const txt = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    report(m, r.status, Date.now() - t0, valid(txt), j.error?.message);
  } catch (e) { report(m, "ERR", Date.now() - t0, false, e.message); }
}
