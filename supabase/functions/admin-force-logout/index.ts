// @ts-nocheck
// Supabase Edge Function: admin-force-logout
// Força logout de um usuário usando a Admin API do Supabase
//
// Deploy: supabase functions deploy admin-force-logout

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  try {
    const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Verificar que o chamador está autenticado
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers });
    }
    const callerToken = authHeader.replace("Bearer ", "");

    // 2. Buscar dados do usuário chamador pelo token dele
    const callerRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${callerToken}`,
      },
    });
    if (!callerRes.ok) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers });
    }
    const callerData = await callerRes.json();
    const callerId = callerData?.id;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Token inválido ou expirado" }), { status: 401, headers });
    }

    // 3. Verificar se o chamador é admin consultando user_roles com service role
    //    (service role bypassa RLS — leitura direta e confiável)
    const roleRes = await fetch(
      `${supabaseUrl}/rest/v1/user_roles?user_id=eq.${callerId}&select=role`,
      {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
      }
    );
    const roleData = await roleRes.json();
    const callerRole = roleData?.[0]?.role;

    if (callerRole !== "admin") {
      return new Response(
        JSON.stringify({ error: `Acesso negado: sua role é "${callerRole ?? "nenhuma"}", precisa ser "admin"` }),
        { status: 403, headers }
      );
    }

    // 4. Ler target_user_id do body
    const { target_user_id } = await req.json();
    if (!target_user_id) {
      return new Response(JSON.stringify({ error: "target_user_id é obrigatório" }), { status: 400, headers });
    }

    // 5. Buscar email do usuário alvo
    const userRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${target_user_id}`, {
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
    });
    const userData = await userRes.json();
    const targetEmail = userData?.email ?? null;

    if (!targetEmail) {
      return new Response(JSON.stringify({ error: "Usuário alvo não encontrado" }), { status: 404, headers });
    }

    // 6. Forçar logout via Admin API (invalida TODAS as sessões, todos os dispositivos)
    const logoutRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${target_user_id}/logout`, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scope: "global" }),
    });

    if (!logoutRes.ok) {
      const logoutErr = await logoutRes.text();
      console.error("[ForceLogout] Erro na Admin API:", logoutErr);
      return new Response(
        JSON.stringify({ error: `Falha ao invalidar sessão: ${logoutErr}` }),
        { status: 500, headers }
      );
    }

    // 7. Registrar no activity_logs
    await fetch(`${supabaseUrl}/rest/v1/activity_logs`, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        user_id: target_user_id,
        email: targetEmail,
        action: "forced_logout",
        details: { admin_id: callerId, scope: "global" },
      }),
    });

    console.log(`[ForceLogout] ✓ ${targetEmail} deslogado por admin ${callerId}`);

    return new Response(
      JSON.stringify({ success: true, email: targetEmail }),
      { status: 200, headers }
    );

  } catch (err) {
    console.error("[ForceLogout] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers });
  }
});

// FIM DO ARQUIVO — apenas um Deno.serve() é permitido
