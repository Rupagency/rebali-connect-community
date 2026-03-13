import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  importVapidKeys,
  buildPushMessage,
  type PushSubscription as WebPushSubscription,
} from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate: only allow calls with the service role key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { user_id, title, body, url, tag, data: notifData } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "Missing user_id or title" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all push subscriptions for this user
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
      // Check if this is a native push token (iOS/Android)
      if (sub.endpoint.startsWith("native://")) {
        const parts = sub.endpoint.replace("native://", "").split("/");
        const platform = parts[0];
        const deviceToken = parts.slice(1).join("/");

        try {
          const fcmResult = await sendFCM(deviceToken, title, body || "", notifData || {});
          if (fcmResult) sent++;
        } catch (err: any) {
          console.error(`Native push failed for ${platform}:`, err);
          if (err?.status === 404 || err?.status === 410) {
            staleIds.push(sub.id);
          }
        }
        continue;
      }

      // Web Push
      try {
        await sendWebPush(sub, webPayload);
        sent++;
      } catch (err: any) {
        console.error(`Web push failed for ${sub.endpoint}:`, err?.statusCode || err);
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          staleIds.push(sub.id);
        }
      }
    }

    // Clean up stale subscriptions
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

// ─── Web Push (VAPID + ECE) ─────────────────────────────────────

async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string
) {
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;

  // Import VAPID keys from base64url raw format to CryptoKey
  const vapidKeys = await importVapidKeys({
    publicKey: base64urlToArrayBuffer(vapidPublic),
    privateKey: base64urlToArrayBuffer(vapidPrivate),
  });

  const subscription: WebPushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  };

  const { headers, body, endpoint } = await buildPushMessage(
    vapidKeys,
    subscription,
    "mailto:contact@re-bali.com",
    new TextEncoder().encode(payload)
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    const error: any = new Error(`Web push failed: ${response.status} ${text}`);
    error.statusCode = response.status;
    throw error;
  }
  await response.text(); // consume body
}

function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ─── FCM v1 (native iOS/Android) ───────────────────────────────

async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const enc = (obj: any) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const unsignedToken = `${enc(header)}.${enc(payload)}`;

  const pemBody = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsignedToken}.${sig}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Failed to get access token: ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getCachedAccessToken(serviceAccount: any): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }
  const token = await getAccessToken(serviceAccount);
  cachedToken = { token, expiresAt: now + 3500_000 };
  return token;
}

async function sendFCM(
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<boolean> {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (!raw) {
    console.warn("[send-push] FCM_SERVICE_ACCOUNT not set, skipping native push");
    return false;
  }

  const serviceAccount = JSON.parse(raw);
  const accessToken = await getCachedAccessToken(serviceAccount);
  const projectId = serviceAccount.project_id;

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title, body },
          data,
          android: {
            notification: { sound: "default", channel_id: "default" },
          },
          apns: {
            payload: { aps: { sound: "default", badge: 1 } },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(`FCM v1 error ${response.status}:`, text);
    throw { status: response.status, message: text };
  }
  await response.text();
  return true;
}
