-- Add password column to user table
ALTER TABLE user ADD COLUMN password VARCHAR(255) AFTER date_of_birth;
