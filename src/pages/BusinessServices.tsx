import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, Globe, User, Send, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    title: "Business & Relocation Services in Bali",
    subtitle: "Need help with company creation, KITAS visa, or expert consulting?",
    whoAreYou: "Who are you?",
    foreigner: "Foreigner / Expat",
    foreignerDesc: "PT PMA, KITAS, work permits, consulting",
    local: "Indonesian Citizen",
    localDesc: "PT Local, business consulting, permits",
    // Common fields
    fullName: "Full name",
    email: "Email",
    whatsapp: "WhatsApp number",
    message: "Tell us about your project",
    messagePlaceholder: "Describe your needs, timeline, budget...",
    submit: "Send my request",
    sending: "Sending...",
    success: "Request sent successfully!",
    successDesc: "Our team will contact you within 24 hours.",
    error: "Failed to send. Please try again.",
    // Foreign form
    foreignTitle: "Services for Foreigners & Expats",
    services: "Which services do you need?",
    ptPma: "PT PMA (Foreign Company)",
    kitas: "KITAS (Stay Permit)",
    workPermit: "Work Permit (IMTA)",
    consulting: "Business Consulting",
    taxAdvisory: "Tax Advisory",
    bankAccount: "Bank Account Opening",
    legalReview: "Legal Review",
    nationality: "Nationality",
    currentLocation: "Current location",
    inBali: "Already in Bali",
    planning: "Planning to move",
    remote: "Remote / Overseas",
    timeline: "When do you need this?",
    urgent: "Urgent (within 2 weeks)",
    month: "Within 1 month",
    flexible: "Flexible / No rush",
    budget: "Estimated budget (USD)",
    // Local form
    localTitle: "Services for Indonesian Citizens",
    ptLocal: "PT Local (Indonesian Company)",
    cv: "CV (Commanditaire Vennootschap)",
    npwp: "NPWP Registration",
    siup: "SIUP / Business License",
    localConsulting: "Business Consulting",
    localLegal: "Legal Review",
    businessType: "Type of business",
    city: "City / Area",
  },
  fr: {
    title: "Services Business & Relocation à Bali",
    subtitle: "Besoin d'aide pour la création d'entreprise, KITAS ou consulting ?",
    whoAreYou: "Qui êtes-vous ?",
    foreigner: "Étranger / Expat",
    foreignerDesc: "PT PMA, KITAS, permis de travail, consulting",
    local: "Citoyen Indonésien",
    localDesc: "PT Local, consulting, licences",
    fullName: "Nom complet",
    email: "Email",
    whatsapp: "Numéro WhatsApp",
    message: "Décrivez votre projet",
    messagePlaceholder: "Décrivez vos besoins, délais, budget...",
    submit: "Envoyer ma demande",
    sending: "Envoi...",
    success: "Demande envoyée avec succès !",
    successDesc: "Notre équipe vous contactera sous 24h.",
    error: "Échec de l'envoi. Réessayez.",
    foreignTitle: "Services pour Étrangers & Expats",
    services: "De quels services avez-vous besoin ?",
    ptPma: "PT PMA (Société Étrangère)",
    kitas: "KITAS (Permis de Séjour)",
    workPermit: "Permis de Travail (IMTA)",
    consulting: "Consulting Business",
    taxAdvisory: "Conseil Fiscal",
    bankAccount: "Ouverture Compte Bancaire",
    legalReview: "Revue Juridique",
    nationality: "Nationalité",
    currentLocation: "Localisation actuelle",
    inBali: "Déjà à Bali",
    planning: "Prévoit de s'installer",
    remote: "À distance / Étranger",
    timeline: "Quand en avez-vous besoin ?",
    urgent: "Urgent (sous 2 semaines)",
    month: "Sous 1 mois",
    flexible: "Flexible / Pas pressé",
    budget: "Budget estimé (USD)",
    localTitle: "Services pour Citoyens Indonésiens",
    ptLocal: "PT Local (Société Indonésienne)",
    cv: "CV (Commanditaire Vennootschap)",
    npwp: "Enregistrement NPWP",
    siup: "SIUP / Licence Commerciale",
    localConsulting: "Consulting Business",
    localLegal: "Revue Juridique",
    businessType: "Type d'activité",
    city: "Ville / Zone",
  },
  id: {
    title: "Layanan Bisnis & Relokasi di Bali",
    subtitle: "Butuh bantuan pembuatan perusahaan, KITAS, atau konsultasi?",
    whoAreYou: "Siapa Anda?",
    foreigner: "Warga Negara Asing / Expat",
    foreignerDesc: "PT PMA, KITAS, izin kerja, konsultasi",
    local: "Warga Negara Indonesia",
    localDesc: "PT Lokal, konsultasi bisnis, izin",
    fullName: "Nama lengkap",
    email: "Email",
    whatsapp: "Nomor WhatsApp",
    message: "Ceritakan proyek Anda",
    messagePlaceholder: "Jelaskan kebutuhan, waktu, anggaran...",
    submit: "Kirim permintaan saya",
    sending: "Mengirim...",
    success: "Permintaan berhasil dikirim!",
    successDesc: "Tim kami akan menghubungi Anda dalam 24 jam.",
    error: "Gagal mengirim. Silakan coba lagi.",
    foreignTitle: "Layanan untuk WNA & Expat",
    services: "Layanan apa yang Anda butuhkan?",
    ptPma: "PT PMA (Perusahaan Asing)",
    kitas: "KITAS (Izin Tinggal)",
    workPermit: "Izin Kerja (IMTA)",
    consulting: "Konsultasi Bisnis",
    taxAdvisory: "Konsultasi Pajak",
    bankAccount: "Pembukaan Rekening Bank",
    legalReview: "Tinjauan Hukum",
    nationality: "Kewarganegaraan",
    currentLocation: "Lokasi saat ini",
    inBali: "Sudah di Bali",
    planning: "Berencana pindah",
    remote: "Jarak jauh / Luar negeri",
    timeline: "Kapan Anda membutuhkan ini?",
    urgent: "Mendesak (dalam 2 minggu)",
    month: "Dalam 1 bulan",
    flexible: "Fleksibel / Tidak terburu-buru",
    budget: "Perkiraan anggaran (USD)",
    localTitle: "Layanan untuk WNI",
    ptLocal: "PT Lokal (Perusahaan Indonesia)",
    cv: "CV (Commanditaire Vennootschap)",
    npwp: "Pendaftaran NPWP",
    siup: "SIUP / Izin Usaha",
    localConsulting: "Konsultasi Bisnis",
    localLegal: "Tinjauan Hukum",
    businessType: "Jenis usaha",
    city: "Kota / Area",
  },
  es: {
    title: "Servicios Empresariales y Reubicación en Bali",
    subtitle: "¿Necesita ayuda con creación de empresas, KITAS o consultoría?",
    whoAreYou: "¿Quién eres?",
    foreigner: "Extranjero / Expat",
    foreignerDesc: "PT PMA, KITAS, permisos de trabajo, consultoría",
    local: "Ciudadano Indonesio",
    localDesc: "PT Local, consultoría, licencias",
    fullName: "Nombre completo", email: "Email", whatsapp: "Número WhatsApp",
    message: "Cuéntenos su proyecto", messagePlaceholder: "Describa sus necesidades...",
    submit: "Enviar mi solicitud", sending: "Enviando...",
    success: "¡Solicitud enviada!", successDesc: "Nuestro equipo le contactará en 24h.",
    error: "Error al enviar. Inténtelo de nuevo.",
    foreignTitle: "Servicios para Extranjeros", services: "¿Qué servicios necesita?",
    ptPma: "PT PMA", kitas: "KITAS", workPermit: "Permiso de Trabajo",
    consulting: "Consultoría", taxAdvisory: "Asesoría Fiscal",
    bankAccount: "Apertura Cuenta Bancaria", legalReview: "Revisión Legal",
    nationality: "Nacionalidad", currentLocation: "Ubicación actual",
    inBali: "Ya en Bali", planning: "Planea mudarse", remote: "Remoto",
    timeline: "¿Cuándo lo necesita?", urgent: "Urgente (2 semanas)",
    month: "En 1 mes", flexible: "Flexible", budget: "Presupuesto estimado (USD)",
    localTitle: "Servicios para Ciudadanos Indonesios",
    ptLocal: "PT Local", cv: "CV", npwp: "Registro NPWP", siup: "SIUP",
    localConsulting: "Consultoría", localLegal: "Revisión Legal",
    businessType: "Tipo de negocio", city: "Ciudad / Zona",
  },
  de: {
    title: "Business & Umzugsservices auf Bali",
    subtitle: "Brauchen Sie Hilfe bei Firmengründung, KITAS oder Beratung?",
    whoAreYou: "Wer sind Sie?",
    foreigner: "Ausländer / Expat", foreignerDesc: "PT PMA, KITAS, Arbeitserlaubnis, Beratung",
    local: "Indonesischer Staatsbürger", localDesc: "PT Lokal, Geschäftsberatung, Genehmigungen",
    fullName: "Vollständiger Name", email: "Email", whatsapp: "WhatsApp-Nummer",
    message: "Beschreiben Sie Ihr Projekt", messagePlaceholder: "Beschreiben Sie Ihre Bedürfnisse...",
    submit: "Anfrage senden", sending: "Wird gesendet...",
    success: "Anfrage erfolgreich gesendet!", successDesc: "Unser Team kontaktiert Sie innerhalb von 24h.",
    error: "Senden fehlgeschlagen.",
    foreignTitle: "Services für Ausländer & Expats", services: "Welche Services benötigen Sie?",
    ptPma: "PT PMA", kitas: "KITAS", workPermit: "Arbeitserlaubnis",
    consulting: "Unternehmensberatung", taxAdvisory: "Steuerberatung",
    bankAccount: "Kontoeröffnung", legalReview: "Rechtsberatung",
    nationality: "Nationalität", currentLocation: "Aktueller Standort",
    inBali: "Bereits in Bali", planning: "Umzug geplant", remote: "Remote",
    timeline: "Wann brauchen Sie das?", urgent: "Dringend (2 Wochen)",
    month: "Innerhalb 1 Monat", flexible: "Flexibel", budget: "Geschätztes Budget (USD)",
    localTitle: "Services für indonesische Staatsbürger",
    ptLocal: "PT Lokal", cv: "CV", npwp: "NPWP-Registrierung", siup: "SIUP",
    localConsulting: "Geschäftsberatung", localLegal: "Rechtsberatung",
    businessType: "Geschäftsart", city: "Stadt / Gebiet",
  },
  nl: {
    title: "Business & Relocatie Services op Bali",
    subtitle: "Hulp nodig bij bedrijfsoprichting, KITAS of consulting?",
    whoAreYou: "Wie bent u?",
    foreigner: "Buitenlander / Expat", foreignerDesc: "PT PMA, KITAS, werkvergunning, consulting",
    local: "Indonesisch Staatsburger", localDesc: "PT Lokaal, bedrijfsadvies, vergunningen",
    fullName: "Volledige naam", email: "Email", whatsapp: "WhatsApp-nummer",
    message: "Vertel over uw project", messagePlaceholder: "Beschrijf uw behoeften...",
    submit: "Aanvraag verzenden", sending: "Verzenden...",
    success: "Aanvraag verzonden!", successDesc: "Ons team neemt binnen 24u contact op.",
    error: "Verzenden mislukt.",
    foreignTitle: "Services voor Buitenlanders", services: "Welke services heeft u nodig?",
    ptPma: "PT PMA", kitas: "KITAS", workPermit: "Werkvergunning",
    consulting: "Bedrijfsadvies", taxAdvisory: "Fiscaal Advies",
    bankAccount: "Bankrekening openen", legalReview: "Juridisch Advies",
    nationality: "Nationaliteit", currentLocation: "Huidige locatie",
    inBali: "Al in Bali", planning: "Van plan te verhuizen", remote: "Op afstand",
    timeline: "Wanneer heeft u dit nodig?", urgent: "Dringend (2 weken)",
    month: "Binnen 1 maand", flexible: "Flexibel", budget: "Geschat budget (USD)",
    localTitle: "Services voor Indonesische Staatsburgers",
    ptLocal: "PT Lokaal", cv: "CV", npwp: "NPWP Registratie", siup: "SIUP",
    localConsulting: "Bedrijfsadvies", localLegal: "Juridisch Advies",
    businessType: "Bedrijfstype", city: "Stad / Gebied",
  },
  ru: {
    title: "Бизнес и релокация на Бали",
    subtitle: "Нужна помощь с созданием компании, KITAS или консалтинг?",
    whoAreYou: "Кто вы?",
    foreigner: "Иностранец / Экспат", foreignerDesc: "PT PMA, KITAS, разрешение на работу",
    local: "Гражданин Индонезии", localDesc: "PT Local, бизнес-консалтинг",
    fullName: "Полное имя", email: "Email", whatsapp: "Номер WhatsApp",
    message: "Расскажите о вашем проекте", messagePlaceholder: "Опишите ваши потребности...",
    submit: "Отправить запрос", sending: "Отправка...",
    success: "Запрос отправлен!", successDesc: "Наша команда свяжется с вами в течение 24ч.",
    error: "Ошибка отправки.",
    foreignTitle: "Услуги для иностранцев", services: "Какие услуги вам нужны?",
    ptPma: "PT PMA", kitas: "KITAS", workPermit: "Разрешение на работу",
    consulting: "Бизнес-консалтинг", taxAdvisory: "Налоговый консалтинг",
    bankAccount: "Открытие счёта", legalReview: "Юридическая проверка",
    nationality: "Гражданство", currentLocation: "Текущее расположение",
    inBali: "Уже на Бали", planning: "Планирую переезд", remote: "Удалённо",
    timeline: "Когда это нужно?", urgent: "Срочно (2 недели)",
    month: "В течение 1 месяца", flexible: "Гибко", budget: "Примерный бюджет (USD)",
    localTitle: "Услуги для граждан Индонезии",
    ptLocal: "PT Local", cv: "CV", npwp: "Регистрация NPWP", siup: "SIUP",
    localConsulting: "Бизнес-консалтинг", localLegal: "Юридическая проверка",
    businessType: "Тип бизнеса", city: "Город / Район",
  },
  zh: {
    title: "巴厘岛商业与搬迁服务",
    subtitle: "需要公司注册、KITAS签证或咨询帮助？",
    whoAreYou: "您是谁？",
    foreigner: "外国人 / 外派", foreignerDesc: "PT PMA, KITAS, 工作许可, 咨询",
    local: "印尼公民", localDesc: "PT本地, 商业咨询, 许可证",
    fullName: "全名", email: "电子邮件", whatsapp: "WhatsApp号码",
    message: "描述您的项目", messagePlaceholder: "描述您的需求...",
    submit: "发送请求", sending: "发送中...",
    success: "请求已发送!", successDesc: "我们的团队将在24小时内联系您。",
    error: "发送失败。",
    foreignTitle: "外国人服务", services: "您需要哪些服务？",
    ptPma: "PT PMA", kitas: "KITAS", workPermit: "工作许可",
    consulting: "商业咨询", taxAdvisory: "税务咨询",
    bankAccount: "开设银行账户", legalReview: "法律审查",
    nationality: "国籍", currentLocation: "当前位置",
    inBali: "已在巴厘岛", planning: "计划搬迁", remote: "远程",
    timeline: "何时需要？", urgent: "紧急（2周内）",
    month: "1个月内", flexible: "灵活", budget: "预估预算（美元）",
    localTitle: "印尼公民服务",
    ptLocal: "PT本地", cv: "CV", npwp: "NPWP注册", siup: "SIUP",
    localConsulting: "商业咨询", localLegal: "法律审查",
    businessType: "业务类型", city: "城市 / 地区",
  },
  tr: {
    title: "Bali'de İş ve Taşınma Hizmetleri",
    subtitle: "Şirket kurulumu, KITAS veya danışmanlık konusunda yardıma mı ihtiyacınız var?",
    whoAreYou: "Siz kimsiniz?",
    foreigner: "Yabancı / Expat", foreignerDesc: "PT PMA, KITAS, çalışma izni",
    local: "Endonezya Vatandaşı", localDesc: "PT Yerel, iş danışmanlığı",
    fullName: "Ad Soyad", email: "Email", whatsapp: "WhatsApp numarası",
    message: "Projenizi anlatın", messagePlaceholder: "İhtiyaçlarınızı açıklayın...",
    submit: "Talebimi gönder", sending: "Gönderiliyor...",
    success: "Talep gönderildi!", successDesc: "Ekibimiz 24 saat içinde sizinle iletişime geçecek.",
    error: "Gönderilemedi.",
    foreignTitle: "Yabancılar için Hizmetler", services: "Hangi hizmetlere ihtiyacınız var?",
    ptPma: "PT PMA", kitas: "KITAS", workPermit: "Çalışma İzni",
    consulting: "İş Danışmanlığı", taxAdvisory: "Vergi Danışmanlığı",
    bankAccount: "Banka Hesabı Açma", legalReview: "Hukuki İnceleme",
    nationality: "Uyruk", currentLocation: "Mevcut konum",
    inBali: "Zaten Bali'de", planning: "Taşınmayı planlıyor", remote: "Uzaktan",
    timeline: "Ne zaman ihtiyacınız var?", urgent: "Acil (2 hafta)",
    month: "1 ay içinde", flexible: "Esnek", budget: "Tahmini bütçe (USD)",
    localTitle: "Endonezya Vatandaşları için Hizmetler",
    ptLocal: "PT Yerel", cv: "CV", npwp: "NPWP Kaydı", siup: "SIUP",
    localConsulting: "İş Danışmanlığı", localLegal: "Hukuki İnceleme",
    businessType: "İş türü", city: "Şehir / Bölge",
  },
  ar: {
    title: "خدمات الأعمال والانتقال في بالي",
    subtitle: "هل تحتاج مساعدة في تأسيس شركة أو KITAS أو استشارات؟",
    whoAreYou: "من أنت؟",
    foreigner: "أجنبي / مغترب", foreignerDesc: "PT PMA, KITAS, تصريح عمل",
    local: "مواطن إندونيسي", localDesc: "PT محلي, استشارات أعمال",
    fullName: "الاسم الكامل", email: "البريد الإلكتروني", whatsapp: "رقم واتساب",
    message: "أخبرنا عن مشروعك", messagePlaceholder: "صف احتياجاتك...",
    submit: "إرسال طلبي", sending: "جاري الإرسال...",
    success: "تم إرسال الطلب!", successDesc: "سيتواصل فريقنا معك خلال 24 ساعة.",
    error: "فشل الإرسال.",
    foreignTitle: "خدمات للأجانب", services: "ما الخدمات التي تحتاجها؟",
    ptPma: "PT PMA", kitas: "KITAS", workPermit: "تصريح عمل",
    consulting: "استشارات أعمال", taxAdvisory: "استشارات ضريبية",
    bankAccount: "فتح حساب بنكي", legalReview: "مراجعة قانونية",
    nationality: "الجنسية", currentLocation: "الموقع الحالي",
    inBali: "في بالي بالفعل", planning: "تخطط للانتقال", remote: "عن بعد",
    timeline: "متى تحتاج هذا؟", urgent: "عاجل (أسبوعين)",
    month: "خلال شهر", flexible: "مرن", budget: "الميزانية التقديرية (دولار)",
    localTitle: "خدمات للمواطنين الإندونيسيين",
    ptLocal: "PT محلي", cv: "CV", npwp: "تسجيل NPWP", siup: "SIUP",
    localConsulting: "استشارات أعمال", localLegal: "مراجعة قانونية",
    businessType: "نوع العمل", city: "المدينة / المنطقة",
  },
  hi: {
    title: "बाली में व्यापार और स्थानांतरण सेवाएं",
    subtitle: "कंपनी निर्माण, KITAS या परामर्श में मदद चाहिए?",
    whoAreYou: "आप कौन हैं?",
    foreigner: "विदेशी / एक्सपैट", foreignerDesc: "PT PMA, KITAS, कार्य परमिट",
    local: "इंडोनेशियाई नागरिक", localDesc: "PT लोकल, व्यापार परामर्श",
    fullName: "पूरा नाम", email: "ईमेल", whatsapp: "व्हाट्सएप नंबर",
    message: "अपने प्रोजेक्ट के बारे में बताएं", messagePlaceholder: "अपनी जरूरतें बताएं...",
    submit: "अनुरोध भेजें", sending: "भेज रहे हैं...",
    success: "अनुरोध भेजा गया!", successDesc: "हमारी टीम 24 घंटे में संपर्क करेगी।",
    error: "भेजने में विफल।",
    foreignTitle: "विदेशियों के लिए सेवाएं", services: "आपको कौन सी सेवाएं चाहिए?",
    ptPma: "PT PMA", kitas: "KITAS", workPermit: "कार्य परमिट",
    consulting: "व्यापार परामर्श", taxAdvisory: "कर परामर्श",
    bankAccount: "बैंक खाता खोलना", legalReview: "कानूनी समीक्षा",
    nationality: "राष्ट्रीयता", currentLocation: "वर्तमान स्थान",
    inBali: "पहले से बाली में", planning: "स्थानांतरण की योजना", remote: "रिमोट",
    timeline: "यह कब चाहिए?", urgent: "तत्काल (2 सप्ताह)",
    month: "1 महीने में", flexible: "लचीला", budget: "अनुमानित बजट (USD)",
    localTitle: "इंडोनेशियाई नागरिकों के लिए सेवाएं",
    ptLocal: "PT लोकल", cv: "CV", npwp: "NPWP पंजीकरण", siup: "SIUP",
    localConsulting: "व्यापार परामर्श", localLegal: "कानूनी समीक्षा",
    businessType: "व्यापार प्रकार", city: "शहर / क्षेत्र",
  },
  ja: {
    title: "バリ島のビジネス＆リロケーションサービス",
    subtitle: "会社設立、KITASビザ、コンサルティングのサポートが必要ですか？",
    whoAreYou: "あなたは誰ですか？",
    foreigner: "外国人 / 駐在員", foreignerDesc: "PT PMA, KITAS, 就労許可",
    local: "インドネシア国民", localDesc: "PT Local, ビジネスコンサル",
    fullName: "氏名", email: "メール", whatsapp: "WhatsApp番号",
    message: "プロジェクトについて教えてください", messagePlaceholder: "ニーズを記述...",
    submit: "リクエスト送信", sending: "送信中...",
    success: "リクエスト送信完了!", successDesc: "24時間以内にチームからご連絡します。",
    error: "送信に失敗しました。",
    foreignTitle: "外国人向けサービス", services: "どのサービスが必要ですか？",
    ptPma: "PT PMA", kitas: "KITAS", workPermit: "就労許可",
    consulting: "ビジネスコンサル", taxAdvisory: "税務相談",
    bankAccount: "銀行口座開設", legalReview: "法務レビュー",
    nationality: "国籍", currentLocation: "現在地",
    inBali: "すでにバリ在住", planning: "移住予定", remote: "リモート",
    timeline: "いつ必要ですか？", urgent: "緊急（2週間以内）",
    month: "1ヶ月以内", flexible: "柔軟", budget: "予算目安（USD）",
    localTitle: "インドネシア国民向けサービス",
    ptLocal: "PT Local", cv: "CV", npwp: "NPWP登録", siup: "SIUP",
    localConsulting: "ビジネスコンサル", localLegal: "法務レビュー",
    businessType: "事業種類", city: "都市 / エリア",
  },
};

type UserType = null | 'foreigner' | 'local';

export default function BusinessServices() {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const [userType, setUserType] = useState<UserType>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Form state
  const [fullName, setFullName] = useState(profile?.display_name || '');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || '');
  const [messageText, setMessageText] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [nationality, setNationality] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [timeline, setTimeline] = useState('');
  const [budget, setBudget] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [city, setCity] = useState('');

  const t = (key: string) => TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;

  const toggleService = (service: string) => {
    setSelectedServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const foreignServices = [
    { key: 'ptPma', label: t('ptPma') },
    { key: 'kitas', label: t('kitas') },
    { key: 'workPermit', label: t('workPermit') },
    { key: 'consulting', label: t('consulting') },
    { key: 'taxAdvisory', label: t('taxAdvisory') },
    { key: 'bankAccount', label: t('bankAccount') },
    { key: 'legalReview', label: t('legalReview') },
  ];

  const localServices = [
    { key: 'ptLocal', label: t('ptLocal') },
    { key: 'cv', label: t('cv') },
    { key: 'npwp', label: t('npwp') },
    { key: 'siup', label: t('siup') },
    { key: 'localConsulting', label: t('localConsulting') },
    { key: 'localLegal', label: t('localLegal') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !whatsapp || selectedServices.length === 0) {
      toast({ title: t('error'), variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const res = await supabase.functions.invoke('send-business-services', {
        body: {
          user_type: userType,
          full_name: fullName,
          email,
          whatsapp,
          message: messageText,
          services: selectedServices,
          nationality: userType === 'foreigner' ? nationality : undefined,
          current_location: userType === 'foreigner' ? currentLocation : undefined,
          timeline: userType === 'foreigner' ? timeline : undefined,
          budget: userType === 'foreigner' ? budget : undefined,
          business_type: userType === 'local' ? businessType : undefined,
          city: userType === 'local' ? city : undefined,
          user_id: user?.id,
          language,
        },
      });
      if (res.error) throw res.error;
      setSent(true);
      toast({ title: t('success'), description: t('successDesc') });
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">{t('success')}</h2>
          <p className="text-muted-foreground">{t('successDesc')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
          <Building2 className="h-5 w-5" />
          <span className="font-semibold text-sm">Re-Bali Services</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{t('title')}</h1>
        <p className="text-muted-foreground text-lg">{t('subtitle')}</p>
      </div>

      {/* Step 1: User Type Selection */}
      {!userType && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground text-center mb-6">{t('whoAreYou')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card
              className="cursor-pointer hover:border-primary transition-colors group"
              onClick={() => setUserType('foreigner')}
            >
              <CardContent className="p-6 text-center">
                <Globe className="h-12 w-12 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-foreground text-lg">{t('foreigner')}</h3>
                <p className="text-muted-foreground text-sm mt-1">{t('foreignerDesc')}</p>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer hover:border-primary transition-colors group"
              onClick={() => setUserType('local')}
            >
              <CardContent className="p-6 text-center">
                <User className="h-12 w-12 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-foreground text-lg">{t('local')}</h3>
                <p className="text-muted-foreground text-sm mt-1">{t('localDesc')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 2: Form */}
      {userType && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {userType === 'foreigner' ? <Globe className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-primary" />}
                {userType === 'foreigner' ? t('foreignTitle') : t('localTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Common fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{t('fullName')} *</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
                <div>
                  <Label>{t('email')} *</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <div>
                <Label>{t('whatsapp')} *</Label>
                <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+62..." required />
              </div>

              {/* Services checkboxes */}
              <div>
                <Label className="mb-3 block">{t('services')} *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(userType === 'foreigner' ? foreignServices : localServices).map(s => (
                    <label key={s.key} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedServices.includes(s.key)}
                        onCheckedChange={() => toggleService(s.key)}
                      />
                      <span className="text-sm text-foreground">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Foreign-specific fields */}
              {userType === 'foreigner' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>{t('nationality')}</Label>
                      <Input value={nationality} onChange={e => setNationality(e.target.value)} />
                    </div>
                    <div>
                      <Label>{t('currentLocation')}</Label>
                      <Select value={currentLocation} onValueChange={setCurrentLocation}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_bali">{t('inBali')}</SelectItem>
                          <SelectItem value="planning">{t('planning')}</SelectItem>
                          <SelectItem value="remote">{t('remote')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>{t('timeline')}</Label>
                      <Select value={timeline} onValueChange={setTimeline}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">{t('urgent')}</SelectItem>
                          <SelectItem value="month">{t('month')}</SelectItem>
                          <SelectItem value="flexible">{t('flexible')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t('budget')}</Label>
                      <Input value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. 2000" />
                    </div>
                  </div>
                </>
              )}

              {/* Local-specific fields */}
              {userType === 'local' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('businessType')}</Label>
                    <Input value={businessType} onChange={e => setBusinessType(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t('city')}</Label>
                    <Input value={city} onChange={e => setCity(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Message */}
              <div>
                <Label>{t('message')}</Label>
                <Textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder={t('messagePlaceholder')}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => { setUserType(null); setSelectedServices([]); }}>
              ← {t('whoAreYou')}
            </Button>
            <Button type="submit" className="flex-1" disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? t('sending') : t('submit')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
