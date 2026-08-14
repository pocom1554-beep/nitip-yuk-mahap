import { useCallback, useEffect, useState } from "react";
import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
} from "@/lib/push.functions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export type PushState = "unsupported" | "denied" | "off" | "on";

/** Mengelola izin & langganan notifikasi perangkat (tetap jalan saat aplikasi ditutup). */
export function usePushNotifications(enabled: boolean) {
  const [state, setState] = useState<PushState>("off");
  const [busy, setBusy] = useState(false);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (!supported) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    void (async () => {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub && Notification.permission === "granted" ? "on" : "off");
      if (sub && enabled) {
        const json = sub.toJSON();
        await savePushSubscription({
          data: {
            endpoint: sub.endpoint,
            p256dh: json.keys?.["p256dh"] ?? "",
            auth: json.keys?.["auth"] ?? "",
          },
        }).catch(() => undefined);
      }
    })();
  }, [supported, enabled]);

  const subscribe = useCallback(async () => {
    if (!supported) return false;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return false;
      }
      const { publicKey } = await getVapidPublicKey();
      if (!publicKey) return false;
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      const json = sub.toJSON();
      await savePushSubscription({
        data: {
          endpoint: sub.endpoint,
          p256dh: json.keys?.["p256dh"] ?? "",
          auth: json.keys?.["auth"] ?? "",
        },
      });
      setState("on");
      return true;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription({ data: { endpoint: sub.endpoint } }).catch(() => undefined);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }, [supported]);

  return { state, busy, subscribe, unsubscribe };
}
