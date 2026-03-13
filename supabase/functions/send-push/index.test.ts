import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.test("send push to iOS device", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      user_id: "08e2c738-3682-4fcb-b1d6-b0c8af9ebc67",
      title: "🎉 Test Push Re-Bali",
      body: "Les notifications natives iOS fonctionnent !",
      data: { type: "test" },
    }),
  });

  const json = await res.json();
  console.log("Response:", JSON.stringify(json));
  assertEquals(res.status, 200);
  assertEquals(json.ok, true);
  console.log(`Sent to ${json.sent} device(s)`);
});
