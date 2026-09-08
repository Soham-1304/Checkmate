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

export const OFFICERS_DATA: OfficerRecord[] = [
  {
    id: '1',
    name: 'Anita Sharma',
    badgeId: 'OFF-D4-0101',
    rank: 'Sr. Field Inspector',
    initials: 'AS',
    avatarBg: '#017374',
    jurisdiction: 'District 4 • Pune Metro',
    district: 'Pune',
    activeTasks: 12,
    pendingTasks: 4,
    totalCompleted: 148,
    accuracy: 97.4,
    avgResolutionTime: '1.4 hrs',
    status: 'On Field',
    contact: {
      email: 'a.sharma@metrology.gov.in',
      phone: '+91 98231 44520',
    },
  },
  {
    id: '2',
    name: 'Rajesh Verma',
    badgeId: 'OFF-D4-0002',
    rank: 'Sr. Inspector - D4',
    initials: 'RV',
    avatarBg: '#015758',
    jurisdiction: 'District 4 • Central Command',
    district: 'Pune',
    activeTasks: 14,
    pendingTasks: 2,
    totalCompleted: 215,
    accuracy: 98.8,
    avgResolutionTime: '1.2 hrs',
    status: 'In Office',
    contact: {
      email: 'r.verma@metrology.gov.in',
      phone: '+91 98220 11902',
    },
  },
  {
    id: '3',
    name: 'Priya Kulkarni',
    badgeId: 'OFF-D4-0103',
    rank: 'Legal Metrology Officer',
    initials: 'PK',
    avatarBg: '#0284c7',
    jurisdiction: 'District 4 • Pimpri-Chinchwad',
    district: 'Pune',
    activeTasks: 10,
    pendingTasks: 3,
    totalCompleted: 112,
    accuracy: 96.1,
    avgResolutionTime: '1.8 hrs',
    status: 'On Field',
    contact: {
      email: 'p.kulkarni@metrology.gov.in',
      phone: '+91 98450 77312',
    },
  },
  {
    id: '4',
    name: 'Mahesh Patil',
    badgeId: 'OFF-D4-0104',
    rank: 'Field Inspector',
    initials: 'MP',
    avatarBg: '#0f766e',
    jurisdiction: 'District 4 • Solapur Industrial Zone',
    district: 'Solapur',
    activeTasks: 8,
    pendingTasks: 2,
    totalCompleted: 94,
    accuracy: 95.0,
    avgResolutionTime: '2.1 hrs',
    status: 'On Field',
    contact: {
      email: 'm.patil@metrology.gov.in',
      phone: '+91 97632 99014',
    },
  },
  {
    id: '5',
    name: 'Ranjit Joshi',
    badgeId: 'OFF-D4-0105',
    rank: 'Compliance Reviewer',
    initials: 'RJ',
    avatarBg: '#1e3a8a',
    jurisdiction: 'District 4 • Satara Region',
    district: 'Satara',
    activeTasks: 6,
    pendingTasks: 0,
    totalCompleted: 86,
    accuracy: 99.1,
    avgResolutionTime: '1.1 hrs',
    status: 'In Office',
    contact: {
      email: 'r.joshi@metrology.gov.in',
      phone: '+91 99214 55301',
    },
  },
  {
    id: '6',
    name: 'Vikram Desai',
    badgeId: 'OFF-D4-0106',
    rank: 'Enforcement Officer',
    initials: 'VD',
    avatarBg: '#b45309',
    jurisdiction: 'District 4 • Kolhapur Central',
    district: 'Kolhapur',
    activeTasks: 9,
    pendingTasks: 1,
    totalCompleted: 134,
    accuracy: 97.0,
    avgResolutionTime: '1.6 hrs',
    status: 'On Field',
    contact: {
      email: 'v.desai@metrology.gov.in',
      phone: '+91 98901 22345',
    },
  },
  {
    id: '7',
    name: 'Suresh Mehta',
    badgeId: 'OFF-D4-0107',
    rank: 'Commodity Inspector',
    initials: 'SM',
    avatarBg: '#15803d',
    jurisdiction: 'District 4 • Sangli MIDC',
    district: 'Sangli',
    activeTasks: 11,
    pendingTasks: 5,
    totalCompleted: 102,
    accuracy: 93.8,
    avgResolutionTime: '2.4 hrs',
    status: 'On Field',
    contact: {
      email: 's.mehta@metrology.gov.in',
      phone: '+91 98500 88712',
    },
  },
  {
    id: '8',
    name: 'Neha Deshmukh',
    badgeId: 'OFF-D4-0108',
    rank: 'Metrology Officer',
    initials: 'ND',
    avatarBg: '#7c3aed',
    jurisdiction: 'District 4 • Ahmednagar North',
    district: 'Ahmednagar',
    activeTasks: 5,
    pendingTasks: 1,
    totalCompleted: 64,
    accuracy: 94.5,
    avgResolutionTime: '1.9 hrs',
    status: 'In Office',
    contact: {
      email: 'n.deshmukh@metrology.gov.in',
      phone: '+91 98112 44321',
    },
  },
];
