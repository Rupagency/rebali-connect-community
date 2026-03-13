/**
 * Shared SMTP email sender via Hostinger (port 465 SSL).
 * Accepts: { to, subject, html, reply_to?, from_name? }
 * Uses secrets: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Minimal SMTP client using Deno TLS
async function sendSmtp(options: {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  fromName?: string;
  to: string | string[];
  replyTo?: string;
  subject: string;
  html: string;
}) {
  const { host, port, username, password, from, fromName, to, replyTo, subject, html } = options;
  const recipients = Array.isArray(to) ? to : [to];

  const conn = await Deno.connectTls({ hostname: host, port });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readLine(): Promise<string> {
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    if (n === null) throw new Error("Connection closed");
    return decoder.decode(buf.subarray(0, n));
  }

  async function send(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + "\r\n"));
    const resp = await readLine();
    return resp;
  }

  // Read server greeting
  await readLine();

  // EHLO
  await send(`EHLO localhost`);

  // AUTH LOGIN
  await send("AUTH LOGIN");
  await send(btoa(username));
  const authResp = await send(btoa(password));
  if (!authResp.startsWith("235")) {
    conn.close();
    throw new Error("SMTP auth failed: " + authResp);
  }

  // MAIL FROM
  await send(`MAIL FROM:<${from}>`);

  // RCPT TO
  for (const r of recipients) {
    await send(`RCPT TO:<${r}>`);
  }

  // DATA
  await send("DATA");

  // Build email with MIME
  const boundary = "----=_Part_" + crypto.randomUUID().replace(/-/g, "");
  const fromHeader = fromName ? `"${fromName}" <${from}>` : from;
  const toHeader = recipients.join(", ");

  const messageLines = [
    `From: ${fromHeader}`,
    `To: ${toHeader}`,
    replyTo ? `Reply-To: ${replyTo}` : "",
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${host}>`,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    "",
    btoa(unescape(encodeURIComponent(html))),
    "",
    `--${boundary}--`,
    ".",
  ].filter(Boolean);

  await conn.write(encoder.encode(messageLines.join("\r\n") + "\r\n"));

  const dataResp = await readLine();
  if (!dataResp.startsWith("250")) {
    conn.close();
    throw new Error("SMTP DATA failed: " + dataResp);
  }

  await send("QUIT");
  conn.close();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const host = Deno.env.get("SMTP_HOST")!;
    const port = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const username = Deno.env.get("SMTP_USER")!;
    const password = Deno.env.get("SMTP_PASS")!;

    if (!host || !username || !password) {
      throw new Error("SMTP credentials not configured");
    }

    const { to, subject, html, reply_to, from_name } = await req.json();

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing to, subject, or html" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sendSmtp({
      host,
      port,
      username,
      password,
      from: username,
      fromName: from_name || "Re-Bali",
      to,
      replyTo: reply_to,
      subject,
      html,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("SMTP send error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
