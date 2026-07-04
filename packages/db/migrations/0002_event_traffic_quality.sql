ALTER TABLE events ADD COLUMN is_bot INTEGER NOT NULL DEFAULT 0;
ALTER TABLE domain_stats_daily ADD COLUMN human_page_views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE domain_stats_daily ADD COLUMN bot_page_views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE domain_stats_daily ADD COLUMN human_unique_visitors INTEGER NOT NULL DEFAULT 0;
ALTER TABLE domain_stats_daily ADD COLUMN bot_unique_visitors INTEGER NOT NULL DEFAULT 0;

UPDATE domain_stats_daily
SET
  human_page_views = page_views,
  human_unique_visitors = unique_visitors
WHERE human_page_views = 0 AND page_views > 0;

CREATE INDEX IF NOT EXISTS events_is_bot_created_idx ON events(is_bot, created_at);
