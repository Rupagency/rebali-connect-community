import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all listing images ending in .jpg (not already _wm)
    const { data: images, error: imgErr } = await supabase
      .from("listing_images")
      .select("id, storage_path")
      .like("storage_path", "%.jpg")
      .not("storage_path", "like", "%_wm.jpg")
      .order("created_at", { ascending: true });

    if (imgErr) throw imgErr;

    let copied = 0;
    let skipped = 0;
    let errors = 0;

    for (const img of images || []) {
      const wmPath = img.storage_path.replace(/\.jpg$/, "_wm.jpg");

      // Check if _wm already exists (skip if so)
      const { data: existing } = await supabase.storage
        .from("listings")
        .createSignedUrl(wmPath, 5);
      if (existing?.signedUrl) {
        skipped++;
        continue;
      }

      // Download original
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("listings")
        .download(img.storage_path);
      if (dlErr || !fileData) {
        errors++;
        continue;
      }

      // Upload as _wm copy
      const { error: upErr } = await supabase.storage
        .from("listings")
        .upload(wmPath, fileData, { contentType: "image/jpeg", upsert: false });
      if (upErr) {
        // May already exist due to race
        if (upErr.message?.includes("already exists")) {
          skipped++;
        } else {
          errors++;
        }
        continue;
      }

      copied++;
    }

    return new Response(JSON.stringify({
      total: images?.length || 0,
      copied,
      skipped,
      errors,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
