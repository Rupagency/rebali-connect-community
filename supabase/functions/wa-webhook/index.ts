import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Function disabled — return 200 to acknowledge webhook without action
  return new Response(JSON.stringify({ status: "disabled" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
