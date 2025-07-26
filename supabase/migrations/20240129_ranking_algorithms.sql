-- 고급 랭킹 알고리즘 함수들
-- Migration: 20240129_ranking_algorithms.sql

-- 시간 가중치 계산 함수
CREATE OR REPLACE FUNCTION calculate_time_weight(activity_date TIMESTAMPTZ)
RETURNS DECIMAL(4,3) AS $$
DECLARE
    days_ago INTEGER;
    weight DECIMAL(4,3);
BEGIN
    days_ago := EXTRACT(DAY FROM NOW() - activity_date);
    
    -- 시간 가중치 공식: 최근 활동일수록 높은 가중치
    -- 1일 이내: 1.0, 7일 이내: 0.8, 30일 이내: 0.5, 90일 이내: 0.3, 그 이후: 0.1
    CASE 
        WHEN days_ago <= 1 THEN weight := 1.000;
        WHEN days_ago <= 7 THEN weight := 0.800;
        WHEN days_ago <= 30 THEN weight := 0.500;
        WHEN days_ago <= 90 THEN weight := 0.300;
        ELSE weight := 0.100;
    END CASE;
    
    RETURN weight;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 난이도 가중치 계산 함수
CREATE OR REPLACE FUNCTION calculate_difficulty_weight(
    activity_type TEXT,
    metadata JSONB DEFAULT '{}'
)
RETURNS DECIMAL(4,3) AS $$
DECLARE
    weight DECIMAL(4,3) := 1.000;
    challenge_difficulty TEXT;
    poem_quality DECIMAL;
    location_difficulty TEXT;
BEGIN
    CASE activity_type
        WHEN 'poem_creation' THEN
            -- 시 생성 난이도: 길이, 복잡성, 품질 기반
            poem_quality := COALESCE((metadata->>'quality_score')::DECIMAL, 3.0);
            weight := 0.5 + (poem_quality / 5.0) * 1.5; -- 0.5 ~ 2.0 범위
            
        WHEN 'challenge_completion' THEN
            -- 챌린지 난이도 기반
            challenge_difficulty := metadata->>'difficulty';
            CASE challenge_difficulty
                WHEN 'easy' THEN weight := 1.000;
                WHEN 'medium' THEN weight := 1.500;
                WHEN 'hard' THEN weight := 2.000;
                WHEN 'expert' THEN weight := 3.000;
                ELSE weight := 1.000;
            END CASE;
            
        WHEN 'location_discover' THEN
            -- 위치 발견 난이도: 접근성, 희귀성 기반
            location_difficulty := COALESCE(metadata->>'accessibility', 'normal');
            CASE location_difficulty
                WHEN 'easy' THEN weight := 1.000;
                WHEN 'normal' THEN weight := 1.200;
                WHEN 'hard' THEN weight := 1.800;
                WHEN 'extreme' THEN weight := 2.500;
                ELSE weight := 1.000;
            END CASE;
            
        WHEN 'badge_earned' THEN
            -- 뱃지 희귀도 기반
            CASE metadata->>'rarity'
                WHEN 'common' THEN weight := 1.000;
                WHEN 'uncommon' THEN weight := 1.300;
                WHEN 'rare' THEN weight := 1.800;
                WHEN 'epic' THEN weight := 2.500;
                WHEN 'legendary' THEN weight := 4.000;
                ELSE weight := 1.000;
            END CASE;
            
        WHEN 'social_share' THEN
            -- 소셜 공유: 도달률, 참여도 기반
            weight := 1.000 + COALESCE((metadata->>'engagement_rate')::DECIMAL, 0.0);
            
        ELSE
            weight := 1.000;
    END CASE;
    
    -- 가중치 범위 제한 (0.1 ~ 5.0)
    RETURN GREATEST(0.1, LEAST(5.0, weight));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 연속 활동 보너스 계산 함수
CREATE OR REPLACE FUNCTION calculate_streak_bonus(current_streak INTEGER)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    bonus DECIMAL(3,2);
BEGIN
    -- 연속 활동 보너스: 스트릭이 길수록 높은 보너스
    CASE 
        WHEN current_streak >= 365 THEN bonus := 3.00; -- 1년 이상
        WHEN current_streak >= 180 THEN bonus := 2.50; -- 6개월 이상
        WHEN current_streak >= 90 THEN bonus := 2.00;  -- 3개월 이상
        WHEN current_streak >= 30 THEN bonus := 1.50;  -- 1개월 이상
        WHEN current_streak >= 14 THEN bonus := 1.30;  -- 2주 이상
        WHEN current_streak >= 7 THEN bonus := 1.20;   -- 1주 이상
        WHEN current_streak >= 3 THEN bonus := 1.10;   -- 3일 이상
        ELSE bonus := 1.00; -- 보너스 없음
    END CASE;
    
    RETURN bonus;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 사용자 활동 다양성 점수 계산 함수
CREATE OR REPLACE FUNCTION calculate_diversity_score(user_uuid UUID)
RETURNS DECIMAL(4,2) AS $$
DECLARE
    activity_types INTEGER;
    total_activities INTEGER;
    diversity_score DECIMAL(4,2);
    poem_count INTEGER;
    challenge_count INTEGER;
    badge_count INTEGER;
    location_count INTEGER;
    social_count INTEGER;
BEGIN
    SELECT 
        poems_created,
        challenges_completed,
        badges_earned,
        locations_discovered,
        social_shares
    INTO 
        poem_count,
        challenge_count,
        badge_count,
        location_count,
        social_count
    FROM user_stats
    WHERE user_id = user_uuid;
    
    -- 활동 유형 개수 계산
    activity_types := 0;
    total_activities := 0;
    
    IF poem_count > 0 THEN 
        activity_types := activity_types + 1; 
        total_activities := total_activities + poem_count;
    END IF;
    
    IF challenge_count > 0 THEN 
        activity_types := activity_types + 1;
        total_activities := total_activities + challenge_count;
    END IF;
    
    IF badge_count > 0 THEN 
        activity_types := activity_types + 1;
        total_activities := total_activities + badge_count;
    END IF;
    
    IF location_count > 0 THEN 
        activity_types := activity_types + 1;
        total_activities := total_activities + location_count;
    END IF;
    
    IF social_count > 0 THEN 
        activity_types := activity_types + 1;
        total_activities := total_activities + social_count;
    END IF;
    
    -- 다양성 점수 계산: (활동 유형 수 / 5) * (1 + log(총 활동 수))
    IF total_activities > 0 THEN
        diversity_score := (activity_types::DECIMAL / 5.0) * (1.0 + LOG(total_activities));
    ELSE
        diversity_score := 0.0;
    END IF;
    
    RETURN GREATEST(0.0, LEAST(10.0, diversity_score));
END;
$$ LANGUAGE plpgsql;

-- 지역별 경쟁도 계산 함수
CREATE OR REPLACE FUNCTION calculate_regional_competition(region_code VARCHAR(10))
RETURNS DECIMAL(3,2) AS $$
DECLARE
    user_count INTEGER;
    competition_factor DECIMAL(3,2);
BEGIN
    -- 해당 지역의 활성 사용자 수 계산
    SELECT COUNT(*)
    INTO user_count
    FROM user_rankings
    WHERE region_code = calculate_regional_competition.region_code
    AND is_valid = TRUE;
    
    -- 경쟁도 계산: 사용자가 많을수록 높은 경쟁도
    CASE 
        WHEN user_count >= 10000 THEN competition_factor := 2.50;
        WHEN user_count >= 5000 THEN competition_factor := 2.00;
        WHEN user_count >= 1000 THEN competition_factor := 1.50;
        WHEN user_count >= 500 THEN competition_factor := 1.30;
        WHEN user_count >= 100 THEN competition_factor := 1.10;
        ELSE competition_factor := 1.00;
    END CASE;
    
    RETURN competition_factor;
END;
$$ LANGUAGE plpgsql;

-- 메인 랭킹 점수 계산 함수
CREATE OR REPLACE FUNCTION calculate_ranking_score(user_uuid UUID)
RETURNS TABLE(
    total_score DECIMAL(12,2),
    base_score DECIMAL(10,2),
    time_weighted_score DECIMAL(10,2),
    streak_bonus_score DECIMAL(8,2),
    diversity_bonus_score DECIMAL(8,2),
    quality_bonus_score DECIMAL(8,2)
) AS $$
DECLARE
    user_stat RECORD;
    base_points DECIMAL(10,2);
    time_weight DECIMAL(4,3);
    streak_bonus DECIMAL(3,2);
    diversity_score DECIMAL(4,2);
    quality_bonus DECIMAL(3,2) := 1.00;
    final_score DECIMAL(12,2);
    time_weighted_points DECIMAL(10,2);
    streak_points DECIMAL(8,2);
    diversity_points DECIMAL(8,2);
    quality_points DECIMAL(8,2);
BEGIN
    -- 사용자 통계 가져오기
    SELECT * INTO user_stat
    FROM user_stats
    WHERE user_id = user_uuid;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0.0, 0.0, 0.0, 0.0, 0.0, 0.0;
        RETURN;
    END IF;
    
    -- 기본 점수
    base_points := user_stat.total_points;
    
    -- 시간 가중치 적용 (최근 활동 기준)
    time_weight := calculate_time_weight(COALESCE(user_stat.last_activity_date::TIMESTAMPTZ, NOW()));
    time_weighted_points := base_points * time_weight;
    
    -- 연속 활동 보너스
    streak_bonus := calculate_streak_bonus(user_stat.current_streak);
    streak_points := base_points * (streak_bonus - 1.00);
    
    -- 활동 다양성 보너스
    diversity_score := calculate_diversity_score(user_uuid);
    diversity_points := base_points * (diversity_score / 10.0);
    
    -- 품질 보너스 (평균 시 평점 기반)
    IF user_stat.average_poem_rating IS NOT NULL THEN
        quality_bonus := 1.00 + ((user_stat.average_poem_rating - 3.0) / 5.0);
        quality_bonus := GREATEST(0.5, LEAST(2.0, quality_bonus));
    END IF;
    quality_points := base_points * (quality_bonus - 1.00);
    
    -- 최종 점수 계산
    final_score := time_weighted_points + streak_points + diversity_points + quality_points;
    
    RETURN QUERY SELECT 
        final_score,
        base_points,
        time_weighted_points,
        streak_points,
        diversity_points,
        quality_points;
END;
$$ LANGUAGE plpgsql;

-- 사용자 지역 코드 결정 함수
CREATE OR REPLACE FUNCTION determine_user_region(user_uuid UUID)
RETURNS VARCHAR(10) AS $$
DECLARE
    user_location RECORD;
    region_code VARCHAR(10);
    lat DECIMAL;
    lng DECIMAL;
BEGIN
    -- 사용자의 최근 시 위치 가져오기
    SELECT 
        ST_Y(location_point::geometry) as latitude,
        ST_X(location_point::geometry) as longitude
    INTO user_location
    FROM poems
    WHERE user_id = user_uuid 
    AND location_point IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN 'UNKNOWN';
    END IF;
    
    lat := user_location.latitude;
    lng := user_location.longitude;
    
    -- 간단한 지역 구분 (한국 기준)
    -- 실제 서비스에서는 더 정교한 지역 구분 로직 필요
    IF lat BETWEEN 33.0 AND 43.0 AND lng BETWEEN 124.0 AND 132.0 THEN
        -- 한국 내 세부 지역 구분
        IF lat >= 37.4 AND lng >= 126.7 AND lng <= 127.3 THEN
            region_code := 'KR_SE'; -- 서울
        ELSIF lat >= 35.0 AND lat <= 35.3 AND lng >= 128.9 AND lng <= 129.3 THEN
            region_code := 'KR_BS'; -- 부산
        ELSIF lat >= 35.8 AND lat <= 36.0 AND lng >= 128.5 AND lng <= 128.7 THEN
            region_code := 'KR_DG'; -- 대구
        ELSIF lat >= 37.2 AND lat <= 37.6 AND lng >= 126.6 AND lng <= 127.3 THEN
            region_code := 'KR_IC'; -- 인천/경기
        ELSE
            region_code := 'KR_ETC'; -- 기타 한국 지역
        END IF;
    ELSE
        region_code := 'GLOBAL'; -- 해외
    END IF;
    
    RETURN region_code;
END;
$$ LANGUAGE plpgsql;

-- 전체 랭킹 업데이트 함수
CREATE OR REPLACE FUNCTION update_user_rankings()
RETURNS INTEGER AS $$
DECLARE
    user_record RECORD;
    score_result RECORD;
    region VARCHAR(10);
    updated_count INTEGER := 0;
BEGIN
    -- 모든 사용자의 랭킹 업데이트
    FOR user_record IN 
        SELECT u.id, us.* 
        FROM users u 
        JOIN user_stats us ON u.id = us.user_id
    LOOP
        -- 랭킹 점수 계산
        SELECT * INTO score_result FROM calculate_ranking_score(user_record.id);
        
        -- 사용자 지역 결정
        region := determine_user_region(user_record.id);
        
        -- 랭킹 정보 업데이트 또는 생성
        INSERT INTO user_rankings (
            user_id,
            ranking_score,
            region_code,
            level_group,
            last_calculated,
            is_valid
        )
        VALUES (
            user_record.id,
            score_result.total_score,
            region,
            CASE 
                WHEN user_record.current_level <= 10 THEN '1-10'
                WHEN user_record.current_level <= 20 THEN '11-20'
                WHEN user_record.current_level <= 30 THEN '21-30'
                WHEN user_record.current_level <= 50 THEN '31-50'
                ELSE '51+'
            END,
            NOW(),
            TRUE
        )
        ON CONFLICT (user_id) DO UPDATE SET
            ranking_score = EXCLUDED.ranking_score,
            region_code = EXCLUDED.region_code,
            level_group = EXCLUDED.level_group,
            last_calculated = EXCLUDED.last_calculated,
            is_valid = EXCLUDED.is_valid;
            
        updated_count := updated_count + 1;
    END LOOP;
    
    -- 전체 랭킹 계산
    WITH ranked_users AS (
        SELECT 
            user_id,
            ranking_score,
            ROW_NUMBER() OVER (ORDER BY ranking_score DESC) as rank,
            PERCENT_RANK() OVER (ORDER BY ranking_score DESC) * 100 as percentile
        FROM user_rankings
        WHERE is_valid = TRUE
    )
    UPDATE user_rankings ur
    SET 
        global_rank = ru.rank,
        global_percentile = ROUND(ru.percentile::NUMERIC, 2)
    FROM ranked_users ru
    WHERE ur.user_id = ru.user_id;
    
    -- 주간 랭킹 계산
    WITH weekly_ranked AS (
        SELECT 
            us.user_id,
            ROW_NUMBER() OVER (ORDER BY us.weekly_points DESC, us.total_points DESC) as rank
        FROM user_stats us
        JOIN user_rankings ur ON us.user_id = ur.user_id
        WHERE ur.is_valid = TRUE
    )
    UPDATE user_rankings ur
    SET weekly_rank = wr.rank
    FROM weekly_ranked wr
    WHERE ur.user_id = wr.user_id;
    
    -- 월간 랭킹 계산
    WITH monthly_ranked AS (
        SELECT 
            us.user_id,
            ROW_NUMBER() OVER (ORDER BY us.monthly_points DESC, us.total_points DESC) as rank
        FROM user_stats us
        JOIN user_rankings ur ON us.user_id = ur.user_id
        WHERE ur.is_valid = TRUE
    )
    UPDATE user_rankings ur
    SET monthly_rank = mr.rank
    FROM monthly_ranked mr
    WHERE ur.user_id = mr.user_id;
    
    -- 지역별 랭킹 계산
    WITH regional_ranked AS (
        SELECT 
            user_id,
            region_code,
            ROW_NUMBER() OVER (PARTITION BY region_code ORDER BY ranking_score DESC) as rank
        FROM user_rankings
        WHERE is_valid = TRUE AND region_code IS NOT NULL
    )
    UPDATE user_rankings ur
    SET regional_rank = rr.rank
    FROM regional_ranked rr
    WHERE ur.user_id = rr.user_id AND ur.region_code = rr.region_code;
    
    -- 레벨별 랭킹 계산
    WITH level_ranked AS (
        SELECT 
            user_id,
            level_group,
            ROW_NUMBER() OVER (PARTITION BY level_group ORDER BY ranking_score DESC) as rank
        FROM user_rankings
        WHERE is_valid = TRUE AND level_group IS NOT NULL
    )
    UPDATE user_rankings ur
    SET level_rank = lr.rank
    FROM level_ranked lr
    WHERE ur.user_id = lr.user_id AND ur.level_group = lr.level_group;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 리더보드 스냅샷 생성 함수
CREATE OR REPLACE FUNCTION create_leaderboard_snapshot(
    snapshot_period TEXT,
    snapshot_start TIMESTAMPTZ,
    snapshot_end TIMESTAMPTZ
)
RETURNS UUID AS $$
DECLARE
    snapshot_id UUID;
    ranking_data JSONB;
    participant_count INTEGER;
BEGIN
    -- 기간별 랭킹 데이터 생성
    CASE snapshot_period
        WHEN 'weekly' THEN
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rank', weekly_rank,
                    'user_id', id,
                    'name', name,
                    'avatar_url', avatar_url,
                    'points', weekly_points,
                    'level', current_level,
                    'level_name', level_name
                ) ORDER BY weekly_rank
            ), COUNT(*)
            INTO ranking_data, participant_count
            FROM weekly_leaderboard
            WHERE weekly_rank <= 100; -- 상위 100명만 저장
            
        WHEN 'monthly' THEN
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rank', monthly_rank,
                    'user_id', id,
                    'name', name,
                    'avatar_url', avatar_url,
                    'points', monthly_points,
                    'level', current_level,
                    'level_name', level_name
                ) ORDER BY monthly_rank
            ), COUNT(*)
            INTO ranking_data, participant_count
            FROM monthly_leaderboard
            WHERE monthly_rank <= 100;
            
        ELSE -- global
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rank', global_rank,
                    'user_id', id,
                    'name', name,
                    'avatar_url', avatar_url,
                    'points', total_points,
                    'level', current_level,
                    'level_name', level_name,
                    'ranking_score', ranking_score
                ) ORDER BY global_rank
            ), COUNT(*)
            INTO ranking_data, participant_count
            FROM global_leaderboard
            WHERE global_rank <= 100;
    END CASE;
    
    -- 스냅샷 저장
    INSERT INTO leaderboard_snapshots (
        period_type,
        period_start,
        period_end,
        rankings,
        total_participants,
        snapshot_metadata
    )
    VALUES (
        snapshot_period,
        snapshot_start,
        snapshot_end,
        COALESCE(ranking_data, '[]'::jsonb),
        COALESCE(participant_count, 0),
        jsonb_build_object(
            'created_by', 'system',
            'algorithm_version', '1.0',
            'calculation_time', NOW()
        )
    )
    RETURNING id INTO snapshot_id;
    
    RETURN snapshot_id;
END;
$$ LANGUAGE plpgsql;

-- 자동 랭킹 업데이트를 위한 스케줄링 함수 (매시간 실행 권장)
CREATE OR REPLACE FUNCTION scheduled_ranking_update()
RETURNS void AS $$
DECLARE
    current_hour INTEGER;
    current_day INTEGER;
    current_date_val DATE;
BEGIN
    current_hour := EXTRACT(HOUR FROM NOW());
    current_day := EXTRACT(DOW FROM NOW());
    current_date_val := CURRENT_DATE;
    
    -- 랭킹 업데이트 실행
    PERFORM update_user_rankings();
    
    -- 주간 포인트 리셋 (월요일 자정)
    IF current_day = 1 AND current_hour = 0 THEN
        PERFORM reset_periodic_points();
        
        -- 주간 리더보드 스냅샷 생성
        PERFORM create_leaderboard_snapshot(
            'weekly',
            (current_date_val - INTERVAL '7 days')::TIMESTAMPTZ,
            current_date_val::TIMESTAMPTZ
        );
    END IF;
    
    -- 월간 리더보드 스냅샷 생성 (매월 1일 자정)
    IF EXTRACT(DAY FROM NOW()) = 1 AND current_hour = 0 THEN
        PERFORM create_leaderboard_snapshot(
            'monthly',
            DATE_TRUNC('month', current_date_val - INTERVAL '1 month')::TIMESTAMPTZ,
            DATE_TRUNC('month', current_date_val)::TIMESTAMPTZ
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 랭킹 관련 유틸리티 함수들

-- 사용자 랭킹 정보 조회 함수
CREATE OR REPLACE FUNCTION get_user_ranking_info(user_uuid UUID)
RETURNS TABLE(
    global_rank INTEGER,
    global_percentile DECIMAL(5,2),
    weekly_rank INTEGER,
    monthly_rank INTEGER,
    regional_rank INTEGER,
    region_code VARCHAR(10),
    level_rank INTEGER,
    level_group VARCHAR(20),
    ranking_score DECIMAL(10,2),
    total_points INTEGER,
    weekly_points INTEGER,
    monthly_points INTEGER,
    current_level INTEGER,
    level_name experience_level
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ur.global_rank,
        ur.global_percentile,
        ur.weekly_rank,
        ur.monthly_rank,
        ur.regional_rank,
        ur.region_code,
        ur.level_rank,
        ur.level_group,
        ur.ranking_score,
        us.total_points,
        us.weekly_points,
        us.monthly_points,
        us.current_level,
        us.level_name
    FROM user_rankings ur
    JOIN user_stats us ON ur.user_id = us.user_id
    WHERE ur.user_id = user_uuid AND ur.is_valid = TRUE;
END;
$$ LANGUAGE plpgsql;

-- 랭킹 변화 추적을 위한 히스토리 테이블
CREATE TABLE ranking_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    global_rank INTEGER,
    ranking_score DECIMAL(10,2),
    total_points INTEGER,
    recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ranking_history_user_id ON ranking_history(user_id);
CREATE INDEX idx_ranking_history_recorded_at ON ranking_history(recorded_at DESC);

-- 랭킹 히스토리 저장 함수
CREATE OR REPLACE FUNCTION save_ranking_history()
RETURNS INTEGER AS $$
DECLARE
    saved_count INTEGER := 0;
BEGIN
    INSERT INTO ranking_history (user_id, global_rank, ranking_score, total_points)
    SELECT 
        ur.user_id,
        ur.global_rank,
        ur.ranking_score,
        us.total_points
    FROM user_rankings ur
    JOIN user_stats us ON ur.user_id = us.user_id
    WHERE ur.is_valid = TRUE;
    
    GET DIAGNOSTICS saved_count = ROW_COUNT;
    
    -- 30일 이상 된 히스토리 삭제
    DELETE FROM ranking_history
    WHERE recorded_at < NOW() - INTERVAL '30 days';
    
    RETURN saved_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_time_weight IS '시간 가중치 계산: 최근 활동일수록 높은 가중치';
COMMENT ON FUNCTION calculate_difficulty_weight IS '난이도 가중치 계산: 활동 유형과 메타데이터 기반';
COMMENT ON FUNCTION calculate_streak_bonus IS '연속 활동 보너스 계산';
COMMENT ON FUNCTION calculate_diversity_score IS '사용자 활동 다양성 점수 계산';
COMMENT ON FUNCTION calculate_ranking_score IS '종합 랭킹 점수 계산 (시간, 난이도, 보너스 포함)';
COMMENT ON FUNCTION update_user_rankings IS '전체 사용자 랭킹 업데이트 및 순위 계산';
COMMENT ON FUNCTION create_leaderboard_snapshot IS '리더보드 스냅샷 생성 (주간/월간)';
COMMENT ON FUNCTION scheduled_ranking_update IS '자동 랭킹 업데이트 스케줄링 함수';