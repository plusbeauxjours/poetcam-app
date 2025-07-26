// 배지 시스템 전체 테스트 실행 스크립트

import { runBadgeSystemTests } from './badgeSystem.test';
import { runBadgeIntegrationTests, runBadgePerformanceTest } from './badgeIntegrationTest';

/**
 * 배지 시스템의 모든 테스트를 순차적으로 실행하는 함수
 */
export async function runAllBadgeTests(): Promise<void> {
  console.log('🧪🎯 포에캠 배지 시스템 종합 테스트 시작');
  console.log('='.repeat(80));
  console.log('📋 테스트 구성:');
  console.log('   1. 기본 기능 테스트 (CRUD, 진행도, 통계)');
  console.log('   2. 통합 시나리오 테스트 (실제 사용 케이스)');
  console.log('   3. 성능 테스트 (대량 데이터 처리)');
  console.log('='.repeat(80));

  const overallStartTime = Date.now();

  try {
    // Phase 1: 기본 기능 테스트
    console.log('\n🚀 Phase 1: 기본 기능 테스트 시작');
    console.log('-'.repeat(50));
    const basicTestStart = Date.now();
    
    await runBadgeSystemTests();
    
    const basicTestEnd = Date.now();
    console.log(`✅ Phase 1 완료 (${basicTestEnd - basicTestStart}ms)`);

    // Phase 2: 통합 시나리오 테스트
    console.log('\n🚀 Phase 2: 통합 시나리오 테스트 시작');
    console.log('-'.repeat(50));
    const integrationTestStart = Date.now();
    
    await runBadgeIntegrationTests();
    
    const integrationTestEnd = Date.now();
    console.log(`✅ Phase 2 완료 (${integrationTestEnd - integrationTestStart}ms)`);

    // Phase 3: 성능 테스트
    console.log('\n🚀 Phase 3: 성능 테스트 시작');
    console.log('-'.repeat(50));
    const performanceTestStart = Date.now();
    
    await runBadgePerformanceTest();
    
    const performanceTestEnd = Date.now();
    console.log(`✅ Phase 3 완료 (${performanceTestEnd - performanceTestStart}ms)`);

    // 전체 테스트 완료 리포트
    const overallEndTime = Date.now();
    const totalDuration = overallEndTime - overallStartTime;

    console.log('\n' + '='.repeat(80));
    console.log('🎉 포에캠 배지 시스템 종합 테스트 완료!');
    console.log('='.repeat(80));
    console.log('📊 테스트 결과 요약:');
    console.log(`   ⏱️  총 소요시간: ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}초)`);
    console.log(`   ✅ Phase 1 (기본): ${basicTestEnd - basicTestStart}ms`);
    console.log(`   ✅ Phase 2 (통합): ${integrationTestEnd - integrationTestStart}ms`);
    console.log(`   ✅ Phase 3 (성능): ${performanceTestEnd - performanceTestStart}ms`);
    console.log('\n🏆 배지 시스템이 모든 테스트를 통과했습니다!');
    console.log('   - 8개 카테고리의 배지 지원');
    console.log('   - 5단계 등급 시스템');
    console.log('   - 복합 조건 및 시간 기반 배지');
    console.log('   - 위치 기반 챌린지 연동');
    console.log('   - 실시간 진행도 추적');
    console.log('   - 애니메이션 및 알림 시스템');
    console.log('='.repeat(80));

  } catch (error) {
    const overallEndTime = Date.now();
    const totalDuration = overallEndTime - overallStartTime;

    console.log('\n' + '='.repeat(80));
    console.log('💥 배지 시스템 테스트 중 오류 발생!');
    console.log('='.repeat(80));
    console.error('❌ 오류 내용:', error);
    console.log(`⏱️  실행 시간: ${totalDuration}ms`);
    console.log('\n🔧 다음 사항을 확인해주세요:');
    console.log('   1. Supabase 연결 상태');
    console.log('   2. 데이터베이스 마이그레이션 완료 여부');
    console.log('   3. 환경 변수 설정');
    console.log('   4. 샘플 데이터 삽입 완료 여부');
    console.log('='.repeat(80));
    
    // 오류가 발생해도 프로세스가 중단되지 않도록 처리
    process.exit(1);
  }
}

/**
 * 개발 환경에서 빠른 테스트를 위한 함수
 */
export async function runQuickBadgeTest(): Promise<void> {
  console.log('⚡ 배지 시스템 빠른 테스트 시작\n');

  try {
    // 기본 기능만 테스트
    await runBadgeSystemTests();
    
    console.log('\n✅ 빠른 테스트 완료!');
    console.log('기본 기능들이 정상적으로 작동합니다.');

  } catch (error) {
    console.error('❌ 빠른 테스트 실패:', error);
  }
}

/**
 * CI/CD 환경에서 실행할 테스트 (성능 테스트 제외)
 */
export async function runCIBadgeTests(): Promise<void> {
  console.log('🤖 CI/CD 배지 시스템 테스트 시작\n');

  try {
    // 기본 기능 + 통합 테스트 (성능 테스트 제외)
    await runBadgeSystemTests();
    await runBadgeIntegrationTests();
    
    console.log('\n✅ CI/CD 테스트 완료!');
    console.log('배지 시스템이 CI/CD 환경에서 정상 작동합니다.');

  } catch (error) {
    console.error('❌ CI/CD 테스트 실패:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  const testType = process.argv[2] || 'full';
  
  switch (testType) {
    case 'quick':
      runQuickBadgeTest();
      break;
    case 'ci':
      runCIBadgeTests();
      break;
    case 'full':
    default:
      runAllBadgeTests();
      break;
  }
}