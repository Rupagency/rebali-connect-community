const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TO_EMAIL = "contact@re-bali.com";

const SERVICE_LABELS: Record<string, string> = {
  ptPma: "PT PMA (Foreign Company)",
  kitas: "KITAS (Stay Permit)",
  workPermit: "Work Permit (IMTA)",
  consulting: "Business Consulting",
  taxAdvisory: "Tax Advisory",
  bankAccount: "Bank Account Opening",
  legalReview: "Legal Review",
  ptLocal: "PT Local (Indonesian Company)",
  cv: "CV (Commanditaire Vennootschap)",
  npwp: "NPWP Registration",
  siup: "SIUP / Business License",
  localConsulting: "Business Consulting",
  localLegal: "Legal Review",
};

const LOCATION_LABELS: Record<string, string> = {
  in_bali: "Already in Bali",
  planning: "Planning to move",
  remote: "Remote / Overseas",
};

const TIMELINE_LABELS: Record<string, string> = {
  urgent: "Urgent (within 2 weeks)",
  month: "Within 1 month",
  flexible: "Flexible / No rush",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      user_type, full_name, email, whatsapp, message, services,
      nationality, current_location, timeline, budget,
      business_type, city, user_id, language,
    } = body;

    if (!full_name || !email || !whatsapp || !services?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceList = (services as string[])
      .map((s: string) => SERVICE_LABELS[s] || s)
      .join(", ");

    const typeLabel = user_type === "foreigner" ? "🌍 Foreigner / Expat" : "🇮🇩 Indonesian Citizen";

    let extraRows = "";
    if (user_type === "foreigner") {
      if (nationality) extraRows += `<tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;">Nationality</td><td style="padding:8px 12px;">${nationality}</td></tr>`;
      if (current_location) extraRows += `<tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;">Location</td><td style="padding:8px 12px;">${LOCATION_LABELS[current_location] || current_location}</td></tr>`;
      if (timeline) extraRows += `<tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;">Timeline</td><td style="padding:8px 12px;">${TIMELINE_LABELS[timeline] || timeline}</td></tr>`;
      if (budget) extraRows += `<tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;">Budget</td><td style="padding:8px 12px;">$${budget} USD</td></tr>`;
    } else {
      if (business_type) extraRows += `<tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;">Business Type</td><td style="padding:8px 12px;">${business_type}</td></tr>`;
      if (city) extraRows += `<tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;">City</td><td style="padding:8px 12px;">${city}</td></tr>`;
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; border-bottom: 2px solid #0d9488; padding-bottom: 10px;">
          🏢 New Business Services Request
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold; width: 140px;">Type</td>
            <td style="padding: 8px 12px;">${typeLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold;">Name</td>
            <td style="padding: 8px 12px;">${full_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold;">Email</td>
            <td style="padding: 8px 12px;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold;">WhatsApp</td>
            <td style="padding: 8px 12px;">${whatsapp}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold;">Services</td>
            <td style="padding: 8px 12px; font-weight: bold; color: #0d9488;">${serviceList}</td>
          </tr>
          ${extraRows}
          <tr>
            <td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold;">Language</td>
            <td style="padding: 8px 12px;">${language || "en"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold;">User ID</td>
            <td style="padding: 8px 12px; font-family: monospace; font-size: 12px;">${user_id || "Not logged in"}</td>
          </tr>
        </table>
        ${message ? `<div style="background:#fafafa;border-left:4px solid #0d9488;padding:16px;margin:20px 0;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>` : ""}
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          Sent from Re-Bali Business Services Form
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
        subject: `[Business Services] ${typeLabel} — ${full_name} — ${serviceList}`,
        html: htmlBody,
        from_name: "Re-Bali Business",
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
    console.error("Business services form error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
