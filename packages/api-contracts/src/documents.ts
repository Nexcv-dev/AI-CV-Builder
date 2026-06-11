import type { TemplateName } from '@nexcv/templates';

export type DocumentStatus = 'draft' | 'completed' | string;
export type JobStatus = 'queued' | 'processing' | 'ready' | 'failed' | 'expired';
export type HtmlPdfPlan = 'guest' | 'free' | 'payg' | 'monthly' | 'quarterly' | 'unlimited';
export type UserPlan = 'free' | 'payg' | 'monthly' | 'quarterly' | 'unlimited';
export type HtmlPdfPageSize = 'A4' | 'Letter';

export interface CvCreationQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
  reached: boolean;
  plan?: UserPlan;
  resetAt?: string | null;
}

export interface SavedDocument {
  id: string;
  title: string;
  template: string;
  status?: DocumentStatus;
  shareEnabled?: boolean;
  shareSlug?: string | null;
  shareUrl?: string | null;
  shareCreatedAt?: string | Date | null;
  shareUpdatedAt?: string | Date | null;
  shareRevokedAt?: string | Date | null;
  shareViewCount?: number;
  shareDownloadCount?: number;
  shareLastViewedAt?: string | Date | null;
  shareLastDownloadedAt?: string | Date | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDetails extends SavedDocument {
  template: TemplateName;
  cvData: any;
}

export interface DocumentsResponse {
  documents: SavedDocument[];
  quota: CvCreationQuota;
  downloadQuota?: unknown;
}

export interface DocumentResponse {
  document: DocumentDetails;
  quota?: CvCreationQuota;
}

export interface DeleteDocumentResponse {
  message: string;
}

export interface DocumentShareResponse {
  document: SavedDocument;
  shareUrl: string | null;
}

export interface QueuedJob {
  id: string;
  status: JobStatus;
  queuedInSqs?: boolean;
  pollUrl: string;
  downloadUrl?: string;
  error?: string;
  expiresAt?: string | Date;
}

export interface DownloadableJob {
  id: string;
  status: JobStatus;
  downloadUrl?: string;
  error?: string;
  expiresAt?: string | Date;
}

export interface PdfJobResponse {
  job: QueuedJob | DownloadableJob;
  quota?: any;
}

export interface HtmlPdfQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
  reached: boolean;
  plan?: HtmlPdfPlan;
  resetAt?: string | Date | null;
}

export interface HtmlPdfQuotaResponse {
  quota: HtmlPdfQuota;
}

export interface HtmlPdfJobResponse {
  job: QueuedJob | DownloadableJob;
  quota?: HtmlPdfQuota;
  maxInputBytes?: number;
}

export interface CvImportJob {
  id: string;
  status: JobStatus;
  queuedInSqs?: boolean;
  pollUrl?: string;
  error?: string;
  result?: any;
  expiresAt?: string | Date;
}

export interface CvImportJobResponse {
  job: CvImportJob;
  importQuota?: any;
}
