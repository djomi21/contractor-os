-- Add mustChangePassword column to User table
-- Run this in Supabase SQL Editor

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Set existing users to false (they already have passwords)
UPDATE "User" SET "mustChangePassword" = false;
