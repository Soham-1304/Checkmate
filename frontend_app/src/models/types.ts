// ─────────────────────────────────────────────────────────────
// Shared Models — API Contract (ported from app_models.dart)
// ─────────────────────────────────────────────────────────────

export interface ProductInfo {
  name?: string;
  manufacturer?: string;
  mrp?: string;
  netQuantity?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  batchNumber?: string;
  countryOfOrigin?: string;
  customerCareDetails?: string;
  fssaiLicenseNumber?: string;
  importerDetails?: string;
  maxRetailPrice?: string;
  rawExtracted?: Record<string, any>;
}

export type ComplianceStatusType = 'compliant' | 'nonCompliant' | 'needsReview' | 'unknown';

export const complianceStatusFromString = (value?: string): ComplianceStatusType => {
  switch (value?.toLowerCase()) {
    case 'compliant': return 'compliant';
    case 'non_compliant':
    case 'noncompliant': return 'nonCompliant';
    case 'needs_review': return 'needsReview';
    default: return 'unknown';
  }
};

export const complianceDisplayLabel: Record<ComplianceStatusType, string> = {
  compliant: 'Compliant',
  nonCompliant: 'Non-Compliant',
  needsReview: 'Needs Review',
  unknown: 'Unknown',
};

export interface ComplianceIssue {
  field: string;
  issueType: 'missing' | 'invalid' | 'warning' | string;
  description: string;
  legalReference?: string;
  isCritical: boolean;
}

export interface ComplianceResult {
  status: ComplianceStatusType;
  score: number;
  issues: ComplianceIssue[];
  missingDeclarations: string[];
  presentDeclarations: string[];
  summary?: string;
}

export interface StandardModel {
  id: string;
  title: string;
  description?: string;
  category?: string;
  relevanceScore: number;
  url?: string;
  publishedYear?: string;
  isMandatory: boolean;
}

export interface AnalysisResult {
  analysisId: string;
  status: 'processing' | 'completed' | 'failed' | string;
  product?: ProductInfo;
  compliance?: ComplianceResult;
  recommendedStandards: StandardModel[];
  imageUrl?: string;
  createdAt?: string;
  errorMessage?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: string;
}

export interface UserModel {
  id: string;
  email: string;
  name?: string;
  role?: string;
  organization?: string;
}
