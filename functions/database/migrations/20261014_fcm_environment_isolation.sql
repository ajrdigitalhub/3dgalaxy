-- Migration: FCM Notification Environment and Domain Isolation
-- Description: Non-destructive addition of environment, origin, project ID, and status columns
-- Safe for live production: all columns use IF NOT EXISTS with safe defaults. Existing registrations preserved.

-- 1. notification_devices (Customer/Guest Tokens)
ALTER TABLE IF EXISTS notification_devices 
  ADD COLUMN IF NOT EXISTS environment VARCHAR(50) DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS app_origin VARCHAR(255),
  ADD COLUMN IF NOT EXISTS firebase_project_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS token_status VARCHAR(50) DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_notification_devices_env ON notification_devices(environment);
CREATE INDEX IF NOT EXISTS idx_notification_devices_token_status ON notification_devices(token_status);

-- 2. admin_fcm_tokens (Admin Tokens Primary)
ALTER TABLE IF EXISTS admin_fcm_tokens 
  ADD COLUMN IF NOT EXISTS environment VARCHAR(50) DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS app_origin VARCHAR(255),
  ADD COLUMN IF NOT EXISTS firebase_project_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS token_status VARCHAR(50) DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_admin_fcm_tokens_env ON admin_fcm_tokens(environment);
CREATE INDEX IF NOT EXISTS idx_admin_fcm_tokens_token_status ON admin_fcm_tokens(token_status);

-- 3. admin_notification_devices (Admin Devices Secondary)
ALTER TABLE IF EXISTS admin_notification_devices 
  ADD COLUMN IF NOT EXISTS environment VARCHAR(50) DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS app_origin VARCHAR(255),
  ADD COLUMN IF NOT EXISTS firebase_project_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS token_status VARCHAR(50) DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_admin_notification_devices_env ON admin_notification_devices(environment);
CREATE INDEX IF NOT EXISTS idx_admin_notification_devices_token_status ON admin_notification_devices(token_status);

-- Rollback Instructions (if needed):
-- ALTER TABLE notification_devices DROP COLUMN IF EXISTS environment, DROP COLUMN IF EXISTS app_origin, DROP COLUMN IF EXISTS firebase_project_id, DROP COLUMN IF EXISTS token_status;
-- ALTER TABLE admin_fcm_tokens DROP COLUMN IF EXISTS environment, DROP COLUMN IF EXISTS app_origin, DROP COLUMN IF EXISTS firebase_project_id, DROP COLUMN IF EXISTS token_status;
-- ALTER TABLE admin_notification_devices DROP COLUMN IF EXISTS environment, DROP COLUMN IF EXISTS app_origin, DROP COLUMN IF EXISTS firebase_project_id, DROP COLUMN IF EXISTS token_status;
