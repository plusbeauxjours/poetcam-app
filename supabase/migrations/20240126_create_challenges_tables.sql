-- 챌린지 타입 ENUM
CREATE TYPE challenge_type AS ENUM ('daily', 'weekly', 'location', 'achievement', 'special');

-- 챌린지 난이도 ENUM
CREATE TYPE challenge_difficulty AS ENUM ('easy', 'medium', 'hard', 'expert');

-- 챌린지 상태 ENUM
CREATE TYPE challenge_status AS ENUM ('active', 'upcoming', 'expired', 'completed');

-- 사용자 챌린지 상태 ENUM
CREATE TYPE user_challenge_status AS ENUM ('not_started', 'in_progress', 'completed', 'failed');

-- 보상 타입 ENUM
CREATE TYPE reward_type AS ENUM ('points', 'badge', 'title', 'item', 'experience');

-- 챌린지 테이블
CREATE TABLE challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type challenge_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty challenge_difficulty NOT NULL,
    status challenge_status NOT NULL DEFAULT 'upcoming',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    goals JSONB NOT NULL DEFAULT '[]', -- ChallengeGoal[] 형태로 저장
    rewards JSONB NOT NULL DEFAULT '[]', -- Reward[] 형태로 저장
    requirements JSONB DEFAULT NULL, -- 참가 조건 저장
    metadata JSONB DEFAULT NULL, -- 추가 메타데이터 (위치, 반복 정보 등)
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- 인덱스
    CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- 챌린지 인덱스
CREATE INDEX idx_challenges_type ON challenges(type);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX idx_challenges_dates ON challenges(start_date, end_date);

-- 사용자-챌린지 관계 테이블
CREATE TABLE user_challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    status user_challenge_status NOT NULL DEFAULT 'not_started',
    progress JSONB NOT NULL DEFAULT '[]', -- ChallengeGoal[] 형태로 저장 (사용자별 진행도)
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    claimed_rewards BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0 NOT NULL,
    metadata JSONB DEFAULT NULL, -- 추가 메타데이터 (마지막 활동 시간, 메모 등)
    
    -- 복합 유니크 제약
    CONSTRAINT unique_user_challenge UNIQUE (user_id, challenge_id)
);

-- 사용자-챌린지 인덱스
CREATE INDEX idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX idx_user_challenges_challenge_id ON user_challenges(challenge_id);
CREATE INDEX idx_user_challenges_status ON user_challenges(status);
CREATE INDEX idx_user_challenges_completed_at ON user_challenges(completed_at);

-- 챌린지 통계 뷰 (필요시 사용)
CREATE OR REPLACE VIEW user_challenge_stats AS
SELECT 
    user_id,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_challenges,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_challenges,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_challenges,
    COUNT(*) as total_challenges,
    CASE 
        WHEN COUNT(*) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0 
    END as completion_rate
FROM user_challenges
GROUP BY user_id;

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE
    ON challenges FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- RLS (Row Level Security) 정책
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

-- 챌린지는 모든 사용자가 볼 수 있음
CREATE POLICY "Challenges are viewable by everyone" ON challenges
    FOR SELECT USING (true);

-- 챌린지는 관리자만 생성/수정/삭제 가능 (auth.users의 role이 'admin'인 경우)
CREATE POLICY "Only admins can insert challenges" ON challenges
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Only admins can update challenges" ON challenges
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Only admins can delete challenges" ON challenges
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 사용자는 자신의 챌린지 진행 상황만 볼 수 있음
CREATE POLICY "Users can view own challenge progress" ON user_challenges
    FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 챌린지를 시작할 수 있음
CREATE POLICY "Users can start challenges" ON user_challenges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 챌린지 진행 상황을 업데이트할 수 있음
CREATE POLICY "Users can update own challenge progress" ON user_challenges
    FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 챌린지 기록을 삭제할 수 없음 (데이터 무결성 보호)
-- DELETE 정책 없음