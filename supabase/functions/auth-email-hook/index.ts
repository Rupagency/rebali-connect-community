/**
 * Supabase Auth Email Hook
 * Intercepts all auth emails (signup, recovery, magic link, email change, invite)
 * and sends them via Hostinger SMTP with branded Re-Bali templates.
 *
 * Configure in Supabase Dashboard → Authentication → Hooks → Send Email Hook
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://re-bali.com";
const SITE_NAME = "Re-Bali";
const LOGO_URL = "https://re-bali.com/favicon.ico";

// ─── Shared email wrapper ───────────────────────────────────────────
function wrapHtml(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f1419;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">
  <div style="background:#1a2332;border-radius:16px;overflow:hidden;border:1px solid #2a3a4a;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0d9488,#14b8a6);padding:32px 32px 28px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
        🌴 ${SITE_NAME}
      </h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
        The trusted marketplace in Bali
      </p>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      <h2 style="margin:0 0 16px;color:#e8ecf0;font-size:22px;font-weight:600;">${title}</h2>
      ${content}
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;background:#151e29;border-top:1px solid #2a3a4a;text-align:center;">
      <p style="margin:0;color:#6b7b8d;font-size:12px;">
        © ${new Date().getFullYear()} ${SITE_NAME} · <a href="${SITE_URL}" style="color:#14b8a6;text-decoration:none;">re-bali.com</a>
      </p>
      <p style="margin:8px 0 0;color:#4a5568;font-size:11px;">
        This is an automated message. Please do not reply.
      </p>
    </div>
  </div>
</div>
</body>
</html>`;
}

function makeButton(url: string, label: string): string {
  return `<div style="text-align:center;margin:28px 0;">
  <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:600;font-size:16px;letter-spacing:0.3px;">
    ${label}
  </a>
</div>`;
}

function makeText(text: string): string {
  return `<p style="margin:0 0 16px;color:#b0bec5;font-size:15px;line-height:1.6;">${text}</p>`;
}

function makeFallback(url: string): string {
  return `<p style="margin:16px 0 0;color:#4a5568;font-size:12px;word-break:break-all;">
  If the button doesn't work, copy this link:<br>
  <a href="${url}" style="color:#14b8a6;text-decoration:none;">${url}</a>
</p>`;
}

// ─── Template builders ──────────────────────────────────────────────

function signupEmail(confirmUrl: string): { subject: string; html: string } {
  return {
    subject: `✅ Confirm your ${SITE_NAME} account`,
    html: wrapHtml("Confirm your email", [
      makeText("Welcome to Re-Bali! 🎉 You're one click away from joining the trusted marketplace for expats, locals and businesses in Bali."),
      makeText("Click the button below to verify your email address and activate your account:"),
      makeButton(confirmUrl, "Confirm my account"),
      makeText("This link expires in 24 hours. If you didn't create an account, you can safely ignore this email."),
      makeFallback(confirmUrl),
    ].join("")),
  };
}

function recoveryEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: `🔑 Reset your ${SITE_NAME} password`,
    html: wrapHtml("Reset your password", [
      makeText("We received a request to reset the password for your Re-Bali account."),
      makeText("Click the button below to set a new password:"),
      makeButton(resetUrl, "Reset my password"),
      makeText("This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your account is secure."),
      makeFallback(resetUrl),
    ].join("")),
  };
}


function reauthEmail(token: string): { subject: string; html: string } {
  return {
    subject: `🔐 Your ${SITE_NAME} verification code`,
    html: wrapHtml("Verification code", [
      makeText("Use the following code to verify your identity:"),
      `<div style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;background:#0f1419;border:2px solid #14b8a6;border-radius:12px;padding:16px 32px;font-size:32px;font-weight:700;letter-spacing:8px;color:#14b8a6;font-family:monospace;">
          ${token}
        </span>
      </div>`,
      makeText("This code expires in 5 minutes. If you didn't request this, please change your password immediately."),
    ].join("")),
  };
}

// ─── Main handler ───────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { user, email_data } = payload;

    if (!user?.email || !email_data) {
      return new Response(JSON.stringify({ error: "Invalid hook payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token, token_hash, redirect_to, email_action_type } = email_data;
    const recipientEmail = user.email;

    // Build confirmation URL based on action type
    const baseRedirect = redirect_to || SITE_URL;
    let confirmUrl = "";
    if (token_hash) {
      // Standard token_hash based confirmation URL
      const confirmType = email_action_type === "recovery" ? "recovery"
        : email_action_type === "email_change" ? "email_change"
        : email_action_type === "invite" ? "invite"
        : email_action_type === "magiclink" ? "magiclink"
        : "signup";
      confirmUrl = `${Deno.env.get("SUPABASE_URL")}/auth/v1/verify?token=${token_hash}&type=${confirmType}&redirect_to=${encodeURIComponent(baseRedirect)}`;
    }

    // Select template
    let emailContent: { subject: string; html: string };

    switch (email_action_type) {
      case "signup":
        emailContent = signupEmail(confirmUrl);
        break;
      case "recovery":
        emailContent = recoveryEmail(confirmUrl || `${SITE_URL}/reset-password`);
        break;
      case "magiclink":
      case "email_change":
      case "invite":
        // Not used — fall through to default (signup template as fallback)
        emailContent = signupEmail(confirmUrl);
        break;
      case "reauthentication":
        emailContent = reauthEmail(token || "000000");
        break;
      default:
        console.warn("Unknown email_action_type:", email_action_type);
        emailContent = signupEmail(confirmUrl);
    }

    // Send via SMTP
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const smtpRes = await fetch(`${supabaseUrl}/functions/v1/send-smtp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        to: recipientEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        from_name: SITE_NAME,
      }),
    });

    if (!smtpRes.ok) {
      const err = await smtpRes.text();
      console.error("SMTP send failed:", err);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Auth email sent: ${email_action_type} to ${recipientEmail}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("auth-email-hook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
