-- 샘플 챌린지 데이터 삽입
-- 주의: 이 스크립트는 관리자 권한으로 실행해야 합니다.

-- 일일 챌린지
INSERT INTO challenges (type, title, description, difficulty, status, start_date, end_date, goals, rewards, metadata)
VALUES (
    'daily',
    '오늘의 시작',
    '오늘 하루 3장의 사진을 찍고 각각에 시를 작성해보세요.',
    'easy',
    'active',
    NOW(),
    NOW() + INTERVAL '24 hours',
    '[
        {
            "type": "photo_count",
            "target": 3,
            "description": "사진 3장 촬영"
        },
        {
            "type": "poem_create",
            "target": 3,
            "description": "시 3편 작성"
        }
    ]'::jsonb,
    '[
        {
            "type": "points",
            "value": 50,
            "description": "일일 챌린지 완료 포인트"
        },
        {
            "type": "experience",
            "value": 10,
            "description": "경험치 +10"
        }
    ]'::jsonb,
    '{
        "recurring": {
            "frequency": "daily",
            "resetTime": "00:00"
        }
    }'::jsonb
);

-- 주간 챌린지
INSERT INTO challenges (type, title, description, difficulty, status, start_date, end_date, goals, rewards)
VALUES (
    'weekly',
    '주간 시인의 길',
    '이번 주 동안 다양한 장소에서 10편의 시를 작성해보세요.',
    'medium',
    'active',
    NOW(),
    NOW() + INTERVAL '7 days',
    '[
        {
            "type": "poem_create",
            "target": 10,
            "description": "시 10편 작성"
        },
        {
            "type": "unique_locations",
            "target": 5,
            "description": "서로 다른 5곳에서 작성"
        }
    ]'::jsonb,
    '[
        {
            "type": "points",
            "value": 200,
            "description": "주간 챌린지 완료 포인트"
        },
        {
            "type": "badge",
            "value": "weekly_poet",
            "description": "주간 시인 배지"
        }
    ]'::jsonb
);

-- 위치 기반 챌린지
INSERT INTO challenges (type, title, description, difficulty, status, start_date, end_date, goals, rewards, metadata)
VALUES (
    'location',
    '한강에서의 영감',
    '한강 공원에서 사진을 찍고 시를 작성해보세요.',
    'easy',
    'active',
    NOW(),
    NOW() + INTERVAL '30 days',
    '[
        {
            "type": "location_visit",
            "target": 1,
            "description": "한강 공원 방문"
        },
        {
            "type": "poem_create",
            "target": 1,
            "description": "한강에서 시 1편 작성"
        }
    ]'::jsonb,
    '[
        {
            "type": "points",
            "value": 100,
            "description": "위치 기반 챌린지 완료 포인트"
        },
        {
            "type": "title",
            "value": "river_poet",
            "description": "강변 시인 칭호"
        }
    ]'::jsonb,
    '{
        "location": {
            "latitude": 37.5326,
            "longitude": 126.9903,
            "radius": 2000,
            "name": "한강 공원"
        }
    }'::jsonb
);

-- 업적 챌린지
INSERT INTO challenges (type, title, description, difficulty, status, start_date, end_date, goals, rewards)
VALUES (
    'achievement',
    '시작하는 시인',
    '첫 번째 시를 작성하고 포에캠의 세계로 들어오세요.',
    'easy',
    'active',
    NOW(),
    NOW() + INTERVAL '365 days',
    '[
        {
            "type": "poem_create",
            "target": 1,
            "description": "첫 시 작성"
        }
    ]'::jsonb,
    '[
        {
            "type": "badge",
            "value": "first_poem",
            "description": "첫 시 배지"
        },
        {
            "type": "points",
            "value": 30,
            "description": "시작 보너스 포인트"
        }
    ]'::jsonb
);

-- 특별 이벤트 챌린지 (예정됨)
INSERT INTO challenges (type, title, description, difficulty, status, start_date, end_date, goals, rewards, requirements)
VALUES (
    'special',
    '봄의 서정',
    '봄을 주제로 한 시를 5편 작성해보세요.',
    'hard',
    'upcoming',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '37 days',
    '[
        {
            "type": "themed_poem",
            "target": 5,
            "description": "봄 주제 시 5편"
        }
    ]'::jsonb,
    '[
        {
            "type": "badge",
            "value": "spring_poet_2024",
            "description": "2024 봄의 시인 한정판 배지"
        },
        {
            "type": "points",
            "value": 500,
            "description": "특별 챌린지 완료 포인트"
        }
    ]'::jsonb,
    '{
        "minLevel": 5
    }'::jsonb
);

-- 추가 일일 챌린지 예시
INSERT INTO challenges (type, title, description, difficulty, status, start_date, end_date, goals, rewards, metadata)
VALUES (
    'daily',
    '아침의 시선',
    '오전 9시 이전에 사진을 찍고 시를 작성해보세요.',
    'medium',
    'active',
    NOW(),
    NOW() + INTERVAL '24 hours',
    '[
        {
            "type": "morning_poem",
            "target": 1,
            "description": "오전 9시 이전 시 작성"
        }
    ]'::jsonb,
    '[
        {
            "type": "points",
            "value": 70,
            "description": "아침 챌린지 완료 포인트"
        },
        {
            "type": "experience",
            "value": 15,
            "description": "경험치 +15"
        }
    ]'::jsonb,
    '{
        "recurring": {
            "frequency": "daily",
            "resetTime": "00:00"
        },
        "timeConstraint": {
            "startTime": "00:00",
            "endTime": "09:00"
        }
    }'::jsonb
);

-- 고난도 업적 챌린지
INSERT INTO challenges (type, title, description, difficulty, status, start_date, end_date, goals, rewards, requirements)
VALUES (
    'achievement',
    '시의 달인',
    '총 100편의 시를 작성하여 진정한 시인이 되어보세요.',
    'expert',
    'active',
    NOW(),
    NOW() + INTERVAL '365 days',
    '[
        {
            "type": "poem_create",
            "target": 100,
            "description": "시 100편 작성"
        }
    ]'::jsonb,
    '[
        {
            "type": "badge",
            "value": "master_poet",
            "description": "시의 달인 배지"
        },
        {
            "type": "title",
            "value": "master_poet",
            "description": "시의 달인 칭호"
        },
        {
            "type": "points",
            "value": 1000,
            "description": "달인 달성 보너스 포인트"
        }
    ]'::jsonb,
    '{
        "minLevel": 10,
        "requiredChallenges": []
    }'::jsonb
);

-- 위치 기반 챌린지 추가 예시
INSERT INTO challenges (type, title, description, difficulty, status, start_date, end_date, goals, rewards, metadata)
VALUES (
    'location',
    '남산타워의 낭만',
    '남산타워에서 야경을 배경으로 시를 작성해보세요.',
    'medium',
    'active',
    NOW(),
    NOW() + INTERVAL '60 days',
    '[
        {
            "type": "location_visit",
            "target": 1,
            "description": "남산타워 방문"
        },
        {
            "type": "night_poem",
            "target": 1,
            "description": "야간 시 작성"
        }
    ]'::jsonb,
    '[
        {
            "type": "points",
            "value": 150,
            "description": "위치 챌린지 완료 포인트"
        },
        {
            "type": "badge",
            "value": "night_poet",
            "description": "야경 시인 배지"
        }
    ]'::jsonb,
    '{
        "location": {
            "latitude": 37.5512,
            "longitude": 126.9882,
            "radius": 500,
            "name": "남산타워"
        },
        "timeConstraint": {
            "startTime": "18:00",
            "endTime": "23:59"
        }
    }'::jsonb
);