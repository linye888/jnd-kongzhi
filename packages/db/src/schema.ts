import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const landingPages = sqliteTable("landing_pages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  productId: integer("product_id").notNull().references(() => products.id),
  locale: text("locale").notNull().default("en"),
  status: text("status").notNull().default("active"),
  pageTitle: text("page_title").notNull(),
  metaDescription: text("meta_description").notNull(),
  brandName: text("brand_name").notNull(),
  brandSubtitle: text("brand_subtitle").notNull(),
  logoUrl: text("logo_url").notNull(),
  bannerUrl: text("banner_url").notNull(),
  rewardText: text("reward_text").notNull(),
  downloadUrl: text("download_url").notNull(),
  pixelId: text("pixel_id").notNull(),
  leadStorageKey: text("lead_storage_key").notNull(),
  heroTag: text("hero_tag").notNull(),
  heroTitle: text("hero_title").notNull(),
  heroDescription: text("hero_description").notNull(),
  heroCtaText: text("hero_cta_text").notNull(),
  securityBadgeText: text("security_badge_text").notNull(),
  dramasSectionTitle: text("dramas_section_title").notNull(),
  dramasSectionSubtitle: text("dramas_section_subtitle").notNull(),
  dramasJson: text("dramas_json").notNull(),
  installGuideTitle: text("install_guide_title").notNull(),
  installGuideSubtitle: text("install_guide_subtitle").notNull(),
  installStepsJson: text("install_steps_json").notNull(),
  finalTitle: text("final_title").notNull(),
  finalDescription: text("final_description").notNull(),
  finalCtaText: text("final_cta_text").notNull(),
  footerText: text("footer_text").notNull(),
  modalTitlePrefix: text("modal_title_prefix").notNull(),
  modalDescription: text("modal_description").notNull(),
  modalCtaText: text("modal_cta_text").notNull(),
  modalCancelText: text("modal_cancel_text").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const domains = sqliteTable(
  "domains",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hostname: text("hostname").notNull(),
    customerId: integer("customer_id").notNull().references(() => customers.id),
    productId: integer("product_id").notNull().references(() => products.id),
    landingPageId: integer("landing_page_id").notNull().references(() => landingPages.id),
    status: text("status").notNull().default("active"),
    sslStatus: text("ssl_status").notNull().default("pending"),
    cfCustomHostnameId: text("cf_custom_hostname_id"),
    cnameTarget: text("cname_target"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("domains_hostname_unique").on(table.hostname)],
);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const assets = sqliteTable("assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").references(() => customers.id),
  filename: text("filename").notNull(),
  r2Key: text("r2_key").notNull(),
  url: text("url").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: text("created_at").notNull(),
});

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    domainId: integer("domain_id").notNull().references(() => domains.id),
    landingPageId: integer("landing_page_id").notNull(),
    customerId: integer("customer_id").notNull(),
    productId: integer("product_id").notNull(),
    eventType: text("event_type").notNull(),
    visitorId: text("visitor_id").notNull(),
    buttonPosition: text("button_position"),
    country: text("country"),
    referrer: text("referrer"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("events_domain_created_idx").on(table.domainId, table.createdAt),
    index("events_type_created_idx").on(table.eventType, table.createdAt),
    index("events_visitor_idx").on(table.visitorId, table.createdAt),
  ],
);

export const domainStatsDaily = sqliteTable(
  "domain_stats_daily",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    domainId: integer("domain_id").notNull().references(() => domains.id),
    statDate: text("stat_date").notNull(),
    pageViews: integer("page_views").notNull().default(0),
    uniqueVisitors: integer("unique_visitors").notNull().default(0),
    downloadCount: integer("download_count").notNull().default(0),
    uniqueDownloaders: integer("unique_downloaders").notNull().default(0),
  },
  (table) => [uniqueIndex("domain_stats_daily_unique").on(table.domainId, table.statDate)],
);

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  details: text("details"),
  createdAt: text("created_at").notNull(),
});

export type CustomerRow = typeof customers.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type LandingPageRow = typeof landingPages.$inferSelect;
export type DomainRow = typeof domains.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type EventRow = typeof events.$inferSelect;
