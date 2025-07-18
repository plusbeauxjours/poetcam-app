-- Avatar Storage Migration
-- Migration: 20241203000003_avatar_storage.sql

-- ================================================
-- STORAGE BUCKET FOR AVATARS
-- ================================================

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

-- ================================================
-- STORAGE POLICIES FOR AVATARS
-- ================================================

-- Allow users to upload their own avatars
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to view avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- ================================================
-- FILE SIZE AND TYPE RESTRICTIONS
-- ================================================

-- Create function to validate avatar uploads
CREATE OR REPLACE FUNCTION validate_avatar_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Check file size (max 2MB)
  IF NEW.metadata->>'size' IS NOT NULL AND 
     (NEW.metadata->>'size')::bigint > 2097152 THEN
    RAISE EXCEPTION 'File size exceeds 2MB limit';
  END IF;
  
  -- Check file type (only images)
  IF NEW.metadata->>'mimetype' IS NOT NULL AND 
     NEW.metadata->>'mimetype' NOT LIKE 'image/%' THEN
    RAISE EXCEPTION 'Only image files are allowed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply validation trigger to avatars bucket
CREATE TRIGGER validate_avatar_uploads
  BEFORE INSERT OR UPDATE ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'avatars')
  EXECUTE FUNCTION validate_avatar_upload();

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Function to clean up old avatar files when a new one is uploaded
CREATE OR REPLACE FUNCTION cleanup_old_avatars()
RETURNS TRIGGER AS $$
DECLARE
  old_avatar_path text;
  user_folder text;
BEGIN
  -- Extract user ID from the file path
  user_folder := (storage.foldername(NEW.name))[1];
  
  -- If this is an avatar upload, delete old avatar files for this user
  IF NEW.bucket_id = 'avatars' AND user_folder = auth.uid()::text THEN
    -- Delete old avatar files for this user (keep only the newest one)
    DELETE FROM storage.objects 
    WHERE bucket_id = 'avatars' 
      AND (storage.foldername(name))[1] = user_folder
      AND name != NEW.name
      AND created_at < NEW.created_at;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply cleanup trigger
CREATE TRIGGER cleanup_old_avatars_trigger
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_avatars();

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON FUNCTION validate_avatar_upload() IS 'Validates avatar uploads for size and type restrictions';
COMMENT ON FUNCTION cleanup_old_avatars() IS 'Automatically removes old avatar files when a new one is uploaded'; 