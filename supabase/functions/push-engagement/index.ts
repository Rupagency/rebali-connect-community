import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Daily engagement push notifications CRON job.
 * Sends:
 * 1. Profile completion reminders (unverified WhatsApp, account > 2 days)
 * 2. Inactive seller nudges (sellers with no listing in 14+ days)
 * 3. Welcome back nudges (users inactive for 7+ days)
 * 4. Listing views milestone alerts (50, 100, 200, 500 views)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const stats = { profile_incomplete: 0, inactive_seller: 0, welcome_back: 0, views_milestone: 0, daily_engagement: 0 };

    // Helper to call notify-event
    async function notifyEvent(event_type: string, user_id: string, data: Record<string, any> = {}) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/notify-event`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ event_type, user_id, data }),
        });
      } catch (e) {
        console.error(`notify ${event_type} failed for ${user_id}:`, e);
      }
    }

    // 1. Profile incomplete: WhatsApp not verified, account > 2 days old
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const { data: incompleteProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone_verified", false)
      .eq("is_banned", false)
      .lt("created_at", twoDaysAgo)
      .limit(50);

    // Only notify users who have push subscriptions
    if (incompleteProfiles && incompleteProfiles.length > 0) {
      const userIds = incompleteProfiles.map((p) => p.id);
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("user_id")
        .in("user_id", userIds);

      const subscribedIds = new Set((subs || []).map((s) => s.user_id));
      for (const uid of subscribedIds) {
        await notifyEvent("profile_incomplete", uid);
        stats.profile_incomplete++;
      }
    }

    // 2. Inactive sellers: had listings before but none active & last listing > 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: inactiveSellers } = await supabase
      .from("listings")
      .select("seller_id")
      .lt("created_at", fourteenDaysAgo)
      .limit(200);

    if (inactiveSellers && inactiveSellers.length > 0) {
      // Get unique seller IDs
      const sellerIds = [...new Set(inactiveSellers.map((l) => l.seller_id))];

      // Filter to those with NO active listings currently
      for (const sellerId of sellerIds.slice(0, 30)) {
        const { count } = await supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", sellerId)
          .eq("status", "active");

        if (count === 0) {
          // Check they have push subs
          const { data: hasSub } = await supabase
            .from("push_subscriptions")
            .select("id")
            .eq("user_id", sellerId)
            .limit(1);

          if (hasSub && hasSub.length > 0) {
            await notifyEvent("inactive_seller", sellerId);
            stats.inactive_seller++;
          }
        }
      }
    }

    // 3. Welcome back: users who haven't had any activity in 7+ days
    // Use analytics_events to detect last activity
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get users with push subs who signed up > 7 days ago
    const { data: potentialInactive } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_banned", false)
      .lt("created_at", sevenDaysAgo)
      .gt("created_at", thirtyDaysAgo)
      .limit(50);

    if (potentialInactive && potentialInactive.length > 0) {
      const pIds = potentialInactive.map((p) => p.id);
      const { data: pushUsers } = await supabase
        .from("push_subscriptions")
        .select("user_id")
        .in("user_id", pIds);

      const pushUserIds = [...new Set((pushUsers || []).map((s) => s.user_id))];

      for (const uid of pushUserIds.slice(0, 20)) {
        // Check if user had recent activity (messages sent in last 7 days)
        const { count: recentMsgs } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("sender_id", uid)
          .gt("created_at", sevenDaysAgo);

        if (recentMsgs === 0) {
          await notifyEvent("welcome_back", uid);
          stats.welcome_back++;
        }
      }
    }

    // 4. Listing views milestones (50, 100, 200, 500)
    const MILESTONES = [50, 100, 200, 500];
    for (const milestone of MILESTONES) {
      // Find listings that just crossed this milestone (within margin)
      const lowerBound = milestone;
      const upperBound = milestone + 10; // small window to catch daily
      const { data: milestoneListing } = await supabase
        .from("listings")
        .select("id, seller_id, title_original, views_count")
        .eq("status", "active")
        .gte("views_count", lowerBound)
        .lt("views_count", upperBound)
        .limit(10);

      for (const listing of milestoneListing || []) {
        const { data: hasSub } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", listing.seller_id)
          .limit(1);

        if (hasSub && hasSub.length > 0) {
          await notifyEvent("listing_views_milestone", listing.seller_id, {
            listing_title: listing.title_original,
            listing_id: listing.id,
            count: milestone,
          });
          stats.views_milestone++;
        }
      }
    }

    // 5. Daily engagement jingle notification — rotated message per day
    const DAILY_EVENTS = [
      "daily_discover",
      "daily_trending",
      "daily_sell_tip",
      "daily_community",
      "daily_deals_alert",
      "daily_bargain",
      "daily_safety",
    ];
    const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % DAILY_EVENTS.length;
    const todayEvent = DAILY_EVENTS[dayIndex];

    // Get all users with push subscriptions (excluding those already notified above)
    const { data: allPushUsers } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .limit(200);

    if (allPushUsers && allPushUsers.length > 0) {
      const uniqueUserIds = [...new Set(allPushUsers.map((s) => s.user_id))];

      // Filter to non-banned users
      const { data: activeProfiles } = await supabase
        .from("profiles")
        .select("id")
        .in("id", uniqueUserIds)
        .eq("is_banned", false);

      const activeIds = (activeProfiles || []).map((p) => p.id);

      for (const uid of activeIds.slice(0, 100)) {
        await notifyEvent(todayEvent, uid);
        stats.daily_engagement++;
      }
    }

    console.log(`push-engagement stats:`, JSON.stringify(stats));

    return new Response(JSON.stringify({ ok: true, ...stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("push-engagement error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
