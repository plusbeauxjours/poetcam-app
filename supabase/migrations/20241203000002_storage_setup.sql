-- Storage 버킷 생성 및 정책 설정

-- 이미지 저장을 위한 버킷 생성 (만약 존재하지 않는다면)
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- 이미지 버킷에 대한 RLS 정책 설정

-- 누구나 이미지를 볼 수 있도록 허용 (읽기)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- 인증된 사용자만 이미지를 업로드할 수 있도록 허용 (생성)
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images' 
  AND auth.role() = 'authenticated'
);

-- 사용자는 자신이 업로드한 이미지만 삭제할 수 있도록 허용
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 사용자는 자신이 업로드한 이미지만 업데이트할 수 있도록 허용
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 이미지 파일 크기 제한 (10MB)
ALTER TABLE storage.objects 
ADD CONSTRAINT IF NOT EXISTS max_file_size 
CHECK (
  CASE 
    WHEN bucket_id = 'images' 
    THEN octet_length(metadata->>'size'::text)::bigint <= 10485760
    ELSE true 
  END
);

-- 이미지 파일 타입 제한
ALTER TABLE storage.objects 
ADD CONSTRAINT IF NOT EXISTS allowed_image_types 
CHECK (
  CASE 
    WHEN bucket_id = 'images' 
    THEN metadata->>'mimetype' IN ('image/jpeg', 'image/png', 'image/webp', 'image/heic')
    ELSE true 
  END
); 