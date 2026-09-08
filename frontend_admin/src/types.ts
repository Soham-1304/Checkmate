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
  product: string;
  company: string;
  officer: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'AI Review';
}
