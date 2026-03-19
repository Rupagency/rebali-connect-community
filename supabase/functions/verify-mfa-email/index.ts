import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller identity
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { code } = await req.json();
    if (!code || code.length !== 6) throw new Error("Invalid code format");

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Hash the provided code
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(code));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const codeHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Find matching valid code
    const now = new Date().toISOString();
    const { data: mfaCode, error: findError } = await adminClient
      .from("email_mfa_codes")
      .select("*")
      .eq("user_id", user.id)
      .eq("code_hash", codeHash)
      .eq("used", false)
      .gte("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (findError || !mfaCode) {
      // Increment attempts on the most recent unused code
      const { data: latestCode } = await adminClient
        .from("email_mfa_codes")
        .select("id, attempts")
        .eq("user_id", user.id)
        .eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestCode) {
        const newAttempts = (latestCode.attempts || 0) + 1;
        await adminClient
          .from("email_mfa_codes")
          .update({ attempts: newAttempts, used: newAttempts >= 5 })
          .eq("id", latestCode.id);

        if (newAttempts >= 5) {
          return new Response(JSON.stringify({ error: "max_attempts", verified: false }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ error: "invalid_code", verified: false }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark code as used
    await adminClient
      .from("email_mfa_codes")
      .update({ used: true })
      .eq("id", mfaCode.id);

    return new Response(JSON.stringify({ verified: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[verify-mfa-email]", err.message);
    return new Response(JSON.stringify({ error: err.message, verified: false }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
