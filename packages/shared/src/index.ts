export type SslStatus = "pending" | "active" | "failed" | "unknown";
export type EntityStatus = "active" | "inactive";
export type EventType = "page_view" | "download_click";
export type StatsGroupBy = "domain" | "customer" | "product" | "landing_page";
export type UserRole = "admin" | "operator";

export interface DramaItem {
  name: string;
  tag: string;
  coverUrl: string;
  gradientFrom: string;
  gradientTo: string;
}

export interface GuideStep {
  icon: string;
  title: string;
  description: string;
  tip?: string;
}

export interface LandingPageConfig {
  id: number;
  name: string;
  customerId: number;
  productId: number;
  locale: string;
  status: EntityStatus;
  pageTitle: string;
  metaDescription: string;
  brandName: string;
  brandSubtitle: string;
  logoUrl: string;
  bannerUrl: string;
  rewardText: string;
  downloadUrl: string;
  pixelId: string;
  leadStorageKey: string;
  heroTag: string;
  heroTitle: string;
  heroDescription: string;
  heroCtaText: string;
  securityBadgeText: string;
  dramasSectionTitle: string;
  dramasSectionSubtitle: string;
  dramas: DramaItem[];
  installGuideTitle: string;
  installGuideSubtitle: string;
  installSteps: GuideStep[];
  finalTitle: string;
  finalDescription: string;
  finalCtaText: string;
  footerText: string;
  modalTitlePrefix: string;
  modalDescription: string;
  modalCtaText: string;
  modalCancelText: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number;
  name: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  customerId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Domain {
  id: number;
  hostname: string;
  customerId: number;
  productId: number;
  landingPageId: number;
  status: EntityStatus;
  sslStatus: SslStatus;
  cfCustomHostnameId: string | null;
  cnameTarget: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainWithRelations extends Domain {
  customerName?: string;
  productName?: string;
  landingPageName?: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  status: EntityStatus;
  createdAt: string;
}

export interface DomainStatsSummary {
  pageViews: number;
  uniqueVisitors: number;
  botPageViews: number;
  botUniqueVisitors: number;
  downloadCount: number;
  uniqueDownloaders: number;
  conversionRate: number;
}

export interface DomainStatsDaily extends DomainStatsSummary {
  date: string;
}

export interface StatsOverviewTotals extends DomainStatsSummary {
  uniqueVisitorsSum: number;
  uniqueVisitorsDeduped: number;
  uniqueDownloadersSum: number;
  uniqueDownloadersDeduped: number;
  botUniqueVisitorsDeduped: number;
  activeDomains: number;
}

export interface StatsGroupItem extends DomainStatsSummary {
  id: number;
  name: string;
  domainCount?: number;
}

export interface DownloadByPosition {
  hero: number;
  footer: number;
  drama_modal: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreateDomainInput {
  hostname: string;
  customerId: number;
  productId: number;
  landingPageId: number;
}

export interface DomainImportRow {
  hostname: string;
  customerId: number;
  productId: number;
  landingPageId: number;
}

export interface DomainImportResult {
  success: number;
  failed: Array<{ row: number; hostname: string; error: string }>;
  warnings?: Array<{ hostname: string; message: string }>;
}

export interface AuditLog {
  id: number;
  userId: number;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: number | null;
  details: string | null;
  createdAt: string;
}

export const DEFAULT_CNAME_TARGET = "customers.yourplatform.com";
