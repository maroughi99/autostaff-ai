-- Add progress column to quote_items table
ALTER TABLE quote_items ADD COLUMN progress INTEGER DEFAULT 0;
