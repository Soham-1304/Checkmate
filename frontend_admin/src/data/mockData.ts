import {
  ComplianceSegment,
  TrendPoint,
  AIAnalysisItem,
  HighRiskCompany,
  TopViolation,
  OfficerWorkloadItem,
  RecentInspection,
} from '../types';

export const COMPLIANCE_SEGMENTS: ComplianceSegment[] = [
  { name: 'Fully Compliant', count: 373, percentage: 79, color: '#017374' }, // Primary deep teal
  { name: 'Minor Violations', count: 62, percentage: 13, color: '#FEB519' }, // Golden yellow
  { name: 'Major Violations', count: 28, percentage: 6, color: '#E37820' },  // Warm orange
  { name: 'Critical Cases', count: 8, percentage: 2, color: '#dc2626' },    // Crimson red
];

export const TREND_DATA: TrendPoint[] = [
  { month: 'Apr', completed: 38, flagged: 23 },
  { month: 'May', completed: 46, flagged: 27 },
  { month: 'Jun', completed: 62, flagged: 32 },
  { month: 'Jul', completed: 59, flagged: 29 },
  { month: 'Aug', completed: 78, flagged: 36 },
  { month: 'Sep', completed: 72, flagged: 25 },
];

export const AI_ANALYSIS_ITEMS: AIAnalysisItem[] = [
  {
    id: '1',
    code: 'INS-2847',
    productName: 'Amul Taaza Toned Milk 1L',
    packageImage: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=150&auto=format&fit=crop&q=80',
    priority: 'High',
    status: 'Non-Compliant',
    confidence: 94,
    reason: 'Net quantity declaration',
    details: {
      manufacturer: 'Gujarat Co-operative Milk Marketing Federation Ltd. (Amul)',
      mrp: '₹54.00 (Inclusive of all taxes)',
      netWeight: '1 Litre (Font size < 3mm requirement)',
      shelfLife: 'Best before 180 days from packaging',
      detectedIssues: [
        'Net quantity declaration font height is 2.1mm, below the mandatory 4.0mm requirement for packages > 500ml under Rule 6(1)(h).',
        'Contrast ratio between font and background fails readability index threshold.'
      ],
      rulesViolated: [
        'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(h)',
        'Legal Metrology (Packaged Commodities) Amendment Rules, 2022'
      ]
    }
  },
  {
    id: '2',
    code: 'INS-2841',
    productName: 'Fortune Sunflower Oil 1L',
    packageImage: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150&auto=format&fit=crop&q=80',
    priority: 'High',
    status: 'Compliant',
    confidence: 87,
    reason: 'Labeling format',
    details: {
      manufacturer: 'Adani Wilmar Limited',
      mrp: '₹145.00',
      netWeight: '1 L / 910g',
      shelfLife: 'Best before 9 months from manufacture',
      detectedIssues: [
        'No critical violations detected. Unit sale price properly specified (₹0.145 / ml).'
      ],
      rulesViolated: []
    }
  },
  {
    id: '3',
    code: 'INS-2839',
    productName: 'Tata Salt Iodised 1kg',
    packageImage: 'https://images.unsplash.com/photo-1518843875459-f738682238a6?w=150&auto=format&fit=crop&q=80',
    priority: 'High',
    status: 'Non-Compliant',
    confidence: 91,
    reason: 'MRP non-compliance',
    details: {
      manufacturer: 'Tata Consumer Products Limited',
      mrp: '₹28.00 (Smudged / Overprinted)',
      netWeight: '1 kg',
      shelfLife: 'Best before 24 months',
      detectedIssues: [
        'MRP overprinting detected; secondary barcode conflicts with declared batch register.',
        'Month and year of manufacture missing standard MM/YYYY format.'
      ],
      rulesViolated: [
        'Legal Metrology Rules 2011 - Rule 6(1)(e) Date of Manufacture',
        'Section 18 - Tampering with MRP stickers'
      ]
    }
  },
  {
    id: '4',
    code: 'INS-2834',
    productName: "Haldiram's Aloo Bhujia 200g",
    packageImage: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=150&auto=format&fit=crop&q=80',
    priority: 'Medium',
    status: 'Review Needed',
    confidence: 89,
    reason: 'Manufacturer details',
    details: {
      manufacturer: 'Haldiram Snacks Pvt Ltd (Bhiwadi Unit)',
      mrp: '₹45.00',
      netWeight: '200g',
      shelfLife: '6 months',
      detectedIssues: [
        'Consumer care contact email domain DNS check timed out during automated verification.',
        'Consumer grievance officer name needs officer visual verification.'
      ],
      rulesViolated: [
        'Rule 6(1)(a) - Name and complete address of the manufacturer'
      ]
    }
  }
];

export const HIGH_RISK_COMPANIES: HighRiskCompany[] = [
  { rank: 1, name: 'Northern Spice Co.', compliance: 48, violations: 31, risk: 'High' },
  { rank: 2, name: 'Patel Brothers Agro', compliance: 52, violations: 24, risk: 'High' },
  { rank: 3, name: 'Sunrise Edibles Ltd.', compliance: 61, violations: 18, risk: 'Medium' },
  { rank: 4, name: 'R.K. Packaged Foods', compliance: 64, violations: 15, risk: 'Medium' },
  { rank: 5, name: 'Bharat Oils & Fats', compliance: 68, violations: 11, risk: 'Medium' },
];

export const TOP_VIOLATIONS: TopViolation[] = [
  { title: 'Net Quantity Declaration', count: 34, percentage: 85, color: '#E37820' }, // Vivid Orange
  { title: 'MRP Non-compliance', count: 28, percentage: 70, color: '#FEB519' },    // Golden Yellow
  { title: 'Manufacturer Details', count: 19, percentage: 48, color: '#E37820' },  // Warm Orange
  { title: 'Shelf Life / Labeling', count: 15, percentage: 38, color: '#017374' }, // Deep Teal
  { title: 'Barcode / Mark Defect', count: 11, percentage: 28, color: '#8EC8BA' }, // Mint Sage Teal
];

export const OFFICER_WORKLOAD: OfficerWorkloadItem[] = [
  { id: '1', name: 'Anita Sharma', initials: 'AS', active: 12, pending: 4, progressPercent: 82 },
  { id: '2', name: 'Priya Kulkarni', initials: 'PK', active: 10, pending: 3, progressPercent: 68 },
  { id: '3', name: 'Mahesh Patil', initials: 'MP', active: 8, pending: 2, progressPercent: 54 },
  { id: '4', name: 'Ranjit Joshi', initials: 'RJ', active: 6, pending: 0, progressPercent: 40 },
];

export const RECENT_INSPECTIONS: RecentInspection[] = [
  {
    id: 'INS-2850',
    product: 'Britannia NutriChoice',
    company: 'Britannia Industries',
    officer: 'R. Verma',
    date: '05 Sep 2026, 10:42 AM',
    status: 'Pending',
  },
  {
    id: 'INS-2849',
    product: 'MDH Garam Masala 100g',
    company: 'MDH Spices',
    officer: 'A. Sharma',
    date: '05 Sep 2026, 09:18 AM',
    status: 'Approved',
  },
  {
    id: 'INS-2848',
    product: 'Parle-G Original 500g',
    company: 'Parle Products',
    officer: 'P. Kulkarni',
    date: '04 Sep 2026, 08:55 PM',
    status: 'Rejected',
  },
  {
    id: 'INS-2847',
    product: 'Amul Taaza Toned Milk 1L',
    company: 'Amul Dairy',
    officer: 'A. Sharma',
    date: '04 Sep 2026, 04:22 PM',
    status: 'AI Review',
  },
  {
    id: 'INS-2846',
    product: 'ITC Classmate Notebook A4',
    company: 'ITC Ltd',
    officer: 'M. Patil',
    date: '04 Sep 2026, 11:09 AM',
    status: 'Approved',
  },
];
