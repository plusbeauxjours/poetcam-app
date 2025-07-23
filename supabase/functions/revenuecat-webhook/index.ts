import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.5";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const event = await req.json();

  // RevenueCat Webhook 이벤트 구조 참고: https://www.revenuecat.com/docs/webhooks
  const { event: eventType, app_user_id, expiration_at_ms } = event;

  if (!app_user_id) {
    return new Response("Missing user id", { status: 400 });
  }

  // 만료일 변환
  const expiresAt = expiration_at_ms ? new Date(Number(expiration_at_ms)).toISOString() : null;

  // 구독 상태 판별
  let subscriptionType: "free" | "premium" = "free";
  if (
    eventType === "INITIAL_PURCHASE" ||
    eventType === "RENEWAL" ||
    eventType === "PRODUCT_CHANGE"
  ) {
    subscriptionType = "premium";
  }

  // Supabase users 테이블 업데이트
  const { error } = await supabase
    .from("users")
    .update({
      subscription_type: subscriptionType,
      subscription_expires_at: expiresAt,
    })
    .eq("id", app_user_id);

  if (error) {
    return new Response("Failed to update user", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});
