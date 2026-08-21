export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface AppInitSettings {
  id: string;
  appName: string;
  appIcon: string;
  tagline: string;
  description?: string;
  faviconUrl?: string;
  disableLandingPage: boolean;
}

export interface ApiCredential {
  id: string;
  userId?: string;
  name: string;
  publicKey: string;
  secretKeyHash?: string;
  environment: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface UserAiProvider {
  id: string;
  providerCode: string;
  providerName: string;
  isActive: boolean;
  updatedAt: string;
}

export interface CallSpec {
  id: string;
  userId?: string;
  name: string;
  slug: string;
  description?: string;
  activeVersionNumber: number;
  status: string;
  updatedAt: string;
  createdAt?: string;
  requestSchema?: any;
  responseSchema?: any;
  systemPrompt?: string;
  allowPdfInput?: boolean;
  useExternalApiKey?: boolean;
  externalApiKey?: string;
  externalModelName?: string;
  isPublished?: boolean;
  publishedTemplateId?: string;
  likesCount?: number;
  forkCount?: number;
  ratingAvg?: number;
  reviewsCount?: number;
}

export interface Template {
  id: string;
  userId?: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  isOfficial: boolean;
  isPublished?: boolean;
  forkCount?: number;
  likesCount?: number;
  ratingAvg?: number;
  reviewsCount?: number;
  isLiked?: boolean;
  requestSchema?: any;
  responseSchema?: any;
  systemPrompt?: string;
  createdAt?: string;
}

export interface TemplateComment {
  id: string;
  templateId: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ExecutionLog {
  id: string;
  requestId: string;
  userId?: string;
  specName: string;
  provider: string;
  model: string;
  status: 'SUCCESS' | 'FAILED' | 'VALIDATION_ERROR';
  httpStatus: number;
  processingTimeMs: number;
  totalTokens: number;
  costUsd: number;
  createdAt: string;
}
