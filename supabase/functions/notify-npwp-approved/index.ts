import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Approval messages per language with upsell
const MESSAGES: Record<string, { title: string; body: string; upsell: string }> = {
  en: {
    title: "✅ NPWP Verified!",
    body: "Congratulations! Your NPWP has been verified. Your Pro account is now active and you can start selling on Re-Bali.",
    upsell: "💡 Upgrade to Vendeur Pro or Agence for more listings, boosts and advanced analytics! Visit: https://re-bali.com/pro-subscription",
  },
  fr: {
    title: "✅ NPWP Vérifié !",
    body: "Félicitations ! Votre NPWP a été vérifié. Votre compte Pro est maintenant actif et vous pouvez commencer à vendre sur Re-Bali.",
    upsell: "💡 Passez au plan Vendeur Pro ou Agence pour plus d'annonces, de boosts et d'analyses avancées ! Rendez-vous sur : https://re-bali.com/pro-subscription",
  },
  id: {
    title: "✅ NPWP Terverifikasi!",
    body: "Selamat! NPWP Anda telah diverifikasi. Akun Pro Anda sekarang aktif dan Anda dapat mulai berjualan di Re-Bali.",
    upsell: "💡 Upgrade ke Vendeur Pro atau Agence untuk lebih banyak listing, boost, dan analitik lanjutan! Kunjungi: https://re-bali.com/pro-subscription",
  },
  es: {
    title: "✅ ¡NPWP Verificado!",
    body: "¡Felicidades! Tu NPWP ha sido verificado. Tu cuenta Pro está activa y puedes empezar a vender en Re-Bali.",
    upsell: "💡 ¡Actualiza a Vendeur Pro o Agence para más anuncios, boosts y análisis avanzados! Visita: https://re-bali.com/pro-subscription",
  },
  de: {
    title: "✅ NPWP Verifiziert!",
    body: "Herzlichen Glückwunsch! Ihr NPWP wurde verifiziert. Ihr Pro-Konto ist jetzt aktiv und Sie können auf Re-Bali verkaufen.",
    upsell: "💡 Upgraden Sie auf Vendeur Pro oder Agence für mehr Anzeigen, Boosts und erweiterte Analysen! Besuchen Sie: https://re-bali.com/pro-subscription",
  },
  nl: {
    title: "✅ NPWP Geverifieerd!",
    body: "Gefeliciteerd! Uw NPWP is geverifieerd. Uw Pro-account is nu actief en u kunt beginnen met verkopen op Re-Bali.",
    upsell: "💡 Upgrade naar Vendeur Pro of Agence voor meer advertenties, boosts en geavanceerde analyses! Bezoek: https://re-bali.com/pro-subscription",
  },
  ru: {
    title: "✅ NPWP Подтверждён!",
    body: "Поздравляем! Ваш NPWP подтверждён. Ваш Pro аккаунт активен, и вы можете начать продавать на Re-Bali.",
    upsell: "💡 Перейдите на Vendeur Pro или Agence для большего количества объявлений, бустов и продвинутой аналитики! Посетите: https://re-bali.com/pro-subscription",
  },
  zh: {
    title: "✅ NPWP 已验证！",
    body: "恭喜！您的NPWP已通过验证。您的Pro账户现已激活，您可以在Re-Bali上开始销售。",
    upsell: "💡 升级到Vendeur Pro或Agence，获得更多列表、推广和高级分析！访问：https://re-bali.com/pro-subscription",
  },
  tr: {
    title: "✅ NPWP Doğrulandı!",
    body: "Tebrikler! NPWP'niz doğrulandı. Pro hesabınız artık aktif ve Re-Bali'de satış yapabilirsiniz.",
    upsell: "💡 Daha fazla ilan, boost ve gelişmiş analitik için Vendeur Pro veya Agence'ye yükseltin! Ziyaret edin: https://re-bali.com/pro-subscription",
  },
  ar: {
    title: "✅ تم التحقق من NPWP!",
    body: "تهانينا! تم التحقق من NPWP الخاص بك. حسابك الاحترافي نشط الآن ويمكنك البدء بالبيع على Re-Bali.",
    upsell: "💡 قم بالترقية إلى Vendeur Pro أو Agence لمزيد من الإعلانات والتعزيزات والتحليلات المتقدمة! قم بزيارة: https://re-bali.com/pro-subscription",
  },
  hi: {
    title: "✅ NPWP सत्यापित!",
    body: "बधाई हो! आपका NPWP सत्यापित हो गया है। आपका Pro खाता अब सक्रिय है और आप Re-Bali पर बेचना शुरू कर सकते हैं।",
    upsell: "💡 अधिक लिस्टिंग, बूस्ट और उन्नत एनालिटिक्स के लिए Vendeur Pro या Agence में अपग्रेड करें! यहाँ जाएँ: https://re-bali.com/pro-subscription",
  },
  ja: {
    title: "✅ NPWP認証完了！",
    body: "おめでとうございます！NPWPが認証されました。Proアカウントが有効になり、Re-Baliで販売を開始できます。",
    upsell: "💡 Vendeur ProまたはAgenceにアップグレードして、より多くのリスト、ブースト、高度な分析を手に入れましょう！ https://re-bali.com/pro-subscription",
  },
};

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

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fonnte = Deno.env.get("FONNTE_TOKEN");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("whatsapp, preferred_lang, display_name, user_type")
      .eq("id", user_id)
      .single();

    if (!profile?.whatsapp || !fonnte) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "no_whatsapp" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = profile.preferred_lang || "en";
    const msg = MESSAGES[lang] || MESSAGES.en;

    // Check current subscription tier for personalized upsell
    const { data: sub } = await supabase
      .from("pro_subscriptions")
      .select("plan_type")
      .eq("user_id", user_id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Only show upsell if user is on free_pro (no paid subscription)
    const showUpsell = !sub;

    const waMessage = `${msg.title}

${msg.body}${showUpsell ? `

${msg.upsell}` : ""}`;

    const cleanTarget = profile.whatsapp.replace(/[^0-9]/g, "");
    const formData = new FormData();
    formData.append("target", cleanTarget);
    formData.append("message", waMessage);
    formData.append("countryCode", "0");

    const fonnteRes = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: fonnte },
      body: formData,
    });
    const fonnteResult = await fonnteRes.json();
    console.log("NPWP approval WA sent:", JSON.stringify(fonnteResult));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-npwp-approved error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
