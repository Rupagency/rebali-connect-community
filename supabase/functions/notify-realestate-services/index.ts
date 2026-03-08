import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Pre-translated WhatsApp messages for 12 languages
const WA_MESSAGES: Record<string, (link: string) => string> = {
  en: (l) => `🏠 *NEED HELP WITH YOUR REAL ESTATE PROJECT IN BALI?*

Whether you need to set up a *PT PMA*, get a *KITAS*, or simply get expert advice on buying property in Bali — we can help! 🌴

🏢 Company creation (PT / PT PMA)
📋 KITAS & work permits
💼 Business consulting
📜 Legal review & tax advisory

👉 Fill out our form and get a free consultation:
${l}

⚙️ _Automated message – please do not reply._`,

  fr: (l) => `🏠 *BESOIN D'AIDE POUR VOTRE PROJET IMMOBILIER À BALI ?*

Que vous ayez besoin de créer une *PT PMA*, obtenir un *KITAS*, ou simplement des conseils d'expert — nous pouvons vous aider ! 🌴

🏢 Création d'entreprise (PT / PT PMA)
📋 KITAS & permis de travail
💼 Consulting business
📜 Revue juridique & conseil fiscal

👉 Remplissez notre formulaire pour une consultation gratuite :
${l}

⚙️ _Message automatique – merci de ne pas répondre._`,

  id: (l) => `🏠 *BUTUH BANTUAN UNTUK PROYEK PROPERTI ANDA DI BALI?*

Apakah Anda perlu mendirikan *PT PMA*, mendapatkan *KITAS*, atau sekedar konsultasi ahli — kami siap membantu! 🌴

🏢 Pendirian perusahaan (PT / PT PMA)
📋 KITAS & izin kerja
💼 Konsultasi bisnis
📜 Tinjauan hukum & konsultasi pajak

👉 Isi formulir kami untuk konsultasi gratis:
${l}

⚙️ _Pesan otomatis – mohon jangan dibalas._`,

  es: (l) => `🏠 *¿NECESITA AYUDA CON SU PROYECTO INMOBILIARIO EN BALI?*

Ya sea que necesite crear una *PT PMA*, obtener un *KITAS*, o simplemente asesoramiento experto — ¡podemos ayudarle! 🌴

🏢 Creación de empresa (PT / PT PMA)
📋 KITAS y permisos de trabajo
💼 Consultoría empresarial
📜 Revisión legal y asesoría fiscal

👉 Complete nuestro formulario para una consulta gratuita:
${l}

⚙️ _Mensaje automático – por favor no responda._`,

  de: (l) => `🏠 *BRAUCHEN SIE HILFE BEI IHREM IMMOBILIENPROJEKT IN BALI?*

Ob Sie eine *PT PMA* gründen, ein *KITAS* erhalten oder einfach Expertenrat brauchen — wir helfen Ihnen! 🌴

🏢 Firmengründung (PT / PT PMA)
📋 KITAS & Arbeitserlaubnis
💼 Unternehmensberatung
📜 Rechtsberatung & Steuerberatung

👉 Füllen Sie unser Formular aus:
${l}

⚙️ _Automatische Nachricht – bitte nicht antworten._`,

  nl: (l) => `🏠 *HULP NODIG BIJ UW VASTGOEDPROJECT OP BALI?*

Of u nu een *PT PMA* wilt oprichten, een *KITAS* nodig heeft, of gewoon deskundig advies wilt — wij kunnen helpen! 🌴

🏢 Bedrijfsoprichting (PT / PT PMA)
📋 KITAS & werkvergunning
💼 Bedrijfsadvies
📜 Juridisch advies & fiscaal advies

👉 Vul ons formulier in:
${l}

⚙️ _Automatisch bericht – gelieve niet te antwoorden._`,

  ru: (l) => `🏠 *НУЖНА ПОМОЩЬ С ВАШИМ ПРОЕКТОМ НЕДВИЖИМОСТИ НА БАЛИ?*

Нужно ли вам создать *PT PMA*, получить *KITAS*, или просто получить экспертный совет — мы поможем! 🌴

🏢 Создание компании (PT / PT PMA)
📋 KITAS и разрешение на работу
💼 Бизнес-консалтинг
📜 Юридическая проверка & налоговый консалтинг

👉 Заполните нашу форму:
${l}

⚙️ _Автоматическое сообщение – пожалуйста, не отвечайте._`,

  zh: (l) => `🏠 *在巴厘岛的房产项目需要帮助吗？*

无论您需要设立 *PT PMA*、获取 *KITAS*，还是获取专家建议 — 我们都能帮助您！🌴

🏢 公司设立 (PT / PT PMA)
📋 KITAS 和工作许可
💼 商业咨询
📜 法律审查和税务咨询

👉 填写我们的表格获取免费咨询：
${l}

⚙️ _自动消息 – 请勿回复。_`,

  tr: (l) => `🏠 *BALİ'DEKİ GAYRİMENKUL PROJENİZ İÇİN YARDIMA MI İHTİYACINIZ VAR?*

*PT PMA* kurmak, *KITAS* almak veya uzman tavsiyesi almak istiyorsanız — size yardımcı olabiliriz! 🌴

🏢 Şirket kurulumu (PT / PT PMA)
📋 KITAS & çalışma izni
💼 İş danışmanlığı
📜 Hukuki inceleme & vergi danışmanlığı

👉 Formunuzu doldurun:
${l}

⚙️ _Otomatik mesaj – lütfen yanıtlamayın._`,

  ar: (l) => `🏠 *هل تحتاج مساعدة في مشروعك العقاري في بالي؟*

سواء كنت بحاجة لتأسيس *PT PMA*، أو الحصول على *KITAS*، أو مجرد نصيحة خبير — يمكننا المساعدة! 🌴

🏢 تأسيس شركة (PT / PT PMA)
📋 KITAS وتصريح عمل
💼 استشارات أعمال
📜 مراجعة قانونية واستشارات ضريبية

👉 املأ النموذج:
${l}

⚙️ _رسالة تلقائية – يرجى عدم الرد._`,

  hi: (l) => `🏠 *बाली में अपने रियल एस्टेट प्रोजेक्ट में मदद चाहिए?*

चाहे आपको *PT PMA* बनाना हो, *KITAS* प्राप्त करना हो, या विशेषज्ञ सलाह चाहिए — हम मदद कर सकते हैं! 🌴

🏢 कंपनी निर्माण (PT / PT PMA)
📋 KITAS और कार्य परमिट
💼 व्यापार परामर्श
📜 कानूनी समीक्षा और कर परामर्श

👉 हमारा फॉर्म भरें:
${l}

⚙️ _स्वचालित संदेश – कृपया उत्तर न दें।_`,

  ja: (l) => `🏠 *バリ島の不動産プロジェクトでお困りですか？*

*PT PMA*の設立、*KITAS*の取得、または専門家のアドバイスが必要な場合 — お手伝いします！🌴

🏢 会社設立 (PT / PT PMA)
📋 KITAS & 就労許可
💼 ビジネスコンサル
📜 法務レビュー & 税務相談

👉 フォームにご記入ください：
${l}

⚙️ _自動メッセージ – 返信不要です。_`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { buyer_id, conversation_id } = await req.json();

    if (!buyer_id) {
      return new Response(JSON.stringify({ error: "Missing buyer_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fonnte = Deno.env.get("FONNTE_TOKEN");
    const supabase = createClient(supabaseUrl, serviceKey);

    if (!fonnte) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "no_fonnte" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this buyer already has OTHER real estate conversations (not counting the current one)
    const { data: existingConvs } = await supabase
      .from("conversations")
      .select("id, listings!conversations_listing_id_fkey(category)")
      .eq("buyer_id", buyer_id)
      .neq("id", conversation_id || "00000000-0000-0000-0000-000000000000");

    const hasExistingRealEstate = existingConvs?.some(
      (c: any) => c.listings?.category === "immobilier"
    );

    if (hasExistingRealEstate) {
      console.log("Buyer already has previous real estate conversations, skipping promo");
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "not_first" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get buyer's WhatsApp and language
    const { data: buyer } = await supabase
      .from("profiles")
      .select("whatsapp, preferred_lang")
      .eq("id", buyer_id)
      .single();

    if (!buyer?.whatsapp) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "no_whatsapp" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = buyer.preferred_lang || "en";
    const link = "https://re-bali.com/business-services";
    const msgFn = WA_MESSAGES[lang] || WA_MESSAGES.en;

    const cleanTarget = buyer.whatsapp.replace(/[^0-9]/g, "");
    const formData = new FormData();
    formData.append("target", cleanTarget);
    formData.append("message", msgFn(link));
    formData.append("countryCode", "0");

    console.log("Sending real estate promo to:", cleanTarget, "lang:", lang);

    const fonnteRes = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: fonnte },
      body: formData,
    });
    const fonnteResult = await fonnteRes.json();
    console.log("Fonnte response:", JSON.stringify(fonnteResult));

    return new Response(JSON.stringify({ ok: true, sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-realestate-services error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
