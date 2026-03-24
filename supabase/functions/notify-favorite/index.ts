import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Pre-translated notification templates
const FAV_TEMPLATES: Record<string, { title: string; body: string }> = {
  en: { title: "❤️ New favorite!", body: "Someone saved your listing" },
  fr: { title: "❤️ Nouveau favori !", body: "Quelqu'un a sauvegardé votre annonce" },
  id: { title: "❤️ Favorit baru!", body: "Seseorang menyimpan iklan Anda" },
  es: { title: "❤️ ¡Nuevo favorito!", body: "Alguien guardó tu anuncio" },
  de: { title: "❤️ Neuer Favorit!", body: "Jemand hat Ihre Anzeige gespeichert" },
  nl: { title: "❤️ Nieuwe favoriet!", body: "Iemand heeft uw advertentie opgeslagen" },
  ru: { title: "❤️ Новое в избранном!", body: "Кто-то сохранил ваше объявление" },
  zh: { title: "❤️ 新收藏！", body: "有人收藏了您的广告" },
  tr: { title: "❤️ Yeni favori!", body: "Birisi ilanınızı kaydetti" },
  ar: { title: "❤️ مفضلة جديدة!", body: "قام شخص ما بحفظ إعلانك" },
  hi: { title: "❤️ नया पसंदीदा!", body: "किसी ने आपका विज्ञापन सहेजा" },
  ja: { title: "❤️ 新しいお気に入り！", body: "誰かがあなたの広告を保存しました" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { listing_id, user_id: favoriter_id } = await req.json();

    if (!listing_id) {
      return new Response(JSON.stringify({ error: "Missing listing_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get listing info + seller
    const { data: listing } = await supabase
      .from("listings")
      .select("id, title_original, seller_id")
      .eq("id", listing_id)
      .single();

    if (!listing) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "listing_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Don't notify if the seller favorited their own listing
    if (listing.seller_id === favoriter_id) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "self_favorite" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get seller's preferred language
    const { data: seller } = await supabase
      .from("profiles")
      .select("preferred_lang")
      .eq("id", listing.seller_id)
      .single();

    const lang = seller?.preferred_lang || "en";
    const tmpl = FAV_TEMPLATES[lang] || FAV_TEMPLATES.en;

    // Truncate listing title
    const title = listing.title_original.length > 40
      ? listing.title_original.substring(0, 40) + "…"
      : listing.title_original;

    // Send push notification via send-push
    const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        user_id: listing.seller_id,
        title: tmpl.title,
        body: `${tmpl.body}: "${title}"`,
        url: `/listing/${listing_id}`,
        tag: `fav-${listing_id}`,
        data: { type: "favorite", listing_id },
        channel: "rebali_alerts",
      }),
    });

    const pushResult = await pushRes.json();
    console.log(`[notify-favorite] listing=${listing_id} seller=${listing.seller_id}`, pushResult);

    return new Response(JSON.stringify({ ok: true, ...pushResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-favorite error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
