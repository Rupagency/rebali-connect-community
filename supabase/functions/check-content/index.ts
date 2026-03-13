const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Indonesian price pattern (e.g. 28.000.000, 150.000)
const INDONESIAN_PRICE = /\b\d{1,3}(\.\d{3}){1,4}\b/g;

// Patterns to detect suspicious content
const SUSPICIOUS_PATTERNS = [
  /wa\.me\//i,
  /t\.me\//i,
  /bit\.ly\//i,
  /tinyurl\.com/i,
  /https?:\/\/[^\s]+/i,  // Any URL
  /telegram/i,
  /whatsapp\.com/i,
  /signal\.me/i,
];

// Phone patterns checked AFTER removing prices
const PHONE_PATTERNS = [
  /(\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,5}/,  // Phone numbers
  /\b\d{8,15}\b/,  // Raw digit sequences (phone-like)
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text) {
      return new Response(JSON.stringify({ safe: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const violations: string[] = [];

    // Check non-phone patterns on original text
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(text)) {
        violations.push(pattern.source);
      }
    }

    // Remove Indonesian prices before phone check
    const cleaned = text.replace(INDONESIAN_PRICE, '');
    for (const pattern of PHONE_PATTERNS) {
      if (pattern.test(cleaned)) {
        violations.push(pattern.source);
      }
    }

    const safe = violations.length === 0;

    return new Response(JSON.stringify({ safe, violations_count: violations.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-content error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
