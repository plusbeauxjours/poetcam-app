-- 랭킹 및 리더보드 시스템 스키마
-- Migration: 20240128_create_ranking_system.sql

-- 포인트 획득 타입 ENUM
CREATE TYPE point_source AS ENUM (
    'poem_creation', 'photo_upload', 'challenge_completion', 'badge_earned',
    'daily_login', 'location_discover', 'social_share', 'like_received',
    'comment_received', 'streak_bonus', 'quality_bonus', 'event_participation'
);

-- 경험치 레벨 타입 ENUM  
CREATE TYPE experience_level AS ENUM (
    'beginner', 'novice', 'intermediate', 'advanced', 'expert', 'master', 'legend'
);

-- 사용자 포인트 및 경험치 테이블
CREATE TABLE user_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- 포인트 시스템
    total_points INTEGER NOT NULL DEFAULT 0,
    weekly_points INTEGER NOT NULL DEFAULT 0,
    monthly_points INTEGER NOT NULL DEFAULT 0,
    lifetime_points INTEGER NOT NULL DEFAULT 0,
    
    -- 경험치 시스템
    experience_points INTEGER NOT NULL DEFAULT 0,
    level_points INTEGER NOT NULL DEFAULT 0, -- 현재 레벨에서의 포인트
    current_level INTEGER NOT NULL DEFAULT 1,
    level_name experience_level NOT NULL DEFAULT 'beginner',
    
    -- 활동 통계
    poems_created INTEGER NOT NULL DEFAULT 0,
    photos_uploaded INTEGER NOT NULL DEFAULT 0,
    challenges_completed INTEGER NOT NULL DEFAULT 0,
    badges_earned INTEGER NOT NULL DEFAULT 0,
    locations_discovered INTEGER NOT NULL DEFAULT 0,
    social_shares INTEGER NOT NULL DEFAULT 0,
    likes_received INTEGER NOT NULL DEFAULT 0,
    comments_received INTEGER NOT NULL DEFAULT 0,
    
    -- 연속 활동
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,
    
    -- 품질 지표
    average_poem_rating DECIMAL(3,2) DEFAULT NULL,
    high_quality_poems INTEGER NOT NULL DEFAULT 0,
    
    -- 시간 관련
    last_weekly_reset TIMESTAMPTZ DEFAULT NOW(),
    last_monthly_reset TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- 제약 조건
    CONSTRAINT positive_points CHECK (
        total_points >= 0 AND weekly_points >= 0 AND 
        monthly_points >= 0 AND lifetime_points >= 0
    ),
    CONSTRAINT positive_experience CHECK (
        experience_points >= 0 AND level_points >= 0 AND current_level >= 1
    ),
    CONSTRAINT positive_stats CHECK (
        poems_created >= 0 AND photos_uploaded >= 0 AND 
        challenges_completed >= 0 AND badges_earned >= 0 AND
        locations_discovered >= 0 AND social_shares >= 0 AND
        likes_received >= 0 AND comments_received >= 0
    ),
    CONSTRAINT positive_streaks CHECK (
        current_streak >= 0 AND longest_streak >= 0
    ),
    CONSTRAINT valid_rating CHECK (
        average_poem_rating IS NULL OR 
        (average_poem_rating >= 0.00 AND average_poem_rating <= 5.00)
    )
);

-- 포인트 획득 로그 테이블
CREATE TABLE point_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source point_source NOT NULL,
    points INTEGER NOT NULL,
    multiplier DECIMAL(3,2) DEFAULT 1.00,
    final_points INTEGER NOT NULL,
    description TEXT,
    
    -- 관련 엔티티 참조
    related_poem_id UUID REFERENCES poems(id) ON DELETE SET NULL,
    related_challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
    related_badge_id UUID REFERENCES badges(id) ON DELETE SET NULL,
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- 제약 조건
    CONSTRAINT valid_points CHECK (points > 0),
    CONSTRAINT valid_multiplier CHECK (multiplier > 0.00),
    CONSTRAINT valid_final_points CHECK (final_points > 0)
);

-- 사용자 랭킹 캐시 테이블 (성능 최적화용)
CREATE TABLE user_rankings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 전체 랭킹
    global_rank INTEGER,
    global_percentile DECIMAL(5,2),
    
    -- 주간/월간 랭킹
    weekly_rank INTEGER,
    monthly_rank INTEGER,
    
    -- 지역별 랭킹 (위도/경도 기반)
    regional_rank INTEGER,
    region_code VARCHAR(10), -- 지역 코드 (예: "KR_SE" = 한국 서울)
    
    -- 레벨별 랭킹
    level_rank INTEGER,
    level_group VARCHAR(20), -- 레벨 그룹 (예: "1-10", "11-20")
    
    -- 특별 랭킹
    creative_rank INTEGER, -- 창의성 기반 랭킹
    activity_rank INTEGER, -- 활동성 기반 랭킹
    
    -- 랭킹 점수 (가중 계산)
    ranking_score DECIMAL(10,2) NOT NULL,
    
    -- 캐시 정보
    last_calculated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_valid BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- 유니크 제약
    CONSTRAINT unique_user_ranking UNIQUE (user_id)
);

-- 리더보드 스냅샷 테이블 (주간/월간 리더보드 보관)
CREATE TABLE leaderboard_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'seasonal')),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- 리더보드 데이터 (JSON 배열)
    rankings JSONB NOT NULL,
    
    -- 메타데이터
    total_participants INTEGER NOT NULL,
    snapshot_metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- 인덱스용 제약
    CONSTRAINT valid_period CHECK (period_end > period_start)
);

-- 인덱스 생성
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX idx_user_stats_total_points ON user_stats(total_points DESC);
CREATE INDEX idx_user_stats_weekly_points ON user_stats(weekly_points DESC);
CREATE INDEX idx_user_stats_monthly_points ON user_stats(monthly_points DESC);
CREATE INDEX idx_user_stats_experience ON user_stats(experience_points DESC);
CREATE INDEX idx_user_stats_level ON user_stats(current_level DESC);
CREATE INDEX idx_user_stats_streak ON user_stats(current_streak DESC);

CREATE INDEX idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX idx_point_transactions_source ON point_transactions(source);
CREATE INDEX idx_point_transactions_created_at ON point_transactions(created_at DESC);
CREATE INDEX idx_point_transactions_points ON point_transactions(final_points DESC);

CREATE INDEX idx_user_rankings_global_rank ON user_rankings(global_rank);
CREATE INDEX idx_user_rankings_weekly_rank ON user_rankings(weekly_rank);
CREATE INDEX idx_user_rankings_monthly_rank ON user_rankings(monthly_rank);
CREATE INDEX idx_user_rankings_regional ON user_rankings(region_code, regional_rank);
CREATE INDEX idx_user_rankings_level ON user_rankings(level_group, level_rank);
CREATE INDEX idx_user_rankings_score ON user_rankings(ranking_score DESC);
CREATE INDEX idx_user_rankings_valid ON user_rankings(is_valid, last_calculated);

CREATE INDEX idx_leaderboard_snapshots_period ON leaderboard_snapshots(period_type, period_start, period_end);
CREATE INDEX idx_leaderboard_snapshots_created ON leaderboard_snapshots(created_at DESC);

-- RLS 정책 설정
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 통계만 볼 수 있음
CREATE POLICY "Users can view own stats" ON user_stats
    FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 포인트 거래 내역만 볼 수 있음  
CREATE POLICY "Users can view own point transactions" ON point_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- 랭킹은 모든 사용자가 볼 수 있음
CREATE POLICY "Rankings are viewable by everyone" ON user_rankings
    FOR SELECT USING (true);

-- 리더보드 스냅샷은 모든 사용자가 볼 수 있음
CREATE POLICY "Leaderboard snapshots are viewable by everyone" ON leaderboard_snapshots
    FOR SELECT USING (true);

-- 시스템만 통계 업데이트 가능
CREATE POLICY "System can manage user stats" ON user_stats
    FOR ALL USING (
        current_setting('role') = 'service_role' OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 시스템만 포인트 거래 기록 가능
CREATE POLICY "System can manage point transactions" ON point_transactions
    FOR ALL USING (
        current_setting('role') = 'service_role' OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 시스템만 랭킹 업데이트 가능
CREATE POLICY "System can manage rankings" ON user_rankings
    FOR ALL USING (
        current_setting('role') = 'service_role' OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 시스템만 리더보드 스냅샷 생성 가능
CREATE POLICY "System can manage leaderboard snapshots" ON leaderboard_snapshots
    FOR ALL USING (
        current_setting('role') = 'service_role' OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 트리거 함수들

-- 업데이트 시간 자동 갱신
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE
    ON user_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_rankings_updated_at BEFORE UPDATE
    ON user_rankings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 새 사용자 생성 시 기본 통계 생성
CREATE OR REPLACE FUNCTION create_user_stats_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_stats (user_id, last_activity_date)
    VALUES (NEW.id, CURRENT_DATE);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_stats_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_stats_for_new_user();

-- 포인트 획득 시 사용자 통계 업데이트
CREATE OR REPLACE FUNCTION update_user_stats_on_points()
RETURNS TRIGGER AS $$
DECLARE
    current_date_val DATE := CURRENT_DATE;
BEGIN
    -- 사용자 통계 업데이트
    UPDATE user_stats
    SET 
        total_points = total_points + NEW.final_points,
        weekly_points = weekly_points + NEW.final_points,
        monthly_points = monthly_points + NEW.final_points,
        lifetime_points = lifetime_points + NEW.final_points,
        experience_points = experience_points + NEW.final_points,
        last_activity_date = current_date_val,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    -- 랭킹 캐시 무효화
    UPDATE user_rankings
    SET is_valid = FALSE
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_stats_on_points_trigger
    AFTER INSERT ON point_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_on_points();

-- 레벨 계산 함수
CREATE OR REPLACE FUNCTION calculate_user_level(experience INTEGER)
RETURNS TABLE(level INTEGER, level_name experience_level, level_points INTEGER) AS $$
DECLARE
    calculated_level INTEGER;
    calculated_level_name experience_level;
    points_in_level INTEGER;
    total_points_for_level INTEGER;
BEGIN
    -- 간단한 레벨 계산 공식: 레벨 = floor(sqrt(experience / 100)) + 1
    calculated_level := GREATEST(1, floor(sqrt(experience / 100.0)) + 1);
    
    -- 레벨에 따른 이름 매핑
    CASE 
        WHEN calculated_level <= 5 THEN calculated_level_name := 'beginner';
        WHEN calculated_level <= 10 THEN calculated_level_name := 'novice';
        WHEN calculated_level <= 20 THEN calculated_level_name := 'intermediate';
        WHEN calculated_level <= 35 THEN calculated_level_name := 'advanced';
        WHEN calculated_level <= 50 THEN calculated_level_name := 'expert';
        WHEN calculated_level <= 75 THEN calculated_level_name := 'master';
        ELSE calculated_level_name := 'legend';
    END CASE;
    
    -- 현재 레벨에서의 포인트 계산
    total_points_for_level := ((calculated_level - 1) * (calculated_level - 1)) * 100;
    points_in_level := experience - total_points_for_level;
    
    RETURN QUERY SELECT calculated_level, calculated_level_name, points_in_level;
END;
$$ LANGUAGE plpgsql;

-- 경험치 변경 시 레벨 업데이트
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
DECLARE
    level_info RECORD;
BEGIN
    -- 레벨 계산
    SELECT * INTO level_info FROM calculate_user_level(NEW.experience_points);
    
    -- 레벨 업데이트
    NEW.current_level := level_info.level;
    NEW.level_name := level_info.level_name;
    NEW.level_points := level_info.level_points;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_level_trigger
    BEFORE UPDATE OF experience_points ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_user_level();

-- 주간/월간 포인트 리셋 함수
CREATE OR REPLACE FUNCTION reset_periodic_points()
RETURNS void AS $$
BEGIN
    -- 주간 포인트 리셋 (월요일)
    UPDATE user_stats
    SET 
        weekly_points = 0,
        last_weekly_reset = NOW()
    WHERE EXTRACT(DOW FROM NOW()) = 1 -- 월요일
    AND last_weekly_reset < DATE_TRUNC('week', NOW());
    
    -- 월간 포인트 리셋 (매월 1일)
    UPDATE user_stats
    SET 
        monthly_points = 0,
        last_monthly_reset = NOW()
    WHERE EXTRACT(DAY FROM NOW()) = 1 -- 매월 1일
    AND last_monthly_reset < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql;

-- 뷰 생성

-- 전체 리더보드 뷰
CREATE OR REPLACE VIEW global_leaderboard AS
SELECT 
    u.id,
    u.name,
    u.avatar_url,
    us.total_points,
    us.current_level,
    us.level_name,
    us.current_streak,
    ur.global_rank,
    ur.global_percentile,
    ur.ranking_score
FROM users u
JOIN user_stats us ON u.id = us.user_id
LEFT JOIN user_rankings ur ON u.id = ur.user_id
WHERE ur.is_valid = TRUE
ORDER BY ur.global_rank ASC NULLS LAST, us.total_points DESC;

-- 주간 리더보드 뷰
CREATE OR REPLACE VIEW weekly_leaderboard AS
SELECT 
    u.id,
    u.name,
    u.avatar_url,
    us.weekly_points,
    us.current_level,
    us.level_name,
    ur.weekly_rank,
    ROW_NUMBER() OVER (ORDER BY us.weekly_points DESC, us.total_points DESC) as current_weekly_rank
FROM users u
JOIN user_stats us ON u.id = us.user_id
LEFT JOIN user_rankings ur ON u.id = ur.user_id
ORDER BY current_weekly_rank;

-- 월간 리더보드 뷰
CREATE OR REPLACE VIEW monthly_leaderboard AS
SELECT 
    u.id,
    u.name,
    u.avatar_url,
    us.monthly_points,
    us.current_level,
    us.level_name,
    ur.monthly_rank,
    ROW_NUMBER() OVER (ORDER BY us.monthly_points DESC, us.total_points DESC) as current_monthly_rank
FROM users u
JOIN user_stats us ON u.id = us.user_id
LEFT JOIN user_rankings ur ON u.id = ur.user_id
ORDER BY current_monthly_rank;

-- 테이블 설명
COMMENT ON TABLE user_stats IS '사용자 포인트, 경험치, 활동 통계';
COMMENT ON TABLE point_transactions IS '포인트 획득/사용 거래 로그';
COMMENT ON TABLE user_rankings IS '사용자 랭킹 캐시 테이블';
COMMENT ON TABLE leaderboard_snapshots IS '주간/월간 리더보드 스냅샷';

COMMENT ON COLUMN user_stats.ranking_score IS '종합 랭킹 점수 (가중 계산)';
COMMENT ON COLUMN user_rankings.ranking_score IS '랭킹 계산용 종합 점수';
COMMENT ON COLUMN point_transactions.multiplier IS '포인트 배수 (이벤트, 스트릭 보너스 등)';