-- Add missing status values to enums

-- Add 'partially_published' to post_status enum
ALTER TYPE post_status ADD VALUE IF NOT EXISTS 'partially_published';

-- Add 'draft' to platform_post_status enum
ALTER TYPE platform_post_status ADD VALUE IF NOT EXISTS 'draft';
