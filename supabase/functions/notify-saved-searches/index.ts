import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabase = createClient(supabaseUrl, serviceKey);

    const { listing_id, title, description, category, price, seller_id, extra_fields } = await req.json();

    if (!listing_id || !title) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract model/brand from extra_fields
    const extraText = extra_fields
      ? Object.values(extra_fields).filter((v): v is string => typeof v === "string").join(" ")
      : "";

    // Get all active saved searches
    const { data: savedSearches } = await supabase
      .from("saved_searches")
      .select("id, user_id, keyword")
      .eq("is_active", true);

    if (!savedSearches || savedSearches.length === 0) {
      return new Response(JSON.stringify({ ok: true, matched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchText = `${title} ${description} ${category} ${extraText}`.toLowerCase();
    let matchedCount = 0;

    for (const search of savedSearches) {
      if (search.user_id === seller_id) continue;

      const keywords = search.keyword.toLowerCase().split(/\s+/);
      const matches = keywords.every((kw: string) => searchText.includes(kw));
      if (!matches) continue;

      const { data: existing } = await supabase
        .from("search_notifications")
        .select("id")
        .eq("saved_search_id", search.id)
        .eq("listing_id", listing_id)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Check if user has access: Pro (vendeur_pro/agence) OR private with active_seller/expert_seller status
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", search.user_id)
        .single();

      if (userProfile?.user_type === "business") {
        // Pro users: check subscription tier
        const { data: proSub } = await supabase
          .from("pro_subscriptions")
          .select("plan_type")
          .eq("user_id", search.user_id)
          .eq("status", "active")
          .gt("expires_at", new Date().toISOString())
          .limit(1);
        const plan = proSub?.[0]?.plan_type;
        if (plan !== "vendeur_pro" && plan !== "agence") continue;
      } else {
        // Private users: need active_seller or expert_seller status
        const { data: statusAddon } = await supabase
          .from("user_addons")
          .select("id")
          .eq("user_id", search.user_id)
          .in("addon_type", ["active_seller", "expert_seller"])
          .eq("active", true)
          .gt("expires_at", new Date().toISOString())
          .limit(1);
        if (!statusAddon || statusAddon.length === 0) continue;
      }

      // Create in-app notification
      await supabase.from("search_notifications").insert({
        user_id: search.user_id,
        saved_search_id: search.id,
        listing_id: listing_id,
      });

      matchedCount++;

      // Send push notification
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: search.user_id,
            title: `🔔 "${search.keyword}"`,
            body: `${title} — ${new Intl.NumberFormat("id-ID").format(price)} IDR`,
            url: `/listing/${listing_id}`,
            tag: `search-${search.id}`,
            channel: "rebali_alerts",
          }),
        });
      } catch (pushErr) {
        console.error("Push notification error:", pushErr);
      }

    }

    console.log(`Matched ${matchedCount} saved searches for listing ${listing_id}`);

    return new Response(JSON.stringify({ ok: true, matched: matchedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-saved-searches error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});