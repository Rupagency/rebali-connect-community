import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find deals closed > 3 days ago, not confirmed, not auto-closed
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: pendingDeals, error } = await supabase
      .from("conversations")
      .select("id, buyer_id, listing_id, listings!conversations_listing_id_fkey(title_original)")
      .eq("deal_closed", true)
      .eq("buyer_confirmed", false)
      .neq("relay_status", "closed")
      .lt("deal_closed_at", threeDaysAgo)
      .gt("deal_closed_at", sevenDaysAgo);

    if (error) throw error;

    let reminded = 0;
    for (const deal of pendingDeals || []) {
      const listingTitle = (deal as any).listings?.title_original || "listing";

      // Send reminder push via notify-event
      await fetch(`${supabaseUrl}/functions/v1/notify-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          event_type: "deal_reminder",
          user_id: deal.buyer_id,
          data: {
            listing_title: listingTitle,
            conversation_id: deal.id,
          },
        }),
      }).catch((e) => console.error("remind push error:", e));

      reminded++;
    }

    console.log(`remind-deal-confirmation: sent ${reminded} reminders`);

    return new Response(JSON.stringify({ ok: true, reminded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("remind-deal-confirmation error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
