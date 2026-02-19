import { useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// VAPID Public Key - gerada para este projeto
const VAPID_PUBLIC_KEY = "BBPXQ3DOHvYqTYLCTvNzu1jb58E4k0t62I2rempta3JWlWFwCoQ4CWqKMy_Wk3-qa-_z0TONIeXDsoE4vRU9WL4";

/**
 * Converte a VAPID key de base64 URL para Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Hook para gerenciar push notifications.
 * - Registra o Service Worker
 * - Pede permissão de notificação
 * - Salva a subscription no Supabase
 */
export function useNotifications(userId: string | undefined) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!userId || initialized.current) return;
    if (!isSupabaseConfigured || !supabase) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("[Push] Browser não suporta push notifications");
      return;
    }

    initialized.current = true;

    const setup = async () => {
      try {
        // 1. Registrar Service Worker
        const registration = await navigator.serviceWorker.register("/sw.js");
        console.log("[Push] Service Worker registrado");

        // 2. Verificar/pedir permissão
        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
          console.log("[Push] Permissão de notificação negada");
          return;
        }

        // 3. Verificar se já existe subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          // 4. Criar nova subscription
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
          });
          console.log("[Push] Nova subscription criada");
        }

        // 5. Salvar no Supabase (upsert para evitar duplicatas)
        const subscriptionJSON = subscription.toJSON();
        const { error } = await supabase!
          .from("push_subscriptions")
          .upsert(
            {
              user_id: userId,
              endpoint: subscriptionJSON.endpoint,
              p256dh: subscriptionJSON.keys?.p256dh || "",
              auth: subscriptionJSON.keys?.auth || "",
            },
            { onConflict: "user_id,endpoint" }
          );

        if (error) {
          console.error("[Push] Erro ao salvar subscription:", error);
        } else {
          console.log("[Push] Subscription salva no Supabase");
        }
      } catch (err) {
        console.error("[Push] Erro ao configurar notificações:", err);
      }
    };

    setup();
  }, [userId]);
}
