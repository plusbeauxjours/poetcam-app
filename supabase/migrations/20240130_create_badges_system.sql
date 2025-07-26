-- 뱃지 시스템 데이터베이스 스키마
-- 뱃지 마스터 테이블, 사용자 뱃지, 진행도, 이벤트 등을 포함

-- 1. 뱃지 마스터 테이블
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN (
        'beginner', 'creative', 'location', 'challenge', 
        'social', 'achievement', 'seasonal', 'special'
    )),
    rarity VARCHAR(15) NOT NULL CHECK (rarity IN (
        'common', 'uncommon', 'rare', 'epic', 'legendary'
    )),
    icon_name VARCHAR(100) NOT NULL,
    icon_color VARCHAR(7) NOT NULL, -- HEX 색상 코드
    conditions JSONB NOT NULL, -- 획득 조건 배열
    points INTEGER NOT NULL DEFAULT 0,
    is_secret BOOLEAN NOT NULL DEFAULT false,
    is_limited BOOLEAN NOT NULL DEFAULT false,
    unlock_hint TEXT,
    prerequisites TEXT[], -- 선행 뱃지 ID 배열
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 사용자 뱃지 획득 기록
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    progress JSONB DEFAULT '[]', -- BadgeProgress 배열
    notification_sent BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    
    UNIQUE(user_id, badge_id) -- 사용자당 동일 뱃지 중복 방지
);

-- 3. 뱃지 진행도 테이블 (복합 조건 뱃지용)
CREATE TABLE IF NOT EXISTS badge_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    condition_index INTEGER NOT NULL,
    current_value INTEGER NOT NULL DEFAULT 0,
    target_value INTEGER NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, badge_id, condition_index)
);

-- 4. 뱃지 이벤트 로그
CREATE TABLE IF NOT EXISTS badge_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE SET NULL,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN (
        'earned', 'progress', 'milestone', 'expired'
    )),
    event_data JSONB NOT NULL DEFAULT '{}',
    triggered_by JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. 사용자 뱃지 통계 (집계 테이블)
CREATE TABLE IF NOT EXISTS user_badge_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_available_badges INTEGER NOT NULL DEFAULT 0,
    earned_badges INTEGER NOT NULL DEFAULT 0,
    completion_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    
    -- 등급별 통계
    common_badges INTEGER NOT NULL DEFAULT 0,
    uncommon_badges INTEGER NOT NULL DEFAULT 0,
    rare_badges INTEGER NOT NULL DEFAULT 0,
    epic_badges INTEGER NOT NULL DEFAULT 0,
    legendary_badges INTEGER NOT NULL DEFAULT 0,
    
    -- 카테고리별 통계
    beginner_badges INTEGER NOT NULL DEFAULT 0,
    creative_badges INTEGER NOT NULL DEFAULT 0,
    location_badges INTEGER NOT NULL DEFAULT 0,
    challenge_badges INTEGER NOT NULL DEFAULT 0,
    social_badges INTEGER NOT NULL DEFAULT 0,
    achievement_badges INTEGER NOT NULL DEFAULT 0,
    seasonal_badges INTEGER NOT NULL DEFAULT 0,
    special_badges INTEGER NOT NULL DEFAULT 0,
    
    last_badge_earned_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_rarity ON badges(rarity);
CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_badge_progress_user_badge ON badge_progress(user_id, badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_events_user_id ON badge_events(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_events_created_at ON badge_events(created_at DESC);

-- RLS (Row Level Security) 정책
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badge_stats ENABLE ROW LEVEL SECURITY;

-- 뱃지 마스터 데이터는 모든 사용자가 읽기 가능
CREATE POLICY "Badges are viewable by everyone"
    ON badges FOR SELECT
    USING (is_active = true);

-- 사용자는 자신의 뱃지 데이터만 접근 가능
CREATE POLICY "Users can view own badges"
    ON user_badges FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own badge progress"
    ON badge_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own badge events"
    ON badge_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own badge stats"
    ON user_badge_stats FOR SELECT
    USING (auth.uid() = user_id);

-- 시스템이 사용자 뱃지 데이터를 삽입/업데이트 가능 (서비스 계정용)
CREATE POLICY "Service can manage user badges"
    ON user_badges FOR ALL
    USING (true);

CREATE POLICY "Service can manage badge progress"
    ON badge_progress FOR ALL
    USING (true);

CREATE POLICY "Service can manage badge events"
    ON badge_events FOR ALL
    USING (true);

CREATE POLICY "Service can manage badge stats"
    ON user_badge_stats FOR ALL
    USING (true);

-- 트리거 함수들

-- 1. 뱃지 획득 시 통계 업데이트
CREATE OR REPLACE FUNCTION update_user_badge_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- user_badge_stats 테이블에 사용자 레코드가 없으면 생성
    INSERT INTO user_badge_stats (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- 통계 업데이트
    UPDATE user_badge_stats 
    SET 
        earned_badges = (
            SELECT COUNT(*) 
            FROM user_badges 
            WHERE user_id = NEW.user_id
        ),
        completion_rate = (
            SELECT CASE 
                WHEN total_badges.count > 0 THEN 
                    (earned_badges.count::DECIMAL / total_badges.count * 100)
                ELSE 0 
            END
            FROM 
                (SELECT COUNT(*) as count FROM user_badges WHERE user_id = NEW.user_id) earned_badges,
                (SELECT COUNT(*) as count FROM badges WHERE is_active = true) total_badges
        ),
        last_badge_earned_at = NEW.earned_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.user_id;
    
    -- 등급별/카테고리별 통계 업데이트
    UPDATE user_badge_stats 
    SET 
        common_badges = (
            SELECT COUNT(*) 
            FROM user_badges ub 
            JOIN badges b ON ub.badge_id = b.id 
            WHERE ub.user_id = NEW.user_id AND b.rarity = 'common'
        ),
        uncommon_badges = (
            SELECT COUNT(*) 
            FROM user_badges ub 
            JOIN badges b ON ub.badge_id = b.id 
            WHERE ub.user_id = NEW.user_id AND b.rarity = 'uncommon'
        ),
        rare_badges = (
            SELECT COUNT(*) 
            FROM user_badges ub 
            JOIN badges b ON ub.badge_id = b.id 
            WHERE ub.user_id = NEW.user_id AND b.rarity = 'rare'
        ),
        epic_badges = (
            SELECT COUNT(*) 
            FROM user_badges ub 
            JOIN badges b ON ub.badge_id = b.id 
            WHERE ub.user_id = NEW.user_id AND b.rarity = 'epic'
        ),
        legendary_badges = (
            SELECT COUNT(*) 
            FROM user_badges ub 
            JOIN badges b ON ub.badge_id = b.id 
            WHERE ub.user_id = NEW.user_id AND b.rarity = 'legendary'
        ),
        beginner_badges = (
            SELECT COUNT(*) 
            FROM user_badges ub 
            JOIN badges b ON ub.badge_id = b.id 
            WHERE ub.user_id = NEW.user_id AND b.category = 'beginner'
        ),
        creative_badges = (
            SELECT COUNT(*) 
            FROM user_badges ub 
            JOIN badges b ON ub.badge_id = b.id 
            WHERE ub.user_id = NEW.user_id AND b.category = 'creative'
        ),
        location_badges = (
            SELECT COUNT(*) 
            FROM user_badges ub 
            JOIN badges b ON ub.badge_id = b.id 
            WHERE ub.user_id = NEW.user_id AND b.category = 'location'
        ),
        challenge_badges = (
            SELECT COUNT(*) 
            FROM user_badges ub 
            JOIN badges b ON ub.badge_id = b.id 
            WHERE ub.user_id = NEW.user_id AND b.category = 'challenge'
        ),
        social_badges = (
            SELECT COUNT(*) 
            FROM user_badges ub 
            JOIN badges b ON ub.badge_id = b.id 
            WHERE ub.user_id = NEW.user_id AND b.category = 'social'
        ),
        achievement_badges = (
            SELECT COUNT(*) 
            FROM user_badges ub 
            JOIN badges b ON ub.badge_id = b.id 
            WHERE ub.user_id = NEW.user_id AND b.category = 'achievement'
        ),
        seasonal_badges = (
            SELECT COUNT(*) 
            FROM user_badges ub 
            JOIN badges b ON ub.badge_id = b.id 
            WHERE ub.user_id = NEW.user_id AND b.category = 'seasonal'
        ),
        special_badges = (
            SELECT COUNT(*) 
            FROM user_badges ub 
            JOIN badges b ON ub.badge_id = b.id 
            WHERE ub.user_id = NEW.user_id AND b.category = 'special'
        )
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 뱃지 진행도 업데이트 시 자동 완료 체크
CREATE OR REPLACE FUNCTION check_badge_completion()
RETURNS TRIGGER AS $$
DECLARE
    badge_conditions JSONB;
    all_conditions_met BOOLEAN := true;
    condition_count INTEGER;
    completed_conditions INTEGER;
BEGIN
    -- 뱃지의 조건들 가져오기
    SELECT conditions INTO badge_conditions
    FROM badges 
    WHERE id = NEW.badge_id;
    
    -- 조건 개수 확인
    condition_count := jsonb_array_length(badge_conditions);
    
    -- 완료된 조건 개수 확인
    SELECT COUNT(*) INTO completed_conditions
    FROM badge_progress
    WHERE user_id = NEW.user_id 
    AND badge_id = NEW.badge_id 
    AND completed = true;
    
    -- 모든 조건이 완료되었는지 확인
    IF completed_conditions >= condition_count THEN
        -- 이미 획득한 뱃지인지 확인
        IF NOT EXISTS (
            SELECT 1 FROM user_badges 
            WHERE user_id = NEW.user_id AND badge_id = NEW.badge_id
        ) THEN
            -- 뱃지 자동 수여
            INSERT INTO user_badges (user_id, badge_id, earned_at)
            VALUES (NEW.user_id, NEW.badge_id, CURRENT_TIMESTAMP);
            
            -- 이벤트 로그 기록
            INSERT INTO badge_events (user_id, badge_id, event_type, event_data)
            VALUES (
                NEW.user_id, 
                NEW.badge_id, 
                'earned', 
                jsonb_build_object('auto_awarded', true, 'trigger', 'progress_completion')
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER trigger_update_badge_stats
    AFTER INSERT ON user_badges
    FOR EACH ROW
    EXECUTE FUNCTION update_user_badge_stats();

CREATE TRIGGER trigger_check_badge_completion
    AFTER INSERT OR UPDATE ON badge_progress
    FOR EACH ROW
    EXECUTE FUNCTION check_badge_completion();

-- 헬퍼 함수들

-- 1. 사용자의 전체 뱃지 완료율 계산
CREATE OR REPLACE FUNCTION get_user_badge_completion_rate(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_badges INTEGER;
    earned_badges INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_badges FROM badges WHERE is_active = true;
    SELECT COUNT(*) INTO earned_badges FROM user_badges WHERE user_id = p_user_id;
    
    IF total_badges > 0 THEN
        RETURN (earned_badges::DECIMAL / total_badges * 100);
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. 뱃지 획득 가능 여부 확인
CREATE OR REPLACE FUNCTION is_badge_available_for_user(p_user_id UUID, p_badge_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    badge_prerequisites TEXT[];
    prerequisite_id TEXT;
BEGIN
    -- 이미 획득한 뱃지인지 확인
    IF EXISTS (
        SELECT 1 FROM user_badges 
        WHERE user_id = p_user_id AND badge_id = p_badge_id
    ) THEN
        RETURN false;
    END IF;
    
    -- 선행 뱃지 조건 확인
    SELECT prerequisites INTO badge_prerequisites
    FROM badges 
    WHERE id = p_badge_id AND is_active = true;
    
    -- 선행 뱃지가 있는 경우
    IF badge_prerequisites IS NOT NULL AND array_length(badge_prerequisites, 1) > 0 THEN
        FOREACH prerequisite_id IN ARRAY badge_prerequisites
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM user_badges 
                WHERE user_id = p_user_id AND badge_id = prerequisite_id::UUID
            ) THEN
                RETURN false;
            END IF;
        END LOOP;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 뱃지 시스템 초기화 함수
CREATE OR REPLACE FUNCTION initialize_user_badge_stats(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_badge_stats (user_id, total_available_badges)
    VALUES (
        p_user_id,
        (SELECT COUNT(*) FROM badges WHERE is_active = true)
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_available_badges = (SELECT COUNT(*) FROM badges WHERE is_active = true),
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;