import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin using their JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const { data: roles } = await anonClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin");
    if (!roles?.length) throw new Error("Admin access required");

    // Admin client with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { action, user_id } = await req.json();
    if (!user_id) throw new Error("user_id required");

    switch (action) {
      case "get_user_info": {
        const { data: { user }, error } = await adminClient.auth.admin.getUserById(user_id);
        if (error) throw error;
        const factors = user?.factors || [];
        return new Response(
          JSON.stringify({
            email: user?.email || null,
            phone: user?.phone || null,
            email_confirmed: !!user?.email_confirmed_at,
            mfa_enabled: factors.some((f: any) => f.status === "verified"),
            mfa_factors: factors.map((f: any) => ({
              id: f.id,
              type: f.factor_type,
              status: f.status,
              friendly_name: f.friendly_name,
            })),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reset_password": {
        const { data: { user }, error: getUserError } = await adminClient.auth.admin.getUserById(user_id);
        if (getUserError || !user?.email) throw new Error("User not found or no email");

        // Generate a password reset link
        const { data, error } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email: user.email,
          options: { redirectTo: `${supabaseUrl.replace('.supabase.co', '.supabase.co')}/auth/v1/callback` },
        });
        if (error) throw error;

        // Send the recovery email via SMTP
        const smtpRes = await fetch(`${supabaseUrl}/functions/v1/send-smtp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            to: user.email,
            subject: "Reset your password - Rebali Community",
            html: `
              <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
                <h2 style="color:#1a1a1a">Reset Your Password</h2>
                <p>An administrator has initiated a password reset for your account.</p>
                <p>Click the button below to set a new password:</p>
                <a href="${data?.properties?.action_link}" 
                   style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;margin:16px 0">
                  Reset Password
                </a>
                <p style="color:#666;font-size:13px">If you didn't request this, you can ignore this email.</p>
              </div>
            `,
          }),
        });

        if (!smtpRes.ok) {
          console.error("SMTP send failed:", await smtpRes.text());
          throw new Error("Failed to send reset email");
        }

        // Log admin action
        await adminClient.from("admin_logs").insert({
          admin_id: caller.id,
          action: "reset_password",
          target_type: "user",
          target_id: user_id,
          details: { email: user.email },
        });

        return new Response(
          JSON.stringify({ success: true, email: user.email }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "disable_mfa": {
        const { data: { user }, error: getUserError } = await adminClient.auth.admin.getUserById(user_id);
        if (getUserError || !user) throw new Error("User not found");

        const factors = user.factors || [];
        const verifiedFactors = factors.filter((f: any) => f.status === "verified");

        if (verifiedFactors.length === 0) {
          return new Response(
            JSON.stringify({ success: true, message: "No MFA factors to remove" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete all verified MFA factors
        for (const factor of verifiedFactors) {
          const { error } = await adminClient.auth.admin.deleteFactor({
            userId: user_id,
            id: factor.id,
          });
          if (error) console.error(`Failed to delete factor ${factor.id}:`, error);
        }

        // Log admin action
        await adminClient.from("admin_logs").insert({
          admin_id: caller.id,
          action: "disable_mfa",
          target_type: "user",
          target_id: user_id,
          details: { factors_removed: verifiedFactors.length },
        });

        return new Response(
          JSON.stringify({ success: true, factors_removed: verifiedFactors.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (err: any) {
    console.error("[admin-user-actions]", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
