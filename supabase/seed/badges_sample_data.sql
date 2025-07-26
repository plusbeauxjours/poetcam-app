-- 뱃지 시스템 샘플 데이터

-- 초보자 뱃지들
INSERT INTO badges (name, description, category, rarity, icon_name, icon_color, conditions, points, is_secret, is_limited, metadata)
VALUES 
-- 첫 걸음 뱃지
(
    '첫 걸음',
    '포에캠에 첫 번째 시를 작성해보세요.',
    'beginner',
    'common',
    'emoji:🌱',
    '#10B981',
    '[{"type": "poem_count", "target": 1, "period": "all_time"}]'::jsonb,
    10,
    false,
    false,
    '{"artist": "포에캠 디자인팀", "version": "1.0"}'::jsonb
),

-- 사진 초보자
(
    '첫 번째 순간',
    '첫 번째 사진을 촬영하고 기록해보세요.',
    'beginner',
    'common',
    'emoji:📸',
    '#10B981',
    '[{"type": "photo_count", "target": 1, "period": "all_time"}]'::jsonb,
    10,
    false,
    false,
    '{"artist": "포에캠 디자인팀", "version": "1.0"}'::jsonb
),

-- 챌린지 초보자
(
    '도전자',
    '첫 번째 챌린지를 완료해보세요.',
    'beginner',
    'common',
    'emoji:🎯',
    '#10B981',
    '[{"type": "challenge_complete", "target": 1, "period": "all_time"}]'::jsonb,
    20,
    false,
    false,
    '{"artist": "포에캠 디자인팀", "version": "1.0"}'::jsonb
);

-- 창작 활동 뱃지들
INSERT INTO badges (name, description, category, rarity, icon_name, icon_color, conditions, points, is_secret, is_limited)
VALUES 
-- 시인의 시작
(
    '시인의 시작',
    '총 10편의 시를 작성하여 진정한 시인의 길에 들어서세요.',
    'creative',
    'uncommon',
    'emoji:📝',
    '#10B981',
    '[{"type": "poem_count", "target": 10, "period": "all_time"}]'::jsonb,
    50,
    false,
    false
),

-- 창작의 열정
(
    '창작의 열정',
    '50편의 시를 작성한 열정적인 창작자입니다.',
    'creative',
    'rare',
    'emoji:🔥',
    '#EF4444',
    '[{"type": "poem_count", "target": 50, "period": "all_time"}]'::jsonb,
    200,
    false,
    false
),

-- 프롤리픽 라이터
(
    '프롤리픽 라이터',
    '하루에 5편의 시를 작성한 다작 작가입니다.',
    'creative',
    'epic',
    'emoji:✍️',
    '#8B5CF6',
    '[{"type": "poem_count", "target": 5, "period": "daily"}]'::jsonb,
    300,
    false,
    false
);

-- 위치 기반 뱃지들
INSERT INTO badges (name, description, category, rarity, icon_name, icon_color, conditions, points, is_secret, is_limited, metadata)
VALUES 
-- 한강의 시인
(
    '한강의 시인',
    '한강에서 사진을 찍고 시를 작성해보세요.',
    'location',
    'rare',
    'emoji:🌊',
    '#3B82F6',
    '[{"type": "specific_challenge", "target": 1, "specificValue": "hanriver_challenge"}]'::jsonb,
    100,
    false,
    false,
    '{"location": {"name": "한강공원", "latitude": 37.5326, "longitude": 126.9903}}'::jsonb
),

-- 남산의 낭만
(
    '남산의 낭만',
    '남산타워에서 야경과 함께 시를 작성해보세요.',
    'location',
    'rare',
    'emoji:🗼',
    '#F59E0B',
    '[{"type": "specific_challenge", "target": 1, "specificValue": "namsan_challenge"}]'::jsonb,
    120,
    false,
    false,
    '{"location": {"name": "남산타워", "latitude": 37.5512, "longitude": 126.9882}}'::jsonb
),

-- 도시 탐험가
(
    '도시 탐험가',
    '10개의 서로 다른 위치에서 시를 작성해보세요.',
    'location',
    'epic',
    'emoji:🗺️',
    '#8B5CF6',
    '[{"type": "location_visit", "target": 10, "period": "all_time"}]'::jsonb,
    500,
    false,
    false,
    '{}'::jsonb
);

-- 챌린지 뱃지들
INSERT INTO badges (name, description, category, rarity, icon_name, icon_color, conditions, points, is_secret, is_limited)
VALUES 
-- 챌린지 애호가
(
    '챌린지 애호가',
    '10개의 챌린지를 완료한 도전 정신이 강한 사용자입니다.',
    'challenge',
    'uncommon',
    'emoji:🏅',
    '#10B981',
    '[{"type": "challenge_complete", "target": 10, "period": "all_time"}]'::jsonb,
    100,
    false,
    false
),

-- 챌린지 마스터
(
    '챌린지 마스터',
    '50개의 챌린지를 완료한 진정한 도전자입니다.',
    'challenge',
    'epic',
    'emoji:🏆',
    '#8B5CF6',
    '[{"type": "challenge_complete", "target": 50, "period": "all_time"}]'::jsonb,
    500,
    false,
    false
),

-- 완벽주의자
(
    '완벽주의자',
    '연속으로 10개의 챌린지를 완료해보세요.',
    'challenge',
    'rare',
    'emoji:💎',
    '#3B82F6',
    '[{"type": "consecutive_days", "target": 10, "period": "daily"}]'::jsonb,
    300,
    false,
    false
);

-- 소셜 활동 뱃지들
INSERT INTO badges (name, description, category, rarity, icon_name, icon_color, conditions, points, is_secret, is_limited)
VALUES 
-- 인기 작가
(
    '인기 작가',
    '작품에 총 100개의 좋아요를 받아보세요.',
    'social',
    'uncommon',
    'emoji:❤️',
    '#EF4444',
    '[{"type": "like_received", "target": 100, "period": "all_time"}]'::jsonb,
    80,
    false,
    false
),

-- 소셜 버터플라이
(
    '소셜 버터플라이',
    '다른 사용자의 작품에 50개의 댓글을 작성해보세요.',
    'social',
    'uncommon',
    'emoji:💬',
    '#10B981',
    '[{"type": "comment_count", "target": 50, "period": "all_time"}]'::jsonb,
    60,
    false,
    false
),

-- 바이럴 스타
(
    '바이럴 스타',
    '작품을 100번 공유하여 많은 사람들과 나누어보세요.',
    'social',
    'rare',
    'emoji:📢',
    '#3B82F6',
    '[{"type": "share_count", "target": 100, "period": "all_time"}]'::jsonb,
    150,
    false,
    false
);

-- 업적 뱃지들
INSERT INTO badges (name, description, category, rarity, icon_name, icon_color, conditions, points, is_secret, is_limited)
VALUES 
-- 연속 창작자
(
    '연속 창작자',
    '7일 연속으로 시를 작성한 꾸준한 창작자입니다.',
    'achievement',
    'uncommon',
    'emoji:🔥',
    '#EF4444',
    '[{"type": "consecutive_days", "target": 7, "period": "daily"}]'::jsonb,
    150,
    false,
    false
),

-- 마라톤 러너
(
    '마라톤 러너',
    '30일 연속으로 활동한 끈기 있는 사용자입니다.',
    'achievement',
    'epic',
    'emoji:🏃',
    '#8B5CF6',
    '[{"type": "consecutive_days", "target": 30, "period": "daily"}]'::jsonb,
    600,
    false,
    false
),

-- 포인트 콜렉터
(
    '포인트 콜렉터',
    '총 5000포인트를 획득한 열정적인 사용자입니다.',
    'achievement',
    'rare',
    'emoji:⭐',
    '#F59E0B',
    '[{"type": "total_points", "target": 5000, "period": "all_time"}]'::jsonb,
    200,
    false,
    false
),

-- 전설의 시인
(
    '전설의 시인',
    '100편의 시를 작성하고 10000포인트를 획득한 전설적인 시인입니다.',
    'achievement',
    'legendary',
    'emoji:👑',
    '#F59E0B',
    '[
        {"type": "poem_count", "target": 100, "period": "all_time"},
        {"type": "total_points", "target": 10000, "period": "all_time"}
    ]'::jsonb,
    1000,
    false,
    false
);

-- 특별 뱃지들 (숨겨진 뱃지)
INSERT INTO badges (name, description, category, rarity, icon_name, icon_color, conditions, points, is_secret, is_limited, unlock_hint, metadata)
VALUES 
-- 새벽의 시인
(
    '새벽의 시인',
    '새벽 시간(5-7시)에 시를 작성한 특별한 시인입니다.',
    'special',
    'rare',
    'emoji:🌅',
    '#F59E0B',
    '[{"type": "time_based", "target": 5, "timeConstraint": {"startTime": "05:00", "endTime": "07:00"}}]'::jsonb,
    200,
    true,
    false,
    '새벽 시간에 시를 작성해보세요.',
    '{"unlockCondition": "dawn_writing"}'::jsonb
),

-- 심야의 몽상가
(
    '심야의 몽상가',
    '자정 이후(0-2시)에 시를 작성한 밤의 시인입니다.',
    'special',
    'rare',
    'emoji:🌙',
    '#6366F1',
    '[{"type": "time_based", "target": 3, "timeConstraint": {"startTime": "00:00", "endTime": "02:00"}}]'::jsonb,
    180,
    true,
    false,
    '깊은 밤에 영감을 찾아보세요.',
    '{"unlockCondition": "midnight_writing"}'::jsonb
),

-- 완벽주의자의 시크릿
(
    '완벽주의자',
    '한 번도 실패하지 않고 50개의 챌린지를 연속으로 성공한 완벽주의자입니다.',
    'special',
    'legendary',
    'emoji:💎',
    '#8B5CF6',
    '[{"type": "challenge_complete", "target": 50, "period": "all_time"}]'::jsonb,
    800,
    true,
    false,
    '완벽한 성공률을 유지해보세요.',
    '{"unlockCondition": "perfect_success_rate"}'::jsonb
);

-- 계절 한정 뱃지들
INSERT INTO badges (name, description, category, rarity, icon_name, icon_color, conditions, points, is_secret, is_limited, metadata)
VALUES 
-- 봄의 전령
(
    '봄의 전령',
    '2024년 봄 이벤트 참여자에게 주어지는 한정 뱃지입니다.',
    'seasonal',
    'epic',
    'emoji:🌸',
    '#EC4899',
    '[{
        "type": "seasonal_event", 
        "target": 1, 
        "specificValue": "spring_2024_event",
        "timeConstraint": {
            "dateRange": {
                "start": "2024-03-01T00:00:00Z",
                "end": "2024-05-31T23:59:59Z"
            }
        }
    }]'::jsonb,
    300,
    false,
    true,
    '{"event": "spring_2024", "expiryDate": "2024-05-31T23:59:59Z"}'::jsonb
),

-- 여름의 태양
(
    '여름의 태양',
    '2024년 여름 이벤트 참여자에게 주어지는 한정 뱃지입니다.',
    'seasonal',
    'epic',
    'emoji:☀️',
    '#F59E0B',
    '[{
        "type": "seasonal_event", 
        "target": 1, 
        "specificValue": "summer_2024_event",
        "timeConstraint": {
            "dateRange": {
                "start": "2024-06-01T00:00:00Z",
                "end": "2024-08-31T23:59:59Z"
            }
        }
    }]'::jsonb,
    300,
    false,
    true,
    '{"event": "summer_2024", "expiryDate": "2024-08-31T23:59:59Z"}'::jsonb
),

-- 크리스마스 시인
(
    '크리스마스 시인',
    '2024년 크리스마스 이벤트 참여자에게 주어지는 특별 뱃지입니다.',
    'seasonal',
    'legendary',
    'emoji:🎄',
    '#10B981',
    '[{
        "type": "seasonal_event", 
        "target": 1, 
        "specificValue": "christmas_2024_event",
        "timeConstraint": {
            "dateRange": {
                "start": "2024-12-20T00:00:00Z",
                "end": "2024-12-26T23:59:59Z"
            }
        }
    }]'::jsonb,
    500,
    false,
    true,
    '{"event": "christmas_2024", "expiryDate": "2024-12-26T23:59:59Z"}'::jsonb
);

-- 추가 창작 뱃지들
INSERT INTO badges (name, description, category, rarity, icon_name, icon_color, conditions, points, is_secret, is_limited)
VALUES 
-- 다양성의 창작자
(
    '다양성의 창작자',
    '10가지 다른 스타일로 시를 작성해보세요.',
    'creative',
    'rare',
    'emoji:🎨',
    '#8B5CF6',
    '[{"type": "poem_count", "target": 10, "period": "all_time"}]'::jsonb,
    250,
    false,
    false
),

-- 감정 탐험가
(
    '감정 탐험가',
    '기쁨, 슬픔, 분노, 평온 등 다양한 감정을 담은 시를 작성해보세요.',
    'creative',
    'uncommon',
    'emoji:🎭',
    '#EC4899',
    '[{"type": "poem_count", "target": 20, "period": "all_time"}]'::jsonb,
    120,
    false,
    false
);

-- 뱃지 데이터 삽입 완료 후 통계 업데이트
-- (실제 사용 시에는 트리거나 함수로 자동화)
REFRESH MATERIALIZED VIEW IF EXISTS user_badge_stats;