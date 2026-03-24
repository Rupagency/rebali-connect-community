import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Pre-translated notification templates for all 12 languages
const TEMPLATES: Record<string, Record<string, { title: string; body: string }>> = {
  deal_closed: {
    en: { title: "Deal Closed 🤝", body: "The seller has closed the deal on \"{listing}\". Please confirm the transaction." },
    fr: { title: "Deal conclu 🤝", body: "Le vendeur a clôturé la transaction sur \"{listing}\". Veuillez confirmer." },
    id: { title: "Deal Ditutup 🤝", body: "Penjual telah menutup transaksi pada \"{listing}\". Silakan konfirmasi." },
    es: { title: "Trato cerrado 🤝", body: "El vendedor ha cerrado el trato en \"{listing}\". Por favor confirma." },
    de: { title: "Deal abgeschlossen 🤝", body: "Der Verkäufer hat den Deal für \"{listing}\" abgeschlossen. Bitte bestätigen." },
    nl: { title: "Deal gesloten 🤝", body: "De verkoper heeft de deal gesloten voor \"{listing}\". Bevestig alstublieft." },
    zh: { title: "交易关闭 🤝", body: "卖家已关闭\"{listing}\"的交易。请确认。" },
    ja: { title: "取引成立 🤝", body: "売り手が\"{listing}\"の取引を成立させました。確認してください。" },
    ru: { title: "Сделка закрыта 🤝", body: "Продавец закрыл сделку по \"{listing}\". Пожалуйста, подтвердите." },
    ar: { title: "تم إغلاق الصفقة 🤝", body: "أغلق البائع الصفقة على \"{listing}\". يرجى التأكيد." },
    hi: { title: "डील बंद 🤝", body: "विक्रेता ने \"{listing}\" पर डील बंद कर दी है। कृपया पुष्टि करें।" },
    tr: { title: "Anlaşma Kapandı 🤝", body: "Satıcı \"{listing}\" için anlaşmayı kapattı. Lütfen onaylayın." },
  },
  deal_confirmed: {
    en: { title: "Deal Confirmed ✅", body: "The buyer has confirmed the deal on \"{listing}\". You can now rate each other!" },
    fr: { title: "Deal confirmé ✅", body: "L'acheteur a confirmé la transaction sur \"{listing}\". Vous pouvez maintenant vous évaluer !" },
    id: { title: "Deal Dikonfirmasi ✅", body: "Pembeli telah mengkonfirmasi transaksi pada \"{listing}\". Anda bisa saling memberi rating!" },
    es: { title: "Trato confirmado ✅", body: "El comprador ha confirmado el trato en \"{listing}\". ¡Ahora pueden calificarse!" },
    de: { title: "Deal bestätigt ✅", body: "Der Käufer hat den Deal für \"{listing}\" bestätigt. Ihr könnt euch jetzt bewerten!" },
    nl: { title: "Deal bevestigd ✅", body: "De koper heeft de deal voor \"{listing}\" bevestigd. U kunt nu elkaars beoordeling geven!" },
    zh: { title: "交易确认 ✅", body: "买家已确认\"{listing}\"的交易。你们现在可以互相评价了！" },
    ja: { title: "取引確認 ✅", body: "買い手が\"{listing}\"の取引を確認しました。お互いに評価できます！" },
    ru: { title: "Сделка подтверждена ✅", body: "Покупатель подтвердил сделку по \"{listing}\". Теперь вы можете оценить друг друга!" },
    ar: { title: "تم تأكيد الصفقة ✅", body: "أكد المشتري الصفقة على \"{listing}\". يمكنكم الآن تقييم بعضكم!" },
    hi: { title: "डील पुष्टि ✅", body: "खरीदार ने \"{listing}\" पर डील की पुष्टि कर दी है। अब आप एक-दूसरे को रेट कर सकते हैं!" },
    tr: { title: "Anlaşma Onaylandı ✅", body: "Alıcı \"{listing}\" için anlaşmayı onayladı. Artık birbirinizi değerlendirebilirsiniz!" },
  },
  new_conversation: {
    en: { title: "New Inquiry 💬", body: "{sender} is interested in your listing \"{listing}\"" },
    fr: { title: "Nouvelle demande 💬", body: "{sender} est intéressé(e) par votre annonce \"{listing}\"" },
    id: { title: "Pertanyaan Baru 💬", body: "{sender} tertarik dengan iklan Anda \"{listing}\"" },
    es: { title: "Nueva consulta 💬", body: "{sender} está interesado en tu anuncio \"{listing}\"" },
    de: { title: "Neue Anfrage 💬", body: "{sender} interessiert sich für Ihre Anzeige \"{listing}\"" },
    nl: { title: "Nieuwe aanvraag 💬", body: "{sender} is geïnteresseerd in uw advertentie \"{listing}\"" },
    zh: { title: "新咨询 💬", body: "{sender}对您的\"{listing}\"感兴趣" },
    ja: { title: "新しいお問い合わせ 💬", body: "{sender}があなたの\"{listing}\"に興味を持っています" },
    ru: { title: "Новый запрос 💬", body: "{sender} заинтересован в вашем объявлении \"{listing}\"" },
    ar: { title: "استفسار جديد 💬", body: "{sender} مهتم بإعلانك \"{listing}\"" },
    hi: { title: "नई पूछताछ 💬", body: "{sender} आपकी लिस्टिंग \"{listing}\" में रुचि रखते हैं" },
    tr: { title: "Yeni Sorgu 💬", body: "{sender} ilanınız \"{listing}\" ile ilgileniyor" },
  },
  listing_expired: {
    en: { title: "Listing Expired ⏰", body: "Your listing \"{listing}\" has been archived after 30 days. Renew it to keep selling!" },
    fr: { title: "Annonce expirée ⏰", body: "Votre annonce \"{listing}\" a été archivée après 30 jours. Renouvelez-la !" },
    id: { title: "Iklan Kedaluwarsa ⏰", body: "Iklan Anda \"{listing}\" telah diarsipkan setelah 30 hari. Perbarui untuk terus berjualan!" },
    es: { title: "Anuncio expirado ⏰", body: "Tu anuncio \"{listing}\" fue archivado después de 30 días. ¡Renuévalo!" },
    de: { title: "Anzeige abgelaufen ⏰", body: "Ihre Anzeige \"{listing}\" wurde nach 30 Tagen archiviert. Erneuern Sie sie!" },
    nl: { title: "Advertentie verlopen ⏰", body: "Uw advertentie \"{listing}\" is gearchiveerd na 30 dagen. Vernieuw het!" },
    zh: { title: "列表已过期 ⏰", body: "您的\"{listing}\"已在30天后归档。续期以继续销售！" },
    ja: { title: "リスティング期限切れ ⏰", body: "\"{listing}\"は30日後にアーカイブされました。更新してください！" },
    ru: { title: "Объявление истекло ⏰", body: "Ваше объявление \"{listing}\" было архивировано через 30 дней. Обновите его!" },
    ar: { title: "انتهى الإعلان ⏰", body: "تم أرشفة إعلانك \"{listing}\" بعد 30 يومًا. جدده!" },
    hi: { title: "लिस्टिंग समाप्त ⏰", body: "आपकी लिस्टिंग \"{listing}\" 30 दिनों के बाद आर्काइव कर दी गई। इसे नवीनीकृत करें!" },
    tr: { title: "İlan Süresi Doldu ⏰", body: "\"{listing}\" ilanınız 30 gün sonra arşivlendi. Yenilemek için harekete geçin!" },
  },
  deal_expired: {
    en: { title: "Deal Auto-Closed ⏰", body: "The unconfirmed deal on \"{listing}\" has been automatically closed after 7 days." },
    fr: { title: "Deal auto-fermé ⏰", body: "La transaction non confirmée sur \"{listing}\" a été fermée automatiquement après 7 jours." },
    id: { title: "Deal Ditutup Otomatis ⏰", body: "Transaksi yang belum dikonfirmasi pada \"{listing}\" telah ditutup otomatis setelah 7 hari." },
    es: { title: "Trato cerrado automáticamente ⏰", body: "El trato no confirmado en \"{listing}\" fue cerrado automáticamente después de 7 días." },
    de: { title: "Deal auto-geschlossen ⏰", body: "Der unbestätigte Deal für \"{listing}\" wurde nach 7 Tagen automatisch geschlossen." },
    nl: { title: "Deal auto-gesloten ⏰", body: "De onbevestigde deal voor \"{listing}\" is automatisch gesloten na 7 dagen." },
    zh: { title: "交易自动关闭 ⏰", body: "\"{listing}\"的未确认交易已在7天后自动关闭。" },
    ja: { title: "取引自動終了 ⏰", body: "\"{listing}\"の未確認取引が7日後に自動的に終了しました。" },
    ru: { title: "Сделка автозакрыта ⏰", body: "Неподтвержденная сделка по \"{listing}\" была автоматически закрыта через 7 дней." },
    ar: { title: "تم إغلاق الصفقة تلقائيًا ⏰", body: "تم إغلاق الصفقة غير المؤكدة على \"{listing}\" تلقائيًا بعد 7 أيام." },
    hi: { title: "डील स्वत: बंद ⏰", body: "\"{listing}\" पर अपुष्ट डील 7 दिनों बाद स्वत: बंद हो गई।" },
    tr: { title: "Anlaşma Otomatik Kapatıldı ⏰", body: "\"{listing}\" üzerindeki onaylanmamış anlaşma 7 gün sonra otomatik olarak kapatıldı." },
  },
  deal_reminder: {
    en: { title: "Confirm Your Deal 🔔", body: "Don't forget to confirm the deal on \"{listing}\". The seller is waiting for your confirmation!" },
    fr: { title: "Confirmez votre deal 🔔", body: "N'oubliez pas de confirmer la transaction sur \"{listing}\". Le vendeur attend votre confirmation !" },
    id: { title: "Konfirmasi Deal Anda 🔔", body: "Jangan lupa konfirmasi transaksi pada \"{listing}\". Penjual menunggu konfirmasi Anda!" },
    es: { title: "Confirma tu trato 🔔", body: "No olvides confirmar el trato en \"{listing}\". ¡El vendedor espera tu confirmación!" },
    de: { title: "Deal bestätigen 🔔", body: "Vergessen Sie nicht, den Deal für \"{listing}\" zu bestätigen. Der Verkäufer wartet!" },
    nl: { title: "Bevestig uw deal 🔔", body: "Vergeet niet de deal voor \"{listing}\" te bevestigen. De verkoper wacht!" },
    zh: { title: "确认您的交易 🔔", body: "别忘了确认\"{listing}\"的交易。卖家正在等待您的确认！" },
    ja: { title: "取引を確認してください 🔔", body: "\"{listing}\"の取引を確認してください。売り手が確認を待っています！" },
    ru: { title: "Подтвердите сделку 🔔", body: "Не забудьте подтвердить сделку по \"{listing}\". Продавец ждет вашего подтверждения!" },
    ar: { title: "أكد صفقتك 🔔", body: "لا تنسَ تأكيد الصفقة على \"{listing}\". البائع ينتظر تأكيدك!" },
    hi: { title: "अपनी डील की पुष्टि करें 🔔", body: "\"{listing}\" पर डील की पुष्टि करना न भूलें। विक्रेता आपकी पुष्टि की प्रतीक्षा कर रहा है!" },
    tr: { title: "Anlaşmanızı Onaylayın 🔔", body: "\"{listing}\" için anlaşmayı onaylamayı unutmayın. Satıcı onayınızı bekliyor!" },
  },
  new_review: {
    en: { title: "New Review ⭐", body: "{sender} has left you a review. Check it out!" },
    fr: { title: "Nouvel avis ⭐", body: "{sender} vous a laissé un avis. Découvrez-le !" },
    id: { title: "Ulasan Baru ⭐", body: "{sender} telah memberi Anda ulasan. Lihat sekarang!" },
    es: { title: "Nueva reseña ⭐", body: "{sender} te ha dejado una reseña. ¡Mírala!" },
    de: { title: "Neue Bewertung ⭐", body: "{sender} hat Ihnen eine Bewertung hinterlassen. Schauen Sie nach!" },
    nl: { title: "Nieuwe beoordeling ⭐", body: "{sender} heeft u een beoordeling achtergelaten. Bekijk het!" },
    zh: { title: "新评价 ⭐", body: "{sender}给您留了一条评价。去看看吧！" },
    ja: { title: "新しいレビュー ⭐", body: "{sender}がレビューを残しました。確認してください！" },
    ru: { title: "Новый отзыв ⭐", body: "{sender} оставил(а) вам отзыв. Посмотрите!" },
    ar: { title: "تقييم جديد ⭐", body: "{sender} ترك لك تقييمًا. اطلع عليه!" },
    hi: { title: "नई समीक्षा ⭐", body: "{sender} ने आपके लिए एक समीक्षा छोड़ी है। देखें!" },
    tr: { title: "Yeni Değerlendirme ⭐", body: "{sender} size bir değerlendirme bıraktı. Kontrol edin!" },
  },
  whatsapp_verified: {
    en: { title: "WhatsApp Verified ✅", body: "Your WhatsApp number is now verified! You've unlocked full access to Re-Bali." },
    fr: { title: "WhatsApp vérifié ✅", body: "Votre numéro WhatsApp est maintenant vérifié ! Vous avez un accès complet à Re-Bali." },
    id: { title: "WhatsApp Terverifikasi ✅", body: "Nomor WhatsApp Anda sudah terverifikasi! Anda memiliki akses penuh ke Re-Bali." },
    es: { title: "WhatsApp verificado ✅", body: "¡Tu número de WhatsApp está verificado! Tienes acceso completo a Re-Bali." },
    de: { title: "WhatsApp verifiziert ✅", body: "Ihre WhatsApp-Nummer ist verifiziert! Sie haben vollen Zugang zu Re-Bali." },
    nl: { title: "WhatsApp geverifieerd ✅", body: "Uw WhatsApp-nummer is geverifieerd! U hebt volledige toegang tot Re-Bali." },
    zh: { title: "WhatsApp 已验证 ✅", body: "您的 WhatsApp 号码已验证！您已解锁 Re-Bali 的完整访问权限。" },
    ja: { title: "WhatsApp認証完了 ✅", body: "WhatsApp番号が認証されました！Re-Baliの全機能がご利用いただけます。" },
    ru: { title: "WhatsApp подтверждён ✅", body: "Ваш номер WhatsApp подтверждён! Вы получили полный доступ к Re-Bali." },
    ar: { title: "تم التحقق من WhatsApp ✅", body: "تم التحقق من رقم WhatsApp الخاص بك! لقد فتحت الوصول الكامل إلى Re-Bali." },
    hi: { title: "WhatsApp सत्यापित ✅", body: "आपका WhatsApp नंबर सत्यापित हो गया है! आपने Re-Bali तक पूर्ण पहुंच अनलॉक कर ली है।" },
    tr: { title: "WhatsApp Doğrulandı ✅", body: "WhatsApp numaranız doğrulandı! Re-Bali'ye tam erişim kazandınız." },
  },
  profile_incomplete: {
    en: { title: "Complete Your Profile 📝", body: "Verify your WhatsApp to unlock all features and start buying & selling on Re-Bali!" },
    fr: { title: "Complétez votre profil 📝", body: "Vérifiez votre WhatsApp pour débloquer toutes les fonctionnalités et acheter/vendre sur Re-Bali !" },
    id: { title: "Lengkapi Profil Anda 📝", body: "Verifikasi WhatsApp Anda untuk membuka semua fitur dan mulai jual beli di Re-Bali!" },
    es: { title: "Completa tu perfil 📝", body: "¡Verifica tu WhatsApp para desbloquear todas las funciones y comprar/vender en Re-Bali!" },
    de: { title: "Profil vervollständigen 📝", body: "Verifizieren Sie Ihre WhatsApp-Nummer, um alle Funktionen freizuschalten!" },
    nl: { title: "Voltooi uw profiel 📝", body: "Verifieer uw WhatsApp om alle functies te ontgrendelen en te kopen/verkopen op Re-Bali!" },
    zh: { title: "完善您的资料 📝", body: "验证您的 WhatsApp 以解锁所有功能，开始在 Re-Bali 上买卖！" },
    ja: { title: "プロフィールを完成させましょう 📝", body: "WhatsAppを認証して全機能をアンロックし、Re-Baliで売買を始めましょう！" },
    ru: { title: "Заполните профиль 📝", body: "Подтвердите WhatsApp, чтобы разблокировать все функции и начать покупать/продавать на Re-Bali!" },
    ar: { title: "أكمل ملفك الشخصي 📝", body: "تحقق من WhatsApp لفتح جميع الميزات والبدء في البيع والشراء على Re-Bali!" },
    hi: { title: "अपना प्रोफ़ाइल पूरा करें 📝", body: "सभी सुविधाएं अनलॉक करने के लिए अपना WhatsApp सत्यापित करें और Re-Bali पर खरीदारी/बिक्री शुरू करें!" },
    tr: { title: "Profilinizi Tamamlayın 📝", body: "Tüm özelliklerin kilidini açmak için WhatsApp'ınızı doğrulayın ve Re-Bali'de alışverişe başlayın!" },
  },
  inactive_seller: {
    en: { title: "Miss Your Sales? 🛒", body: "You haven't posted a new listing in a while. Re-Bali buyers are looking — post something today!" },
    fr: { title: "Vos ventes vous manquent ? 🛒", body: "Vous n'avez pas publié d'annonce depuis un moment. Les acheteurs Re-Bali cherchent — publiez aujourd'hui !" },
    id: { title: "Rindu Penjualan? 🛒", body: "Anda belum memposting iklan baru dalam beberapa waktu. Pembeli Re-Bali sedang mencari — posting sesuatu hari ini!" },
    es: { title: "¿Echas de menos vender? 🛒", body: "No has publicado un anuncio en un tiempo. ¡Los compradores de Re-Bali están buscando — publica algo hoy!" },
    de: { title: "Vermissen Sie Ihre Verkäufe? 🛒", body: "Sie haben schon lange keine Anzeige mehr geschaltet. Re-Bali-Käufer suchen — veröffentlichen Sie heute!" },
    nl: { title: "Mist u uw verkoop? 🛒", body: "U hebt al een tijdje geen advertentie geplaatst. Re-Bali-kopers zoeken — plaats er vandaag een!" },
    zh: { title: "想念您的销售吗？🛒", body: "您已经有一段时间没有发布新列表了。Re-Bali 买家正在寻找 — 今天就发布吧！" },
    ja: { title: "販売が恋しいですか？🛒", body: "しばらく新しいリスティングを投稿していません。Re-Baliの買い手が探しています — 今日投稿しましょう！" },
    ru: { title: "Скучаете по продажам? 🛒", body: "Вы давно не размещали объявления. Покупатели Re-Bali ищут — разместите что-нибудь сегодня!" },
    ar: { title: "هل تفتقد مبيعاتك؟ 🛒", body: "لم تنشر إعلانًا جديدًا منذ فترة. مشترو Re-Bali يبحثون — انشر شيئًا اليوم!" },
    hi: { title: "अपनी बिक्री याद आती है? 🛒", body: "आपने कुछ समय से कोई नई लिस्टिंग पोस्ट नहीं की है। Re-Bali खरीदार ढूंढ रहे हैं — आज कुछ पोस्ट करें!" },
    tr: { title: "Satışlarınızı Özlüyor musunuz? 🛒", body: "Bir süredir yeni ilan yayınlamadınız. Re-Bali alıcıları arıyor — bugün bir şey yayınlayın!" },
  },
  welcome_back: {
    en: { title: "We Miss You! 👋", body: "It's been a while since your last visit. Check out what's new on Re-Bali!" },
    fr: { title: "Vous nous manquez ! 👋", body: "Cela fait un moment. Découvrez les nouveautés sur Re-Bali !" },
    id: { title: "Kami Rindu Anda! 👋", body: "Sudah lama tidak berkunjung. Lihat yang baru di Re-Bali!" },
    es: { title: "¡Te echamos de menos! 👋", body: "Ha pasado un tiempo. ¡Descubre las novedades en Re-Bali!" },
    de: { title: "Wir vermissen Sie! 👋", body: "Es ist eine Weile her. Entdecken Sie die Neuigkeiten auf Re-Bali!" },
    nl: { title: "We missen u! 👋", body: "Het is een tijdje geleden. Bekijk de nieuwste items op Re-Bali!" },
    zh: { title: "我们想您了！👋", body: "好久不见了。来看看 Re-Bali 的新内容吧！" },
    ja: { title: "お久しぶりです！👋", body: "しばらくぶりですね。Re-Baliの最新情報をチェックしてください！" },
    ru: { title: "Мы скучаем! 👋", body: "Давно не заходили. Посмотрите новинки на Re-Bali!" },
    ar: { title: "نفتقدك! 👋", body: "مر وقت منذ زيارتك الأخيرة. اطلع على الجديد في Re-Bali!" },
    hi: { title: "हम आपको याद करते हैं! 👋", body: "आपकी आखिरी यात्रा के बाद से काफी समय हो गया है। Re-Bali पर नया क्या है देखें!" },
    tr: { title: "Sizi Özledik! 👋", body: "Son ziyaretinizden bu yana epey zaman geçti. Re-Bali'deki yeniliklere göz atın!" },
  },
  listing_views_milestone: {
    en: { title: "Your Listing is Popular! 🔥", body: "Your listing \"{listing}\" has reached {count} views! Keep the momentum going." },
    fr: { title: "Votre annonce est populaire ! 🔥", body: "Votre annonce \"{listing}\" a atteint {count} vues ! Continuez sur cette lancée." },
    id: { title: "Iklan Anda Populer! 🔥", body: "Iklan Anda \"{listing}\" telah mencapai {count} tampilan! Pertahankan momentum ini." },
    es: { title: "¡Tu anuncio es popular! 🔥", body: "Tu anuncio \"{listing}\" alcanzó {count} vistas. ¡Sigue así!" },
    de: { title: "Ihre Anzeige ist beliebt! 🔥", body: "Ihre Anzeige \"{listing}\" hat {count} Aufrufe erreicht! Weiter so." },
    nl: { title: "Uw advertentie is populair! 🔥", body: "Uw advertentie \"{listing}\" heeft {count} weergaven bereikt!" },
    zh: { title: "您的列表很受欢迎！🔥", body: "您的\"{listing}\"已达到 {count} 次浏览！继续保持。" },
    ja: { title: "リスティングが人気です！🔥", body: "\"{listing}\"が{count}回閲覧されました！この勢いを維持しましょう。" },
    ru: { title: "Ваше объявление популярно! 🔥", body: "Ваше объявление \"{listing}\" набрало {count} просмотров! Продолжайте в том же духе." },
    ar: { title: "إعلانك شائع! 🔥", body: "إعلانك \"{listing}\" وصل إلى {count} مشاهدة! استمر في الزخم." },
    hi: { title: "आपकी लिस्टिंग लोकप्रिय है! 🔥", body: "आपकी लिस्टिंग \"{listing}\" {count} व्यूज तक पहुंच गई है! गति बनाए रखें।" },
    tr: { title: "İlanınız Popüler! 🔥", body: "\"{listing}\" ilanınız {count} görüntülemeye ulaştı! Bu ivmeyi koruyun." },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { event_type, user_id, data } = await req.json();

    if (!event_type || !user_id) {
      return new Response(JSON.stringify({ error: "Missing event_type or user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const template = TEMPLATES[event_type];
    if (!template) {
      return new Response(JSON.stringify({ error: `Unknown event_type: ${event_type}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recipient's preferred language
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_lang")
      .eq("id", user_id)
      .single();

    const lang = profile?.preferred_lang || "en";
    const t = template[lang] || template["en"];

    // Replace placeholders
    let title = t.title;
    let body = t.body;
    if (data?.listing_title) {
      title = title.replace("{listing}", data.listing_title);
      body = body.replace("{listing}", data.listing_title);
    }
    if (data?.sender_name) {
      title = title.replace("{sender}", data.sender_name);
      body = body.replace("{sender}", data.sender_name);
    }
    if (data?.count) {
      title = title.replace("{count}", String(data.count));
      body = body.replace("{count}", String(data.count));
    }

    // Determine deep link URL
    let url = "/";
    if (data?.conversation_id) {
      url = `/messages?conv=${data.conversation_id}`;
    } else if (data?.listing_id) {
      url = `/listing/${data.listing_id}`;
    } else if (event_type === "listing_expired" || event_type === "inactive_seller") {
      url = "/my-listings";
    } else if (event_type === "profile_incomplete") {
      url = "/profile";
    } else if (event_type === "whatsapp_verified") {
      url = "/profile";
    } else if (event_type === "welcome_back") {
      url = "/browse";
    }

    // Call send-push
    const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        user_id,
        title,
        body,
        url,
        tag: `rebali_${event_type}`,
        channel: ["deal_closed", "deal_confirmed", "deal_expired", "new_conversation", "new_review", "listing_expired"].includes(event_type)
          ? "rebali_alerts"
          : ["deal_reminder", "welcome_back", "inactive_seller", "profile_incomplete"].includes(event_type)
          ? "rebali_reminders"
          : "rebali_default",
      }),
    });

    const pushResult = await pushRes.json();
    console.log(`notify-event [${event_type}] -> user ${user_id}: ${JSON.stringify(pushResult)}`);

    return new Response(JSON.stringify({ ok: true, ...pushResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-event error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
