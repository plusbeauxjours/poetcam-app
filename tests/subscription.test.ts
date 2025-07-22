import RevenueCatService from "../services/revenueCatService";
import SubscriptionService from "../services/subscriptionService";

/**
 * Subscription 기능을 종합적으로 테스트합니다.
 * 실제 결제는 진행하지 않고 초기화 및 상태 조회만 확인합니다.
 */
export async function runSubscriptionTests() {
  console.log("\uD83E\uDDEA Subscription 테스트 시작...");

  try {
    // 1. RevenueCat 초기화
    console.log("1. RevenueCat 초기화...");
    const initResult = await RevenueCatService.initialize();
    console.log(`   \u2705 초기화: ${initResult ? "성공" : "실패"}`);
    if (!initResult) {
      throw new Error("RevenueCat 초기화 실패");
    }

    // 2. 구독 정보 조회
    console.log("2. 구독 상태 조회...");
    const status = await SubscriptionService.getStatus();
    console.log(`   \u2705 활성화 여부: ${status.isActive}`);
    if (status.expirationDate) {
      console.log(`   \u23F0 만료일: ${status.expirationDate}`);
    }

    // 3. 제공 중인 플랜 조회
    console.log("3. 구독 플랜 조회...");
    const offerings = await RevenueCatService.getOfferings();
    console.log(`   \u2705 플랜 수: ${offerings?.availablePackages.length || 0}`);

    console.log("\uD83C\uDF89 모든 Subscription 테스트가 완료되었습니다!");
    return true;
  } catch (error) {
    console.error("\u274C Subscription 테스트 실패:", error);
    return false;
  }
}

/**
 * 개발 환경에서 구독 설정을 검증합니다.
 */
export async function validateSubscriptionSetup(): Promise<{
  isValid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  try {
    if (!process.env.REVENUECAT_API_KEY_ANDROID && !process.env.REVENUECAT_API_KEY_IOS) {
      issues.push("RevenueCat API 키가 설정되지 않음");
    }
    const status = await SubscriptionService.getStatus();
    if (!status) {
      issues.push("구독 상태 조회 실패");
    }
    return {
      isValid: issues.length === 0,
      issues,
    };
  } catch (error) {
    issues.push(`구독 검증 중 오류 발생: ${error instanceof Error ? error.message : "Unknown"}`);
    return {
      isValid: false,
      issues,
    };
  }
}
