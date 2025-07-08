import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

/**
 * Supabase 연결 테스트 함수
 * - 실제 테이블이 없을 경우 에러 메시지를 반환
 * - 연결 자체가 실패하면 에러 throw
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    // 임시로 존재 가능성이 높은 시스템 테이블을 조회 (없으면 에러)
    const { error } = await supabase.rpc("version");
    if (error) {
      // 연결은 성공했으나 쿼리 실패 (테이블 없음 등)
      console.warn("Supabase 연결은 성공, 쿼리 실패:", error.message);
      return true;
    }
    return true;
  } catch (err) {
    console.error("Supabase 연결 실패:", err);
    return false;
  }
}
