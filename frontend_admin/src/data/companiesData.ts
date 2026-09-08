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

export const COMPANIES_REGISTRY_DATA: CompanyRegistryRow[] = [
  {
    id: '1',
    name: 'Aaradhya Foods Pvt. Ltd.',
    licenseNo: 'Lic. No. 1001/ADV/2025',
    avatarText: 'A',
    avatarBg: '#0284c7', // blue
    category: 'Food',
    state: 'Maharashtra',
    compliance: 48,
    complianceBarColor: '#E37820', // orange
    inspections: 32,
    violations: 12,
    risk: 'High',
    officer: {
      name: 'A. Sharma',
      initials: 'AS',
    },
    status: 'Active',
  },
  {
    id: '2',
    name: 'Patel Brothers Agro',
    licenseNo: 'Lic. No. 2002/AG/2024',
    avatarText: 'P',
    avatarBg: '#ec4899', // pink
    category: 'Food',
    state: 'Gujarat',
    compliance: 62,
    complianceBarColor: '#FEB519', // yellow/orange
    inspections: 18,
    violations: 7,
    risk: 'Medium',
    officer: {
      name: 'P. Kulkarni',
      initials: 'PK',
    },
    status: 'Active',
  },
  {
    id: '3',
    name: 'Sunrise Edibles Ltd.',
    licenseNo: 'Lic. No. 3007/ED/2023',
    avatarText: '☀️',
    avatarBg: '#f59e0b', // sun/amber
    category: 'Food',
    state: 'Maharashtra',
    compliance: 81,
    complianceBarColor: '#017374', // teal
    inspections: 14,
    violations: 3,
    risk: 'Low',
    officer: {
      name: 'M. Patil',
      initials: 'MJ',
    },
    status: 'Active',
  },
  {
    id: '4',
    name: 'Northern Spice Co.',
    licenseNo: 'Lic. No. 4056/SP/2022',
    avatarText: 'N',
    avatarBg: '#ef4444', // red
    category: 'Food',
    state: 'Maharashtra',
    compliance: 39,
    complianceBarColor: '#ef4444', // red
    inspections: 27,
    violations: 16,
    risk: 'Critical',
    officer: {
      name: 'R. Joshi',
      initials: 'RJ',
    },
    status: 'Under Rev.',
  },
  {
    id: '5',
    name: 'ITC Industries Ltd.',
    licenseNo: 'Lic. No. 5021/IN/2021',
    avatarText: 'ITC',
    avatarBg: '#0369a1', // navy/blue
    category: 'Food',
    state: 'Maharashtra',
    compliance: 78,
    complianceBarColor: '#017374', // teal
    inspections: 11,
    violations: 2,
    risk: 'Medium',
    officer: {
      name: 'A. Sharma',
      initials: 'AS',
    },
    status: 'Active',
  },
  {
    id: '6',
    name: 'Haldiram Foods',
    licenseNo: 'Lic. No. 6134/FD/2020',
    avatarText: 'H',
    avatarBg: '#15803d', // green
    category: 'Snacks',
    state: 'Maharashtra',
    compliance: 71,
    complianceBarColor: '#017374', // teal
    inspections: 16,
    violations: 5,
    risk: 'Medium',
    officer: {
      name: 'S. Mehta',
      initials: 'SM',
    },
    status: 'Active',
  },
  {
    id: '7',
    name: 'Maggi Foods Ltd.',
    licenseNo: 'Lic. No. 7219/FO/2019',
    avatarText: 'M',
    avatarBg: '#ea580c', // orange
    category: 'Food',
    state: 'Gujarat',
    compliance: 65,
    complianceBarColor: '#FEB519', // yellow
    inspections: 22,
    violations: 8,
    risk: 'High',
    officer: {
      name: 'R. Joshi',
      initials: 'RJ',
    },
    status: 'Active',
  },
  {
    id: '8',
    name: 'Tata Consumer Products',
    licenseNo: 'Lic. No. 8347/TC/2018',
    avatarText: 'T',
    avatarBg: '#1e3a8a', // dark blue
    category: 'Beverages',
    state: 'Maharashtra',
    compliance: 92,
    complianceBarColor: '#017374', // teal
    inspections: 9,
    violations: 1,
    risk: 'Low',
    officer: {
      name: 'R. Verma',
      initials: 'RV',
    },
    status: 'Active',
  },
  {
    id: '9',
    name: 'Britannia Industries',
    licenseNo: 'Lic. No. 9421/BI/2017',
    avatarText: 'B',
    avatarBg: '#dc2626', // red
    category: 'Bakery & Snacks',
    state: 'Maharashtra',
    compliance: 76,
    complianceBarColor: '#017374', // teal
    inspections: 13,
    violations: 4,
    risk: 'Medium',
    officer: {
      name: 'P. Kulkarni',
      initials: 'PK',
    },
    status: 'Active',
  },
  {
    id: '10',
    name: 'Nestlé India',
    licenseNo: 'Lic. No. 1034/NI/2016',
    avatarText: 'N',
    avatarBg: '#0f766e', // teal
    category: 'Food',
    state: 'Maharashtra',
    compliance: 88,
    complianceBarColor: '#017374', // teal
    inspections: 17,
    violations: 3,
    risk: 'Low',
    officer: {
      name: 'R. Joshi',
      initials: 'RJ',
    },
    status: 'Active',
  },
];
