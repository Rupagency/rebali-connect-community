import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ApplicationServer,
  importVapidKeys,
  PushMessageError,
  type PushSubscription as WebPushSub,
} from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lazily cached ApplicationServer
let _appServer: ApplicationServer | null = null;

async function getAppServer(): Promise<ApplicationServer> {
  if (_appServer) return _appServer;

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;

  // Convert raw base64url VAPID keys to JWK for @negrel/webpush
  const pubBytes = base64urlDecode(vapidPublic);
  const privBytes = base64urlDecode(vapidPrivate);

  // P-256 uncompressed public key: 0x04 || x (32 bytes) || y (32 bytes)
  const x = base64urlEncode(pubBytes.slice(1, 33));
  const y = base64urlEncode(pubBytes.slice(33, 65));
  const d = base64urlEncode(privBytes);

  const vapidKeys = await importVapidKeys({
    publicKey: { kty: "EC", crv: "P-256", x, y, ext: true, key_ops: [] },
    privateKey: { kty: "EC", crv: "P-256", x, y, d, ext: true, key_ops: ["sign"] },
  });

  _appServer = await ApplicationServer.new({
    contactInformation: "mailto:contact@re-bali.com",
    vapidKeys,
  });

  return _appServer;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { user_id, title, body, url, tag, data: notifData, channel } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "Missing user_id or title" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no_subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webPayload = JSON.stringify({
      title,
      body: body || "",
      url: url || "/",
      tag: tag || "rebali",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
    });

    let sent = 0;
    const staleIds: string[] = [];

    for (const sub of subscriptions) {
      // Native push (iOS/Android via FCM)
      if (sub.endpoint.startsWith("native://")) {
        const parts = sub.endpoint.replace("native://", "").split("/");
        const platform = parts[0];
        const deviceToken = parts.slice(1).join("/");

        try {
          const ok = await sendFCM(deviceToken, title, body || "", notifData || {}, channel);
          if (ok) sent++;
        } catch (err: any) {
          console.error(`Native push failed (${platform}):`, err);
          if (err?.status === 404 || err?.status === 410) staleIds.push(sub.id);
        }
        continue;
      }

      // Web Push via @negrel/webpush
      try {
        const appServer = await getAppServer();
        const pushSub: WebPushSub = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };
        const subscriber = appServer.subscribe(pushSub);
        await subscriber.pushTextMessage(webPayload, {});
        sent++;
      } catch (err: any) {
        console.error(`Web push failed for ${sub.endpoint}:`, err);
        if (err instanceof PushMessageError && err.isGone()) {
          staleIds.push(sub.id);
        }
      }
    }

    if (staleIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", staleIds);
      console.log(`Cleaned ${staleIds.length} stale push subscriptions`);
    }

    console.log(`Push sent to ${sent}/${subscriptions.length} devices for user ${user_id}`);

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Helpers ────────────────────────────────────────────────────

function base64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ─── FCM v1 (native iOS/Android) ───────────────────────────────

async function getAccessToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: any) =>
    btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })}`;

  const pemBody = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8", binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)
  );

  const jwt = `${unsigned}.${btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) throw new Error(`Access token error: ${await res.text()}`);
  return (await res.json()).access_token;
}

let cachedToken: { token: string; exp: number } | null = null;

async function getCachedAccessToken(sa: any): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
  const token = await getAccessToken(sa);
  cachedToken = { token, exp: Date.now() + 3500_000 };
  return token;
}

async function sendFCM(
  deviceToken: string, title: string, body: string,
  data: Record<string, string> = {},
  channel?: string,
): Promise<boolean> {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (!raw) { console.warn("[send-push] FCM_SERVICE_ACCOUNT not set"); return false; }

  const sa = JSON.parse(raw);
  const accessToken = await getCachedAccessToken(sa);

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title, body },
          data,
          android: {
            notification: {
              sound: channel === "rebali_messages" ? "notif_message" : "default",
              channel_id: channel || "rebali_default",
            },
          },
          apns: { payload: { aps: { sound: channel === "rebali_messages" ? "notif_message.wav" : "default", badge: 1 } } },
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`FCM error ${res.status}:`, text);
    throw { status: res.status, message: text };
  }
  await res.text();
  return true;
}
