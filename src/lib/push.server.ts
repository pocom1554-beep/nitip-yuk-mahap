import { buildPushPayload } from "@block65/webcrypto-web-push";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type Row = { id: string; endpoint: string; p256dh: string; auth: string };

/** Mengirim notifikasi web push ke daftar langganan perangkat. */
export async function sendPushToSubscriptions(rows: Row[], payload: PushPayload) {
  const vapid = {
    subject: process.env["VAPID_SUBJECT"] || "mailto:admin@nitipyuk.app",
    publicKey: process.env["VAPID_PUBLIC_KEY"],
    privateKey: process.env["VAPID_PRIVATE_KEY"],
  };
  if (!vapid.publicKey || !vapid.privateKey) return { sent: 0, stale: [] as string[] };

  const stale: string[] = [];
  let sent = 0;

  await Promise.all(
    rows.map(async (row) => {
      const subscription = {
        endpoint: row.endpoint,
        expirationTime: null,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      try {
        const init = await buildPushPayload({ data: payload, options: { ttl: 3600 } }, subscription, vapid);
        const res = await fetch(row.endpoint, init as RequestInit);
        if (res.status === 404 || res.status === 410) stale.push(row.id);
        else if (res.ok) sent += 1;
      } catch (err) {
        console.error("push gagal", err);
      }
    }),
  );

  return { sent, stale };
}
