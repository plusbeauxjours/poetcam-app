-- Sample challenges data for testing
-- Note: This requires admin privileges to insert

-- Daily challenge
INSERT INTO challenges (
  type, title, description, difficulty, status, start_date, end_date, goals, rewards
) VALUES (
  'daily'::challenge_type,
  '오늘의 시작',
  '오늘 하루 3장의 사진을 찍고 각각에 시를 작성해보세요.',
  'easy'::challenge_difficulty,
  'active'::challenge_status,
  NOW(),
  NOW() + INTERVAL '1 day',
  '[
    {
      "type": "photo_count",
      "target": 3,
      "current": 0,
      "description": "사진 3장 촬영"
    },
    {
      "type": "poem_create", 
      "target": 3,
      "current": 0,
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
  ]'::jsonb
);

-- Weekly challenge
INSERT INTO challenges (
  type, title, description, difficulty, status, start_date, end_date, goals, rewards
) VALUES (
  'weekly'::challenge_type,
  '주간 시인의 길',
  '이번 주 동안 다양한 장소에서 10편의 시를 작성해보세요.',
  'medium'::challenge_difficulty,
  'active'::challenge_status,
  NOW(),
  NOW() + INTERVAL '7 days',
  '[
    {
      "type": "poem_create",
      "target": 10,
      "current": 0,
      "description": "시 10편 작성"
    },
    {
      "type": "unique_locations",
      "target": 5,
      "current": 0,
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

-- Location-based challenge
INSERT INTO challenges (
  type, title, description, difficulty, status, start_date, end_date, goals, rewards, metadata
) VALUES (
  'location'::challenge_type,
  '한강에서의 영감',
  '한강 공원에서 사진을 찍고 시를 작성해보세요.',
  'easy'::challenge_difficulty,
  'active'::challenge_status,
  NOW(),
  NOW() + INTERVAL '30 days',
  '[
    {
      "type": "location_visit",
      "target": 1,
      "current": 0,
      "description": "한강 공원 방문"
    },
    {
      "type": "poem_create",
      "target": 1,
      "current": 0,
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

-- Achievement challenge
INSERT INTO challenges (
  type, title, description, difficulty, status, start_date, end_date, goals, rewards
) VALUES (
  'achievement'::challenge_type,
  '시작하는 시인',
  '첫 번째 시를 작성하고 포에캠의 세계로 들어오세요.',
  'easy'::challenge_difficulty,
  'active'::challenge_status,
  NOW(),
  NOW() + INTERVAL '365 days',
  '[
    {
      "type": "poem_create",
      "target": 1,
      "current": 0,
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

-- Special challenge (upcoming)
INSERT INTO challenges (
  type, title, description, difficulty, status, start_date, end_date, goals, rewards, requirements
) VALUES (
  'special'::challenge_type,
  '봄의 서정',
  '봄을 주제로 한 시를 5편 작성해보세요.',
  'hard'::challenge_difficulty,
  'upcoming'::challenge_status,
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '37 days',
  '[
    {
      "type": "themed_poem",
      "target": 5,
      "current": 0,
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