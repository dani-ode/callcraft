export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppInitSettings {
  id: string;
  appName: string;
  appIcon: string;
  tagline: string;
  description?: string;
  faviconUrl?: string;
  disableLandingPage: boolean;
  defaultRegistrationStatus?: string;
  requireEmailVerification?: boolean;
}

export interface ApiCredential {
  id: string;
  userId?: string;
  projectId?: string;
  name: string;
  publicKey: string;
  secretKeyHash?: string;
  environment: string;
  ipWhitelist?: string[];
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

export interface ToolDefinition {
  name: string;
  description: string;
  agentRole?: string;
  toolChoice?: 'auto' | 'required' | 'none';
  parameters?: Record<string, any>;
  textContext?: string;
  includeImageContext?: boolean;
  imagesContext?: string[];
  context?: {
    textContext?: string;
    includeImageContext?: boolean;
    imagesContext?: string[];
  };
}

export interface ToolCallingConfig {
  enabled: boolean;
  toolChoice: 'auto' | 'required' | 'none';
  tools: ToolDefinition[];
}

export interface CallSpec {
  id: string;
  userId?: string;
  projectId?: string;
  name: string;
  slug: string;
  description?: string;
  activeVersionNumber: number;
  status: string;
  updatedAt: string;
  createdAt?: string;
  requestSchema?: any;
  responseSchema?: any;
  toolsConfig?: ToolCallingConfig;
  positivePrompt?: string;
  extractionPrompt?: string;
  negativePrompt?: string;
  additionalPrompt?: string;
  allowAdditionalPrompt?: boolean;
  allowPdfInput?: boolean;
  useExternalApiKey?: boolean;
  externalApiKey?: string;
  externalModelName?: string;
  provider?: string;
  isPublished?: boolean;
  publishedTemplateId?: string;
  likesCount?: number;
  forkCount?: number;
  ratingAvg?: number;
  reviewsCount?: number;
}

export interface Template {
  id: string;
  specId?: string;
  userId?: string;
  authorName?: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  categories?: string[];
  isOfficial: boolean;
  isPublished?: boolean;
  forkCount?: number;
  likesCount?: number;
  ratingAvg?: number;
  reviewsCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  requestSchema?: any;
  responseSchema?: any;
  toolsConfig?: ToolCallingConfig;
  positivePrompt?: string;
  extractionPrompt?: string;
  negativePrompt?: string;
  additionalPrompt?: string;
  allowAdditionalPrompt?: boolean;
  createdAt?: string;
}

export interface UserProfileDetail {
  id: string;
  fullName: string;
  email: string;
  status: string;
  role: string;
  avatarUrl?: string;
  totalPublishedTemplates: number;
  totalClones: number;
  totalLikes: number;
  templates: Template[];
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
