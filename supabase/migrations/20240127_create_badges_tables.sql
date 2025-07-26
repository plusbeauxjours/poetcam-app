-- 뱃지 시스템 데이터베이스 스키마

-- 뱃지 카테고리 ENUM
CREATE TYPE badge_category AS ENUM (
    'beginner', 'creative', 'location', 'challenge', 
    'social', 'achievement', 'seasonal', 'special'
);

-- 뱃지 등급 ENUM
CREATE TYPE badge_rarity AS ENUM (
    'common', 'uncommon', 'rare', 'epic', 'legendary'
);

-- 뱃지 획득 조건 타입 ENUM
CREATE TYPE badge_condition_type AS ENUM (
    'poem_count', 'photo_count', 'challenge_complete', 'location_visit',
    'consecutive_days', 'total_points', 'share_count', 'like_received',
    'comment_count', 'specific_challenge', 'time_based', 'seasonal_event'
);

-- 뱃지 마스터 테이블
CREATE TABLE badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category badge_category NOT NULL,
    rarity badge_rarity NOT NULL,
    icon_name VARCHAR(255) NOT NULL,
    icon_color VARCHAR(7) NOT NULL, -- HEX 색상 코드
    conditions JSONB NOT NULL DEFAULT '[]', -- BadgeCondition[] 배열
    points INTEGER NOT NULL DEFAULT 0,
    is_secret BOOLEAN DEFAULT FALSE,
    is_limited BOOLEAN DEFAULT FALSE,
    unlock_hint TEXT,
    prerequisites JSONB DEFAULT '[]', -- 선행 뱃지 ID 배열
    metadata JSONB DEFAULT '{}', -- 메타데이터
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- 제약 조건
    CONSTRAINT valid_icon_color CHECK (icon_color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT valid_points CHECK (points >= 0)
);

-- 뱃지 인덱스
CREATE INDEX idx_badges_category ON badges(category);
CREATE INDEX idx_badges_rarity ON badges(rarity);
CREATE INDEX idx_badges_active ON badges(is_active);
CREATE INDEX idx_badges_secret ON badges(is_secret);
CREATE INDEX idx_badges_limited ON badges(is_limited);

-- 사용자 뱃지 획득 기록 테이블
CREATE TABLE user_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    progress JSONB DEFAULT '[]', -- BadgeProgress[] 배열
    notification_sent BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}', -- 획득 관련 메타데이터
    
    -- 복합 유니크 제약 (한 사용자는 같은 뱃지를 한 번만 획득)
    CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id)
);

-- 사용자 뱃지 인덱스
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX idx_user_badges_earned_at ON user_badges(earned_at);
CREATE INDEX idx_user_badges_notification ON user_badges(notification_sent);

-- 뱃지 진행도 추적 테이블 (복합 조건 뱃지용)
CREATE TABLE badge_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    condition_index INTEGER NOT NULL,
    current_value INTEGER NOT NULL DEFAULT 0,
    target_value INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- 복합 유니크 제약
    CONSTRAINT unique_user_badge_condition UNIQUE (user_id, badge_id, condition_index),
    CONSTRAINT valid_progress_values CHECK (current_value >= 0 AND target_value > 0)
);

-- 뱃지 진행도 인덱스
CREATE INDEX idx_badge_progress_user_id ON badge_progress(user_id);
CREATE INDEX idx_badge_progress_badge_id ON badge_progress(badge_id);
CREATE INDEX idx_badge_progress_completed ON badge_progress(completed);

-- 뱃지 획득 이벤트 로그 테이블 (분석용)
CREATE TABLE badge_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'earned', 'progress_updated', 'conditions_met'
    event_data JSONB DEFAULT '{}',
    triggered_by JSONB DEFAULT '{}', -- 트리거 정보
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 이벤트 로그 인덱스
CREATE INDEX idx_badge_events_user_id ON badge_events(user_id);
CREATE INDEX idx_badge_events_badge_id ON badge_events(badge_id);
CREATE INDEX idx_badge_events_type ON badge_events(event_type);
CREATE INDEX idx_badge_events_created_at ON badge_events(created_at);

-- 뱃지 통계 뷰
CREATE OR REPLACE VIEW user_badge_stats AS
SELECT 
    u.id as user_id,
    COUNT(DISTINCT b.id) as total_available_badges,
    COUNT(DISTINCT ub.badge_id) as earned_badges,
    CASE 
        WHEN COUNT(DISTINCT b.id) > 0 
        THEN ROUND((COUNT(DISTINCT ub.badge_id)::numeric / COUNT(DISTINCT b.id)::numeric) * 100, 2)
        ELSE 0 
    END as completion_rate,
    
    -- 등급별 통계
    COUNT(DISTINCT CASE WHEN b.rarity = 'common' AND ub.badge_id IS NOT NULL THEN ub.badge_id END) as common_badges,
    COUNT(DISTINCT CASE WHEN b.rarity = 'uncommon' AND ub.badge_id IS NOT NULL THEN ub.badge_id END) as uncommon_badges,
    COUNT(DISTINCT CASE WHEN b.rarity = 'rare' AND ub.badge_id IS NOT NULL THEN ub.badge_id END) as rare_badges,
    COUNT(DISTINCT CASE WHEN b.rarity = 'epic' AND ub.badge_id IS NOT NULL THEN ub.badge_id END) as epic_badges,
    COUNT(DISTINCT CASE WHEN b.rarity = 'legendary' AND ub.badge_id IS NOT NULL THEN ub.badge_id END) as legendary_badges,
    
    -- 카테고리별 통계
    COUNT(DISTINCT CASE WHEN b.category = 'beginner' AND ub.badge_id IS NOT NULL THEN ub.badge_id END) as beginner_badges,
    COUNT(DISTINCT CASE WHEN b.category = 'creative' AND ub.badge_id IS NOT NULL THEN ub.badge_id END) as creative_badges,
    COUNT(DISTINCT CASE WHEN b.category = 'location' AND ub.badge_id IS NOT NULL THEN ub.badge_id END) as location_badges,
    COUNT(DISTINCT CASE WHEN b.category = 'challenge' AND ub.badge_id IS NOT NULL THEN ub.badge_id END) as challenge_badges,
    COUNT(DISTINCT CASE WHEN b.category = 'social' AND ub.badge_id IS NOT NULL THEN ub.badge_id END) as social_badges,
    COUNT(DISTINCT CASE WHEN b.category = 'achievement' AND ub.badge_id IS NOT NULL THEN ub.badge_id END) as achievement_badges,
    COUNT(DISTINCT CASE WHEN b.category = 'seasonal' AND ub.badge_id IS NOT NULL THEN ub.badge_id END) as seasonal_badges,
    COUNT(DISTINCT CASE WHEN b.category = 'special' AND ub.badge_id IS NOT NULL THEN ub.badge_id END) as special_badges,
    
    -- 총 획득 포인트
    COALESCE(SUM(CASE WHEN ub.badge_id IS NOT NULL THEN b.points ELSE 0 END), 0) as total_badge_points
FROM 
    auth.users u
    CROSS JOIN badges b
    LEFT JOIN user_badges ub ON u.id = ub.user_id AND b.id = ub.badge_id
WHERE 
    b.is_active = TRUE
GROUP BY 
    u.id;

-- 업데이트 시간 자동 갱신 트리거
CREATE TRIGGER update_badges_updated_at BEFORE UPDATE
    ON badges FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_badge_progress_last_updated BEFORE UPDATE
    ON badge_progress FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- RLS (Row Level Security) 정책
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_events ENABLE ROW LEVEL SECURITY;

-- 뱃지는 모든 사용자가 볼 수 있음 (활성화된 것만)
CREATE POLICY "Active badges are viewable by everyone" ON badges
    FOR SELECT USING (is_active = TRUE);

-- 뱃지는 관리자만 생성/수정/삭제 가능
CREATE POLICY "Only admins can manage badges" ON badges
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 사용자는 자신의 뱃지만 볼 수 있음
CREATE POLICY "Users can view own badges" ON user_badges
    FOR SELECT USING (auth.uid() = user_id);

-- 사용자 뱃지는 시스템에서만 생성/업데이트 (서비스 롤 키 필요)
CREATE POLICY "System can manage user badges" ON user_badges
    FOR ALL USING (
        current_setting('role') = 'service_role' OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 사용자는 자신의 뱃지 진행도만 볼 수 있음
CREATE POLICY "Users can view own badge progress" ON badge_progress
    FOR SELECT USING (auth.uid() = user_id);

-- 뱃지 진행도는 시스템에서만 관리
CREATE POLICY "System can manage badge progress" ON badge_progress
    FOR ALL USING (
        current_setting('role') = 'service_role' OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 뱃지 이벤트는 시스템에서만 기록
CREATE POLICY "System can log badge events" ON badge_events
    FOR INSERT WITH CHECK (
        current_setting('role') = 'service_role' OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 사용자는 자신의 뱃지 이벤트만 볼 수 있음 (관리자는 모든 이벤트)
CREATE POLICY "Users can view own badge events" ON badge_events
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 뱃지 진행도 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_badge_progress_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- last_updated 시간 갱신
    NEW.last_updated = NOW();
    
    -- 목표 달성 시 completed 플래그 설정
    IF NEW.current_value >= NEW.target_value THEN
        NEW.completed = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_badge_progress
    BEFORE UPDATE ON badge_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_badge_progress_trigger();