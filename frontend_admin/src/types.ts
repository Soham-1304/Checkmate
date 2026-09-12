export interface MetricItem {
  id: string;
  icon: string;
  value: string | number;
  label: string;
  trend: string;
  trendType: 'positive' | 'negative' | 'warning' | 'neutral';
  highlight?: string;
}

export interface ComplianceSegment {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TrendPoint {
  month: string;
  completed: number;
  flagged: number;
}

export interface AIAnalysisItem {
  id: string;
  code: string;
  productName: string;
  packageImage: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Compliant' | 'Non-Compliant' | 'Review Needed';
  confidence: number;
  reason: string;
  details?: {
    manufacturer?: string;
    mrp?: string;
    netWeight?: string;
    shelfLife?: string;
    detectedIssues?: string[];
    rulesViolated?: string[];
  };
}

export interface HighRiskCompany {
  rank: number;
  name: string;
  compliance: number;
  violations: number;
  risk: 'High' | 'Medium' | 'Low';
}

export interface TopViolation {
  title: string;
  count: number;
  percentage: number;
  color: string;
}

export interface OfficerWorkloadItem {
  id: string;
  name: string;
  initials: string;
  active: number;
  pending: number;
  progressPercent: number;
}

export interface RecentInspection {
  id: string;
  backendId?: string;
  product: string;
  company: string;
  officer: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'AI Review';
}

export type ProductType =
  | 'amul'
  | 'britannia'
  | 'mdh'
  | 'parleg'
  | 'classmate'
  | 'maggi'
  | 'fortune'
  | 'haldirams'
  | 'tatatea'
  | 'tata';

export interface InspectionDetailRow {
  id: string;
  backendId?: string;
  isHighPriority?: boolean;
  product: {
    name: string;
    category: string;
    mockupType: ProductType;
  };
  company: {
    name: string;
    industry: string;
  };
  officer: {
    name: string;
    initials: string;
  };
  dateTime: string;
  compliance: 'Compliant' | 'Minor' | 'Major' | 'Critical';
  aiFinding: {
    confidence: number;
    description: string;
  };
  status: 'AI Review' | 'Pending' | 'Approved' | 'Rejected' | 'Re-inspection';
}

export interface CompanyRegistryRow {
  id: string;
  name: string;
  licenseNo: string;
  avatarText: string;
  avatarBg: string;
  category: string;
  state: string;
  compliance: number;
  complianceBarColor: string;
  inspections: number;
  violations: number;
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
  officer: {
    name: string;
    initials: string;
  };
  status: 'Active' | 'Under Rev.';
}

export interface OfficerRecord {
  id: string;
  name: string;
  badgeId: string;
  rank: string;
  initials: string;
  avatarBg: string;
  jurisdiction: string;
  district: string;
  activeTasks: number;
  pendingTasks: number;
  totalCompleted: number;
  accuracy: number;
  avgResolutionTime: string;
  status: 'On Field' | 'In Office' | 'On Leave';
  contact: {
    email: string;
    phone: string;
  };
}

