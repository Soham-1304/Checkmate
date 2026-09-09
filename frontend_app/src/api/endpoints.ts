import Constants from 'expo-constants';

import { Platform } from 'react-native';

const fromEnv =
  (Constants.expoConfig?.extra as any)?.apiBaseUrl ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://localhost:8000/api/v1';

export const API_BASE_URL = (() => {
  if (Platform.OS === 'android' && fromEnv.includes('localhost')) {
    return fromEnv.replace('localhost', '10.0.2.2');
  }
  return fromEnv;
})();

export const Endpoints = {
  loginJson: '/auth/login/json',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  me: '/auth/me',

  myChecklist: '/assignments/my-checklist',
  createInspection: '/inspections',
  listInspections: '/inspections',
  inspectionDetail: (id: string) => `/inspections/${id}`,
  uploadEvidence: (id: string) => `/inspections/${id}/evidence`,
  analyzeAuto: (id: string) => `/inspections/${id}/analyze-auto`,
  declarations: (id: string) => `/inspections/${id}/declarations`,
  correctDeclaration: (inspId: string, declId: string) =>
    `/inspections/${inspId}/declarations/${declId}`,
  evaluate: (id: string) => `/inspections/${id}/evaluate`,
  findings: (id: string) => `/inspections/${id}/findings`,
  report: (id: string) => `/inspections/${id}/report`,
  officerDashboard: '/dashboard/officer',
  commodities: '/commodities',
  commodityDetail: (id: string) => `/commodities/${id}`,
  submit: (id: string) => `/inspections/${id}/submit`,
} as const;
