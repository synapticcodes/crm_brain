-- =====================================================
-- Create Storage Bucket and RLS Policies
-- Description: brain-private bucket for tenant-scoped files
-- Author: Claude Code
-- Date: 2026-01-13
-- =====================================================

-- Create brain-private bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brain-private',
  'brain-private',
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'audio/mpeg', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS tenant_upload_policy ON storage.objects;
DROP POLICY IF EXISTS tenant_read_policy ON storage.objects;
DROP POLICY IF EXISTS tenant_update_policy ON storage.objects;
DROP POLICY IF EXISTS tenant_delete_policy ON storage.objects;

-- Policy: Users can upload files to their tenant folder
CREATE POLICY tenant_upload_policy
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brain-private'
  AND (storage.foldername(name))[1] = brain.current_tenancy_id()::TEXT
);

-- Policy: Users can read files from their tenant folder
CREATE POLICY tenant_read_policy
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'brain-private'
  AND (storage.foldername(name))[1] = brain.current_tenancy_id()::TEXT
);

-- Policy: Users can update files in their tenant folder
CREATE POLICY tenant_update_policy
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brain-private'
  AND (storage.foldername(name))[1] = brain.current_tenancy_id()::TEXT
)
WITH CHECK (
  bucket_id = 'brain-private'
  AND (storage.foldername(name))[1] = brain.current_tenancy_id()::TEXT
);

-- Policy: Users can delete files from their tenant folder
CREATE POLICY tenant_delete_policy
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'brain-private'
  AND (storage.foldername(name))[1] = brain.current_tenancy_id()::TEXT
);

-- Success message
SELECT 'Storage bucket created successfully!' AS message;
