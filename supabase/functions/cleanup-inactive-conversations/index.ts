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
    const sb = createClient(supabaseUrl, serviceKey);

    // Find conversations where:
    // 1. NOT a completed deal (deal_closed AND buyer_confirmed)
    // 2. Last message (or conversation creation) is older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get all non-completed conversations updated more than 7 days ago
    const { data: staleConvs, error: fetchError } = await sb
      .from("conversations")
      .select("id, updated_at, deal_closed, buyer_confirmed")
      .lt("updated_at", sevenDaysAgo);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter out completed deals (keep them forever)
    const toDelete = (staleConvs || []).filter(
      (c: any) => !(c.deal_closed && c.buyer_confirmed)
    );

    if (toDelete.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = toDelete.map((c: any) => c.id);

    // Delete messages first (FK constraint)
    const { error: msgErr } = await sb
      .from("messages")
      .delete()
      .in("conversation_id", ids);

    if (msgErr) console.error("Messages delete error:", msgErr);

    // Delete the conversations
    const { error: convErr } = await sb
      .from("conversations")
      .delete()
      .in("id", ids);

    if (convErr) console.error("Conversations delete error:", convErr);

    console.log(`Cleaned up ${ids.length} inactive conversations`);

    return new Response(JSON.stringify({ deleted: ids.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("cleanup-inactive-conversations error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});