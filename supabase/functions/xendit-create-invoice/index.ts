import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POINT_PACKS: Record<string, { points: number; price: number }> = {
  starter: { points: 50, price: 25000 },
  popular: { points: 150, price: 59000 },
  pro: { points: 300, price: 99000 },
  business: { points: 650, price: 189000 },
};

const PRO_PLANS: Record<string, { price: number; label: string; boosts: number }> = {
  vendeur_pro: { price: 99000, label: "Vendeur Pro", boosts: 5 },
  agence: { price: 249000, label: "Agence / Business", boosts: 10 },
};

const BOOST_PACKS: Record<string, { quantity: number; price: number }> = {
  boost_1: { quantity: 1, price: 20000 },
  boost_10: { quantity: 10, price: 150000 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const XENDIT_SECRET_KEY = Deno.env.get("XENDIT_SECRET_KEY");
    if (!XENDIT_SECRET_KEY) {
      throw new Error("XENDIT_SECRET_KEY is not configured");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    const body = await req.json();
    const { type, pack_id, plan_type } = body;

    let amount: number;
    let description: string;
    let invoiceType: string;
    let pointsAmount: number | null = null;
    let successRedirect: string;
    const origin = req.headers.get("origin") || "https://rebali-connect-community.lovable.app";

    if (type === "points") {
      const pack = POINT_PACKS[pack_id];
      if (!pack) {
        return new Response(JSON.stringify({ error: "Invalid pack_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      amount = pack.price;
      pointsAmount = pack.points;
      description = `Re-Bali Points Pack: ${pack.points} points`;
      invoiceType = "points";
      successRedirect = `${origin}/points?payment=success`;
    } else if (type === "pro_subscription") {
      const plan = PRO_PLANS[plan_type];
      if (!plan) {
        return new Response(JSON.stringify({ error: "Invalid plan_type. Use vendeur_pro or agence" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      amount = plan.price;
      description = `Re-Bali Pro: ${plan.label} (30 jours)`;
      invoiceType = "pro_subscription";
      successRedirect = `${origin}/pro-subscription?payment=success`;
    } else if (type === "pro_boosts") {
      const boostPack = BOOST_PACKS[pack_id];
      if (!boostPack) {
        return new Response(JSON.stringify({ error: "Invalid pack_id. Use boost_1 or boost_10" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      amount = boostPack.price;
      description = `Re-Bali Boosts: ${boostPack.quantity} boost(s)`;
      invoiceType = "pro_boosts";
      successRedirect = `${origin}/dashboard?payment=success`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Xendit Invoice
    const xenditResponse = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(XENDIT_SECRET_KEY + ":")}`,
      },
      body: JSON.stringify({
        external_id: `rebali_${invoiceType}_${userId}_${Date.now()}`,
        amount,
        currency: "IDR",
        description,
        customer: { email: userEmail },
        success_redirect_url: successRedirect,
        failure_redirect_url: `${origin}/dashboard?payment=failed`,
        invoice_duration: 3600, // 1 hour
        payment_methods: [
          "BCA", "BNI", "BSI", "BRI", "MANDIRI", "PERMATA", "SAHABAT_SAMPOERNA",
          "OVO", "DANA", "SHOPEEPAY", "LINKAJA", "JENIUSPAY", "ASTRAPAY",
          "QRIS", "CREDIT_CARD",
        ],
      }),
    });

    const xenditData = await xenditResponse.json();
    if (!xenditResponse.ok) {
      console.error("Xendit API error:", xenditData);
      throw new Error(`Xendit API error [${xenditResponse.status}]: ${JSON.stringify(xenditData)}`);
    }

    // Save invoice to database using service role
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: insertError } = await supabaseAdmin
      .from("payment_invoices")
      .insert({
        user_id: userId,
        xendit_invoice_id: xenditData.id,
        xendit_invoice_url: xenditData.invoice_url,
        invoice_type: invoiceType,
        pack_id: type === "points" ? pack_id : (type === "pro_boosts" ? pack_id : null),
        plan_type: type === "pro_subscription" ? plan_type : null,
        amount_idr: amount,
        points_amount: pointsAmount,
        status: "pending",
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save invoice");
    }

    return new Response(
      JSON.stringify({
        invoice_url: xenditData.invoice_url,
        invoice_id: xenditData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error creating invoice:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
