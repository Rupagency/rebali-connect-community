import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Parse form data
    const formData = await req.formData();
    const docFile = formData.get("document") as File | null;
    const selfieFile = formData.get("selfie") as File | null;
    const documentType = formData.get("document_type") as string | null;

    if (!docFile || !selfieFile || !documentType) {
      return new Response(
        JSON.stringify({ error: "Missing document, selfie, or document_type" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Size check (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (docFile.size > MAX_SIZE || selfieFile.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: "File too large (max 5MB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get encryption key
    const keyB64 = Deno.env.get("VAULT_ENCRYPTION_KEY");
    if (!keyB64) {
      console.error("VAULT_ENCRYPTION_KEY not set");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawKey = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );

    // Encrypt helper: returns IV (12 bytes) + ciphertext
    async function encryptFile(file: File): Promise<Uint8Array> {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const plaintext = new Uint8Array(await file.arrayBuffer());
      const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, plaintext)
      );
      const result = new Uint8Array(iv.length + ciphertext.length);
      result.set(iv, 0);
      result.set(ciphertext, iv.length);
      return result;
    }

    const [encDoc, encSelfie] = await Promise.all([
      encryptFile(docFile),
      encryptFile(selfieFile),
    ]);

    // Upload with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const docExt = docFile.name.split(".").pop() || "bin";
    const selfieExt = selfieFile.name.split(".").pop() || "bin";
    const docPath = `${userId}/document.${docExt}`;
    const selfiePath = `${userId}/selfie.${selfieExt}`;

    const [docUpload, selfieUpload] = await Promise.all([
      supabaseAdmin.storage
        .from("id-verifications")
        .upload(docPath, encDoc, {
          upsert: true,
          contentType: "application/octet-stream",
        }),
      supabaseAdmin.storage
        .from("id-verifications")
        .upload(selfiePath, encSelfie, {
          upsert: true,
          contentType: "application/octet-stream",
        }),
    ]);

    if (docUpload.error) throw new Error(`Doc upload: ${docUpload.error.message}`);
    if (selfieUpload.error)
      throw new Error(`Selfie upload: ${selfieUpload.error.message}`);

    // Insert verification record
    const { error: insertError } = await supabaseAdmin
      .from("id_verifications")
      .insert({
        user_id: userId,
        document_type: documentType,
        document_path: docPath,
        selfie_path: selfiePath,
      });

    if (insertError) throw new Error(`DB insert: ${insertError.message}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("encrypt-upload error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
