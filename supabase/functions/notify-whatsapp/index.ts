import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANG_MAP: Record<string, string> = {
  en: "en", id: "id", fr: "fr", es: "es", zh: "zh-CN", de: "de",
  nl: "nl", ru: "ru", tr: "tr", ar: "ar", hi: "hi", ja: "ja",
};

async function translateText(text: string, targetLang: string, sourceLang = "auto"): Promise<string> {
  if (sourceLang === targetLang) return text;
  try {
    const tl = LANG_MAP[targetLang] || targetLang;
    const sl = sourceLang === "auto" ? "auto" : (LANG_MAP[sourceLang] || sourceLang);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    return data?.[0]?.map((s: any) => s[0]).join("") || text;
  } catch {
    return text;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversation_id, sender_id, message_preview } = await req.json();

    if (!conversation_id || !sender_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get conversation with listing title
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, buyer_id, seller_id, listing_id, listings!conversations_listing_id_fkey(title_original)")
      .eq("id", conversation_id)
      .single();

    if (!conv) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine recipient
    const recipientId = conv.buyer_id === sender_id ? conv.seller_id : conv.buyer_id;

    // Get recipient's preferred language
    const { data: recipient } = await supabase
      .from("profiles")
      .select("display_name, preferred_lang")
      .eq("id", recipientId)
      .single();

    // Get sender name
    const { data: sender } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", sender_id)
      .single();

    const recipientLang = recipient?.preferred_lang || "en";
    const listingTitle = (conv as any).listings?.title_original || "an item";
    const senderName = sender?.display_name || "Someone";

    // Send push notification with translated preview
    try {
      const translatedBody = message_preview
        ? (await translateText(message_preview, recipientLang)).substring(0, 100)
        : listingTitle;

      await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          user_id: recipientId,
          title: `📩 ${senderName}`,
          body: translatedBody,
          url: `/messages?conv=${conversation_id}`,
          tag: `msg-${conversation_id}`,
          channel: "rebali_messages",
          data: { type: "message", conversation_id },
        }),
      });
    } catch (pushErr) {
      console.error("Push notification error:", pushErr);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-whatsapp error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
