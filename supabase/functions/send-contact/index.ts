const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TO_EMAIL = "contact@re-bali.com";

const CATEGORY_LABELS: Record<string, string> = {
  bug: "🐛 Bug technique",
  payment: "💳 Problème de paiement",
  blocked: "🔒 Compte bloqué",
  report: "🚨 Signalement utilisateur",
  suggestion: "💡 Suggestion",
  partnership: "🤝 Partenariat",
  other: "📩 Autre",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, subject, message, email, userId } = await req.json();

    if (!category || !subject || !message || !email) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const categoryLabel = CATEGORY_LABELS[category] || category;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">
          📬 Nouveau message de support
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold; width: 140px;">Catégorie</td>
            <td style="padding: 8px 12px;">${categoryLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold;">Email</td>
            <td style="padding: 8px 12px;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold;">User ID</td>
            <td style="padding: 8px 12px; font-family: monospace; font-size: 12px;">${userId || "Non connecté"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold;">Sujet</td>
            <td style="padding: 8px 12px;">${subject}</td>
          </tr>
        </table>
        <div style="background: #fafafa; border-left: 4px solid #0ea5e9; padding: 16px; margin: 20px 0; white-space: pre-wrap;">
          ${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          Envoyé depuis Re-Bali Contact Form
        </p>
      </div>
    `;

    // Call send-smtp function
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const smtpRes = await fetch(`${supabaseUrl}/functions/v1/send-smtp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        to: TO_EMAIL,
        reply_to: email,
        subject: `[${categoryLabel}] ${subject}`,
        html: htmlBody,
        from_name: "Re-Bali Support",
      }),
    });

    const data = await smtpRes.json();

    if (!smtpRes.ok) {
      console.error("SMTP send error:", data);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
