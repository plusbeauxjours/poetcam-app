import { getStorageUsage, listUserImages, testStorageConnection } from "./storage";

/**
 * Storage 기능을 종합적으로 테스트합니다.
 * 실제 이미지 업로드는 하지 않고 연결만 테스트합니다.
 */
export async function runStorageTests() {
  console.log("🧪 Storage 테스트 시작...");

  try {
    // 1. 연결 테스트
    console.log("1. Storage 연결 테스트...");
    const connectionResult = await testStorageConnection();
    console.log(`   ✅ 연결 테스트: ${connectionResult ? "성공" : "실패"}`);

    if (!connectionResult) {
      throw new Error("Storage 연결에 실패했습니다.");
    }

    // 2. 빈 사용자 폴더 조회 테스트
    console.log("2. 사용자 이미지 목록 조회 테스트...");
    const testUserId = "test-user-id";
    const listResult = await listUserImages(testUserId);
    console.log(`   ✅ 목록 조회: ${listResult.success ? "성공" : "실패"}`);
    console.log(`   📁 이미지 개수: ${listResult.images?.length || 0}`);

    // 3. 사용량 조회 테스트
    console.log("3. Storage 사용량 조회 테스트...");
    const usageResult = await getStorageUsage(testUserId);
    console.log(`   ✅ 사용량 조회: ${usageResult.success ? "성공" : "실패"}`);

    if (usageResult.success) {
      console.log(`   💾 총 사용량: ${usageResult.totalSizeMB || 0}MB`);
      console.log(`   📋 파일 개수: ${usageResult.fileCount || 0}`);
    }

    console.log("🎉 모든 Storage 테스트가 완료되었습니다!");
    return true;
  } catch (error) {
    console.error("❌ Storage 테스트 실패:", error);
    return false;
  }
}

/**
 * 개발 환경에서 Storage 설정을 검증합니다.
 */
export async function validateStorageSetup(): Promise<{
  isValid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // 기본 연결 테스트
    const connected = await testStorageConnection();
    if (!connected) {
      issues.push("Supabase Storage 연결 실패");
    }

    // 환경변수 확인
    if (!process.env.SUPABASE_URL) {
      issues.push("SUPABASE_URL 환경변수가 설정되지 않음");
    }

    if (!process.env.SUPABASE_ANON_KEY) {
      issues.push("SUPABASE_ANON_KEY 환경변수가 설정되지 않음");
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  } catch (error) {
    issues.push(
      `Storage 검증 중 오류 발생: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return {
      isValid: false,
      issues,
    };
  }
}
