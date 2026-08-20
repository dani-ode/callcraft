export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface ApiCredential {
  id: string;
  name: string;
  publicKey: string;
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
  name: string;
  slug: string;
  description?: string;
  activeVersionNumber: number;
  status: string;
  updatedAt: string;
  requestSchema?: any;
  responseSchema?: any;
  systemPrompt?: string;
}

export interface Template {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  isOfficial: boolean;
  requestSchema: any;
  responseSchema: any;
}

export interface ExecutionLog {
  id: string;
  requestId: string;
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
