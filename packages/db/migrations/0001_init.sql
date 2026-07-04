CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS landing_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  locale TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'active',
  page_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  brand_subtitle TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  banner_url TEXT NOT NULL,
  reward_text TEXT NOT NULL,
  download_url TEXT NOT NULL,
  pixel_id TEXT NOT NULL,
  lead_storage_key TEXT NOT NULL,
  hero_tag TEXT NOT NULL,
  hero_title TEXT NOT NULL,
  hero_description TEXT NOT NULL,
  hero_cta_text TEXT NOT NULL,
  security_badge_text TEXT NOT NULL,
  dramas_section_title TEXT NOT NULL,
  dramas_section_subtitle TEXT NOT NULL,
  dramas_json TEXT NOT NULL,
  install_guide_title TEXT NOT NULL,
  install_guide_subtitle TEXT NOT NULL,
  install_steps_json TEXT NOT NULL,
  final_title TEXT NOT NULL,
  final_description TEXT NOT NULL,
  final_cta_text TEXT NOT NULL,
  footer_text TEXT NOT NULL,
  modal_title_prefix TEXT NOT NULL,
  modal_description TEXT NOT NULL,
  modal_cta_text TEXT NOT NULL,
  modal_cancel_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostname TEXT NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  landing_page_id INTEGER NOT NULL REFERENCES landing_pages(id),
  status TEXT NOT NULL DEFAULT 'active',
  ssl_status TEXT NOT NULL DEFAULT 'pending',
  cf_custom_hostname_id TEXT,
  cname_target TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS domains_hostname_unique ON domains(hostname);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER REFERENCES customers(id),
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER NOT NULL REFERENCES domains(id),
  landing_page_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  button_position TEXT,
  country TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS events_domain_created_idx ON events(domain_id, created_at);
CREATE INDEX IF NOT EXISTS events_type_created_idx ON events(event_type, created_at);
CREATE INDEX IF NOT EXISTS events_visitor_idx ON events(visitor_id, created_at);

CREATE TABLE IF NOT EXISTS domain_stats_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER NOT NULL REFERENCES domains(id),
  stat_date TEXT NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  unique_downloaders INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS domain_stats_daily_unique ON domain_stats_daily(domain_id, stat_date);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  details TEXT,
  created_at TEXT NOT NULL
);
