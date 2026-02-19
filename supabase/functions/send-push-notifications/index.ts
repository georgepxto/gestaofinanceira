// @ts-nocheck
// Supabase Edge Function: send-push-notifications
// Envia push notifications para gastos fixos vencendo hoje
//
// Deploy: supabase functions deploy send-push-notifications
// Test:   supabase functions invoke send-push-notifications

import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = "BBPXQ3DOHvYqTYLCTvNzu1jb58E4k0t62I2rempta3JWlWFwCoQ4CWqKMy_Wk3-qa-_z0TONIeXDsoE4vRU9WL4";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_EMAIL = "mailto:georgepxto@gmail.com"; // Pode trocar pelo seu email

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  try {
    // Autenticação via service_role key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const today = new Date();
    const diaHoje = today.getDate();

    console.log(`[Push] Verificando gastos fixos para dia ${diaHoje}...`);

    // Buscar todos os gastos fixos ativos com vencimento hoje
    const gastosRes = await fetch(
      `${supabaseUrl}/rest/v1/meus_gastos?categoria=eq.fixo&ativo=eq.true&dia_vencimento=eq.${diaHoje}&select=user_id,descricao,valor`,
      {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
      }
    );
    const gastos = await gastosRes.json();
    console.log(`[Push] Encontrados ${gastos.length} gastos fixos vencendo hoje`);

    if (gastos.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum gasto fixo vence hoje" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Agrupar gastos por user_id
    const gastosPorUsuario = new Map();
    for (const gasto of gastos) {
      if (!gastosPorUsuario.has(gasto.user_id)) {
        gastosPorUsuario.set(gasto.user_id, []);
      }
      gastosPorUsuario.get(gasto.user_id).push(gasto);
    }

    let totalEnviados = 0;
    let totalErros = 0;

    // Para cada usuário com gastos vencendo
    for (const [userId, userGastos] of gastosPorUsuario) {
      // Buscar subscriptions do usuário
      const subsRes = await fetch(
        `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${userId}&select=id,endpoint,p256dh,auth`,
        {
          headers: {
            "apikey": serviceRoleKey,
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
        }
      );
      const subscriptions = await subsRes.json();

      if (subscriptions.length === 0) continue;

      // Montar mensagem
      const totalValor = userGastos.reduce((acc: number, g: { valor: number }) => acc + g.valor, 0);
      const nomes = userGastos.map((g: { descricao: string }) => g.descricao).join(", ");

      const payload = JSON.stringify({
        title: "💰 Gastos Fixos - Dia de Pagamento!",
        body: userGastos.length === 1
          ? `${nomes} — R$ ${totalValor.toFixed(2).replace(".", ",")}`
          : `${userGastos.length} gastos vencem hoje (${nomes}) — Total: R$ ${totalValor.toFixed(2).replace(".", ",")}`,
        icon: "/favicon.svg",
        tag: `gastos-fixos-${diaHoje}`,
        url: "/eu",
      });

      // Enviar push para cada subscription do usuário
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );
          totalEnviados++;
        } catch (err: unknown) {
          const error = err as { statusCode?: number };
          console.error(`[Push] Erro ao enviar para ${sub.endpoint}:`, error);
          totalErros++;

          // Se subscription expirou (410 Gone ou 404), remover
          if (error.statusCode === 410 || error.statusCode === 404) {
            await fetch(
              `${supabaseUrl}/rest/v1/push_subscriptions?id=eq.${sub.id}`,
              {
                method: "DELETE",
                headers: {
                  "apikey": serviceRoleKey,
                  "Authorization": `Bearer ${serviceRoleKey}`,
                },
              }
            );
            console.log(`[Push] Subscription removida: ${sub.id}`);
          }
        }
      }
    }

    console.log(`[Push] Concluído: ${totalEnviados} enviados, ${totalErros} erros`);

    return new Response(
      JSON.stringify({
        message: `Push enviado: ${totalEnviados} sucesso, ${totalErros} erros`,
        gastosProcessados: gastos.length,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[Push] Erro geral:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
