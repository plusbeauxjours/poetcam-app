-- 알림 시스템 데이터베이스 스키마
-- Notification System Database Schema

-- 사용자 알림 설정 테이블
CREATE TABLE IF NOT EXISTS user_notification_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true NOT NULL,
    notification_types JSONB DEFAULT '{
        "daily_challenge": true,
        "weekly_challenge": true,
        "location_challenge": true,
        "streak_reminder": true,
        "badge_earned": true,
        "leaderboard_update": false,
        "custom_reminder": true,
        "challenge_expiring": true,
        "milestone_achieved": true
    }'::jsonb NOT NULL,
    quiet_hours JSONB DEFAULT '{
        "enabled": true,
        "startTime": "22:00",
        "endTime": "08:00"
    }'::jsonb NOT NULL,
    frequency_settings JSONB DEFAULT '{
        "dailyChallenges": "once",
        "streakReminders": "daily",
        "locationReminders": "hourly"
    }'::jsonb NOT NULL,
    custom_times JSONB DEFAULT '{
        "morningReminder": "09:00",
        "eveningReminder": "19:00",
        "weekendReminder": "10:00"
    }'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 사용자 디바이스 토큰 테이블
CREATE TABLE IF NOT EXISTS user_device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL,
    device_id TEXT,
    device_type TEXT CHECK (device_type IN ('ios', 'android', 'web')),
    app_version TEXT,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, expo_push_token)
);

-- 예약된 알림 테이블
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'daily_challenge',
        'weekly_challenge',
        'location_challenge',
        'streak_reminder',
        'badge_earned',
        'leaderboard_update',
        'custom_reminder',
        'challenge_expiring',
        'milestone_achieved'
    )),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    recurring_settings JSONB DEFAULT NULL,
    location_data JSONB DEFAULT NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    sent BOOLEAN DEFAULT false NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    INDEX(user_id, sent, scheduled_time)
);

-- 알림 로그 테이블
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'failed')),
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 알림 상호작용 로그 테이블 (사용자가 알림을 클릭했는지 등)
CREATE TABLE IF NOT EXISTS notification_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_log_id UUID REFERENCES notification_logs(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('clicked', 'dismissed', 'viewed')),
    interaction_data JSONB DEFAULT '{}'::jsonb,
    interacted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 알림 통계 테이블
CREATE TABLE IF NOT EXISTS notification_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_sent INTEGER DEFAULT 0 NOT NULL,
    total_delivered INTEGER DEFAULT 0 NOT NULL,
    total_clicked INTEGER DEFAULT 0 NOT NULL,
    total_dismissed INTEGER DEFAULT 0 NOT NULL,
    by_type JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, date)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user_sent_time 
ON scheduled_notifications(user_id, sent, scheduled_time);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_type_sent_time 
ON scheduled_notifications(type, sent, scheduled_time);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_sent_at 
ON notification_logs(user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_type_sent_at 
ON notification_logs(type, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_interactions_user_type 
ON notification_interactions(user_id, interaction_type);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_active 
ON user_device_tokens(user_id, active);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_stats ENABLE ROW LEVEL SECURITY;

-- 사용자 알림 설정 RLS 정책
CREATE POLICY "Users can view their own notification settings"
ON user_notification_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
ON user_notification_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
ON user_notification_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 디바이스 토큰 RLS 정책
CREATE POLICY "Users can manage their own device tokens"
ON user_device_tokens FOR ALL
USING (auth.uid() = user_id);

-- 예약된 알림 RLS 정책
CREATE POLICY "Users can view their own scheduled notifications"
ON scheduled_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service can manage all scheduled notifications"
ON scheduled_notifications FOR ALL
USING (true); -- 서비스에서 모든 알림 관리

-- 알림 로그 RLS 정책
CREATE POLICY "Users can view their own notification logs"
ON notification_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service can insert notification logs"
ON notification_logs FOR INSERT
WITH CHECK (true);

-- 알림 상호작용 RLS 정책
CREATE POLICY "Users can manage their own notification interactions"
ON notification_interactions FOR ALL
USING (auth.uid() = user_id);

-- 알림 통계 RLS 정책
CREATE POLICY "Users can view their own notification stats"
ON notification_stats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service can manage notification stats"
ON notification_stats FOR ALL
USING (true);

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 생성
CREATE TRIGGER update_user_notification_settings_updated_at
    BEFORE UPDATE ON user_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_device_tokens_updated_at
    BEFORE UPDATE ON user_device_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_stats_updated_at
    BEFORE UPDATE ON notification_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 알림 통계 업데이트 함수
CREATE OR REPLACE FUNCTION update_notification_stats()
RETURNS TRIGGER AS $$
DECLARE
    stats_date DATE := DATE(NEW.sent_at);
    type_stats JSONB;
BEGIN
    -- 해당 날짜의 통계 조회
    SELECT by_type INTO type_stats
    FROM notification_stats
    WHERE user_id = NEW.user_id AND date = stats_date;

    -- 타입별 통계 업데이트
    IF type_stats IS NULL THEN
        type_stats := '{}'::jsonb;
    END IF;

    type_stats := jsonb_set(
        type_stats,
        ARRAY[NEW.type],
        COALESCE((type_stats->NEW.type)::integer, 0) + 1
    );

    -- 통계 테이블 업데이트 또는 삽입
    INSERT INTO notification_stats (user_id, date, total_sent, by_type)
    VALUES (NEW.user_id, stats_date, 1, type_stats)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        total_sent = notification_stats.total_sent + 1,
        by_type = type_stats,
        updated_at = NOW();

    RETURN NEW;
END;
$$ language 'plpgsql';

-- 알림 로그 삽입 시 통계 업데이트 트리거
CREATE TRIGGER update_notification_stats_on_log
    AFTER INSERT ON notification_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_stats();

-- 알림 상호작용 통계 업데이트 함수
CREATE OR REPLACE FUNCTION update_interaction_stats()
RETURNS TRIGGER AS $$
DECLARE
    log_record RECORD;
    stats_date DATE;
BEGIN
    -- 연관된 알림 로그 조회
    SELECT user_id, sent_at INTO log_record
    FROM notification_logs
    WHERE id = NEW.notification_log_id;

    IF log_record IS NULL THEN
        RETURN NEW;
    END IF;

    stats_date := DATE(log_record.sent_at);

    -- 상호작용 타입에 따른 통계 업데이트
    IF NEW.interaction_type = 'clicked' THEN
        UPDATE notification_stats
        SET total_clicked = total_clicked + 1,
            updated_at = NOW()
        WHERE user_id = log_record.user_id AND date = stats_date;
    ELSIF NEW.interaction_type = 'dismissed' THEN
        UPDATE notification_stats
        SET total_dismissed = total_dismissed + 1,
            updated_at = NOW()
        WHERE user_id = log_record.user_id AND date = stats_date;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- 알림 상호작용 시 통계 업데이트 트리거
CREATE TRIGGER update_interaction_stats_on_interaction
    AFTER INSERT ON notification_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_interaction_stats();

-- 오래된 알림 로그 정리 함수 (30일 이상 된 로그 삭제)
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM notification_logs
    WHERE sent_at < NOW() - INTERVAL '30 days';

    DELETE FROM notification_interactions
    WHERE interacted_at < NOW() - INTERVAL '30 days';

    DELETE FROM notification_stats
    WHERE date < CURRENT_DATE - INTERVAL '90 days';

    -- 전송된 예약 알림도 30일 후 정리
    DELETE FROM scheduled_notifications
    WHERE sent = true AND sent_at < NOW() - INTERVAL '30 days';
END;
$$ language 'plpgsql';

-- 사용자별 알림 통계 조회 함수
CREATE OR REPLACE FUNCTION get_user_notification_stats(
    p_user_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    date DATE,
    total_sent INTEGER,
    total_delivered INTEGER,
    total_clicked INTEGER,
    total_dismissed INTEGER,
    click_rate NUMERIC,
    by_type JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ns.date,
        ns.total_sent,
        ns.total_delivered,
        ns.total_clicked,
        ns.total_dismissed,
        CASE 
            WHEN ns.total_sent > 0 
            THEN ROUND((ns.total_clicked::NUMERIC / ns.total_sent::NUMERIC) * 100, 2)
            ELSE 0
        END as click_rate,
        ns.by_type
    FROM notification_stats ns
    WHERE ns.user_id = p_user_id
        AND ns.date BETWEEN p_start_date AND p_end_date
    ORDER BY ns.date DESC;
END;
$$ language 'plpgsql';

-- 댓글 추가
COMMENT ON TABLE user_notification_settings IS '사용자별 알림 설정';
COMMENT ON TABLE user_device_tokens IS '사용자 디바이스 푸시 토큰 관리';
COMMENT ON TABLE scheduled_notifications IS '예약된 알림 정보';
COMMENT ON TABLE notification_logs IS '발송된 알림 로그';
COMMENT ON TABLE notification_interactions IS '알림 상호작용 로그';
COMMENT ON TABLE notification_stats IS '일별 알림 통계';

COMMENT ON COLUMN user_notification_settings.notification_types IS '알림 타입별 활성화 여부';
COMMENT ON COLUMN user_notification_settings.quiet_hours IS '방해 금지 시간 설정';
COMMENT ON COLUMN user_notification_settings.frequency_settings IS '알림 빈도 설정';
COMMENT ON COLUMN user_notification_settings.custom_times IS '사용자 정의 알림 시간';
COMMENT ON COLUMN scheduled_notifications.recurring_settings IS '반복 알림 설정';
COMMENT ON COLUMN scheduled_notifications.location_data IS '위치 기반 알림 데이터';
COMMENT ON COLUMN notification_stats.by_type IS '타입별 알림 발송 수';