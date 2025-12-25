-- Make the storage buckets public so files can be accessed
UPDATE storage.buckets SET public = true WHERE id = 'chat-files';
UPDATE storage.buckets SET public = true WHERE id = 'voice-notes';
UPDATE storage.buckets SET public = true WHERE id = 'avatars';