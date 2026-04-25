// @ts-nocheck
// Supabase Edge Function: collect-web-vitals
// Recebe LCP/INP/CLS do frontend e grava em web_vitals_metrics.
//
// Deploy: supabase functions deploy collect-web-vitals

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_METRICS = new Set(["LCP", "INP", "CLS"]);

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();

    const metric = String(payload?.metric || "").toUpperCase();
    const value = Number(payload?.value);
    const rating = String(payload?.rating || "");
    const pagePath = String(payload?.url || "");
    const metricId = String(payload?.id || "");
    const status = String(payload?.status || "");
    const target = payload?.target ?? null;
    const timestamp = payload?.timestamp ? new Date(payload.timestamp) : new Date();

    if (!ALLOWED_METRICS.has(metric)) {
      return new Response(JSON.stringify({ error: "Métrica inválida" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!isFiniteNumber(value)) {
      return new Response(JSON.stringify({ error: "Valor inválido" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!pagePath || pagePath.length > 300) {
      return new Response(JSON.stringify({ error: "URL inválida" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Ambiente Supabase não configurado" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const row = {
      metric,
      value,
      rating,
      page_path: pagePath,
      metric_id: metricId || null,
      target_value: isFiniteNumber(target) ? Number(target) : null,
      status: status || null,
      collected_at: timestamp.toISOString(),
      user_agent: req.headers.get("user-agent"),
      referer: req.headers.get("referer"),
      origin: req.headers.get("origin"),
    };

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/web_vitals_metrics`, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(row),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error("[collect-web-vitals] insert error", errText);
      return new Response(JSON.stringify({ error: "Falha ao gravar métrica" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[collect-web-vitals] unexpected error", err);
    return new Response(JSON.stringify({ error: "Erro inesperado" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
