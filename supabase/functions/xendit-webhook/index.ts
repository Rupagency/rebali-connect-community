import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-callback-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRO_PLANS: Record<string, { durationDays: number; boosts: number }> = {
  vendeur_pro: { durationDays: 30, boosts: 5 },
  agence: { durationDays: 30, boosts: 10 },
};

const BOOST_PACKS: Record<string, { quantity: number }> = {
  boost_1: { quantity: 1 },
  boost_10: { quantity: 10 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const callbackToken = req.headers.get("x-callback-token");
    const expectedToken = Deno.env.get("XENDIT_SECRET_KEY");
    
    if (!callbackToken || !expectedToken || callbackToken !== expectedToken) {
      console.error("Invalid or missing callback token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("Xendit webhook received:", JSON.stringify(body));

    // --- Router: forward non-ReBali callbacks to Pass Bali ---
    const externalId = body.external_id || "";
    if (!externalId.startsWith("rebali_")) {
      console.log(`Routing to Pass Bali (external_id: ${externalId})`);
      const passBaliUrl = "https://vdlbezzgoxaoiumlsgpp.supabase.co/functions/v1/xendit-webhook";
      const forwardHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (callbackToken) forwardHeaders["x-callback-token"] = callbackToken;

      const fwdRes = await fetch(passBaliUrl, {
        method: "POST",
        headers: forwardHeaders,
        body: JSON.stringify(body),
      });
      const fwdBody = await fwdRes.text();
      console.log(`Pass Bali responded: ${fwdRes.status} ${fwdBody}`);
      return new Response(fwdBody, {
        status: fwdRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { id: xenditInvoiceId, status, paid_at } = body;

    if (!xenditInvoiceId || !status) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the invoice
    const { data: invoice, error: findError } = await supabase
      .from("payment_invoices")
      .select("*")
      .eq("xendit_invoice_id", xenditInvoiceId)
      .single();

    if (findError || !invoice) {
      console.error("Invoice not found:", xenditInvoiceId, findError);
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already processed
    if (invoice.status === "paid") {
      return new Response(JSON.stringify({ ok: true, message: "Already processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xenditStatus = status.toLowerCase();
    let dbStatus = "pending";
    if (xenditStatus === "paid" || xenditStatus === "settled") dbStatus = "paid";
    else if (xenditStatus === "expired") dbStatus = "expired";
    else if (xenditStatus === "failed") dbStatus = "failed";

    // Update invoice status
    await supabase
      .from("payment_invoices")
      .update({
        status: dbStatus,
        paid_at: dbStatus === "paid" ? (paid_at || new Date().toISOString()) : null,
        xendit_callback_data: body,
      })
      .eq("id", invoice.id);

    // If paid, fulfill the order
    if (dbStatus === "paid") {
      if (invoice.invoice_type === "points" && invoice.points_amount) {
        // Credit points to user
        const { data: existingPoints } = await supabase
          .from("user_points")
          .select("id, balance, total_earned")
          .eq("user_id", invoice.user_id)
          .maybeSingle();

        if (existingPoints) {
          await supabase
            .from("user_points")
            .update({
              balance: existingPoints.balance + invoice.points_amount,
              total_earned: existingPoints.total_earned + invoice.points_amount,
            })
            .eq("id", existingPoints.id);
        } else {
          await supabase.from("user_points").insert({
            user_id: invoice.user_id,
            balance: invoice.points_amount,
            total_earned: invoice.points_amount,
          });
        }

        // Log transaction
        await supabase.from("point_transactions").insert({
          user_id: invoice.user_id,
          amount: invoice.points_amount,
          type: "earned",
          reason: `purchase:${invoice.pack_id}`,
          metadata: { xendit_invoice_id: xenditInvoiceId, pack_id: invoice.pack_id },
        });

        console.log(`Credited ${invoice.points_amount} points to user ${invoice.user_id}`);

      } else if (invoice.invoice_type === "pro_subscription" && invoice.plan_type) {
        const plan = PRO_PLANS[invoice.plan_type];
        if (!plan) {
          console.error("Unknown plan type:", invoice.plan_type);
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
        const boostResetAt = new Date(expiresAt);

        // Deactivate any existing active subscription
        await supabase
          .from("pro_subscriptions")
          .update({ status: "replaced", cancelled_at: now.toISOString() })
          .eq("user_id", invoice.user_id)
          .eq("status", "active");

        // Create new subscription
        await supabase.from("pro_subscriptions").insert({
          user_id: invoice.user_id,
          plan_type: invoice.plan_type,
          status: "active",
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          price_idr: invoice.amount_idr,
          monthly_boosts_included: plan.boosts,
          monthly_boosts_used: 0,
          monthly_boosts_reset_at: boostResetAt.toISOString(),
          payment_method: "xendit",
          payment_reference: xenditInvoiceId,
        });

        // Ensure user_type is 'business'
        await supabase
          .from("profiles")
          .update({ user_type: "business" })
          .eq("id", invoice.user_id);

        console.log(`Activated Pro ${invoice.plan_type} for user ${invoice.user_id} until ${expiresAt.toISOString()}`);

      } else if (invoice.invoice_type === "pro_boosts" && invoice.pack_id) {
        const boostPack = BOOST_PACKS[invoice.pack_id];
        if (!boostPack) {
          console.error("Unknown boost pack:", invoice.pack_id);
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Add purchased boosts
        await supabase.from("pro_boost_purchases").insert({
          user_id: invoice.user_id,
          boosts_remaining: boostPack.quantity,
          amount_paid: invoice.amount_idr,
        });

        console.log(`Added ${boostPack.quantity} purchased boosts for user ${invoice.user_id}`);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
