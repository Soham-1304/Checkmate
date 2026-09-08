import { ProductType } from '../components/ProductMockup';

export interface InspectionDetailRow {
  id: string;
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

export const INSPECTIONS_LIST_DATA: InspectionDetailRow[] = [
  {
    id: 'INS-2847',
    isHighPriority: true,
    product: {
      name: 'Amul Taaza Toned Milk 1L',
      category: 'Milk & Dairy',
      mockupType: 'amul',
    },
    company: {
      name: 'Amul Dairy',
      industry: 'Dairy',
    },
    officer: {
      name: 'A. Sharma',
      initials: 'AS',
    },
    dateTime: '04 Sep 2026 10:42 AM',
    compliance: 'Major',
    aiFinding: {
      confidence: 94,
      description: 'Net quantity, MRP',
    },
    status: 'AI Review',
  },
  {
    id: 'INS-2850',
    product: {
      name: 'Britannia Digestive Biscuits 200g',
      category: 'Bakery & Snacks',
      mockupType: 'britannia',
    },
    company: {
      name: 'Britannia Industries',
      industry: 'Biscuits',
    },
    officer: {
      name: 'R. Verma',
      initials: 'RV',
    },
    dateTime: '04 Sep 2026 09:18 AM',
    compliance: 'Compliant',
    aiFinding: {
      confidence: 87,
      description: 'All checks passed',
    },
    status: 'Pending',
  },
  {
    id: 'INS-2849',
    product: {
      name: 'MDH Garam Masala 100g',
      category: 'Spices & Masala',
      mockupType: 'mdh',
    },
    company: {
      name: 'MDH Spices',
      industry: 'Spices',
    },
    officer: {
      name: 'A. Sharma',
      initials: 'AS',
    },
    dateTime: '04 Sep 2026 08:55 AM',
    compliance: 'Minor',
    aiFinding: {
      confidence: 92,
      description: 'Label font size',
    },
    status: 'Approved',
  },
  {
    id: 'INS-2848',
    product: {
      name: 'Parle-G Original Gluco 800g',
      category: 'Biscuits',
      mockupType: 'parleg',
    },
    company: {
      name: 'Parle Products',
      industry: 'Biscuits',
    },
    officer: {
      name: 'P. Kulkarni',
      initials: 'PK',
    },
    dateTime: '03 Sep 2026 10:30 PM',
    compliance: 'Critical',
    aiFinding: {
      confidence: 71,
      description: 'Missing FSSAI, allergen',
    },
    status: 'Rejected',
  },
  {
    id: 'INS-2846',
    product: {
      name: 'ITC Classmate Notebook A4',
      category: 'Stationery',
      mockupType: 'classmate',
    },
    company: {
      name: 'ITC Ltd',
      industry: 'Stationery',
    },
    officer: {
      name: 'M. Patil',
      initials: 'MP',
    },
    dateTime: '03 Sep 2026 11:40 AM',
    compliance: 'Compliant',
    aiFinding: {
      confidence: 98,
      description: 'All checks passed',
    },
    status: 'Approved',
  },
  {
    id: 'INS-2845',
    product: {
      name: 'Maggi 2-Minute Noodles 70g',
      category: 'Instant Food',
      mockupType: 'maggi',
    },
    company: {
      name: 'Nestlé India',
      industry: 'Instant Food',
    },
    officer: {
      name: 'R. Joshi',
      initials: 'RJ',
    },
    dateTime: '03 Sep 2026 11:20 AM',
    compliance: 'Minor',
    aiFinding: {
      confidence: 81,
      description: 'Net qty declaration format',
    },
    status: 'Pending',
  },
  {
    id: 'INS-2844',
    product: {
      name: 'Fortune Sunflower Oil 1L',
      category: 'Edible Oils',
      mockupType: 'fortune',
    },
    company: {
      name: 'Adani Wilmar',
      industry: 'Edible Oils',
    },
    officer: {
      name: 'V. Desai',
      initials: 'VD',
    },
    dateTime: '02 Sep 2026 16:05 PM',
    compliance: 'Compliant',
    aiFinding: {
      confidence: 96,
      description: 'All checks passed',
    },
    status: 'Approved',
  },
  {
    id: 'INS-2843',
    product: {
      name: "Haldiram's Bhujia 200g",
      category: 'Snacks',
      mockupType: 'haldirams',
    },
    company: {
      name: 'Haldiram Foods',
      industry: 'Snacks',
    },
    officer: {
      name: 'S. Mehta',
      initials: 'SM',
    },
    dateTime: '02 Sep 2026 12:40 PM',
    compliance: 'Major',
    aiFinding: {
      confidence: 78,
      description: 'Ingredients seq. non-standard',
    },
    status: 'Re-inspection',
  },
  {
    id: 'INS-2842',
    product: {
      name: 'Tata Tea Premium 250g',
      category: 'Beverages',
      mockupType: 'tatatea',
    },
    company: {
      name: 'Tata Consumer',
      industry: 'Beverages',
    },
    officer: {
      name: 'R. Verma',
      initials: 'RV',
    },
    dateTime: '01 Sep 2026 09:15 AM',
    compliance: 'Compliant',
    aiFinding: {
      confidence: 93,
      description: 'All checks passed',
    },
    status: 'Approved',
  },
];
