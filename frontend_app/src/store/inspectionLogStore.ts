import { create } from 'zustand';

export type InspectionStatus = 'Pending' | 'Approved' | 'Rejected' | 'AI Review';
export type ComplianceStatus = 'Compliant' | 'Non-Compliant';
export type AIReviewLevel = 'High' | 'Medium' | 'Low';

export interface InspectionLog {
  id: string;
  time: string; // Used as Date or "Today"
  productName: string;
  companyName: string;
  officerName: string;
  status: InspectionStatus | 'Compliant' | 'Issues Found';
  imageUri?: string;
  score?: number;
  complianceStatus?: ComplianceStatus;
  aiReview?: AIReviewLevel;
}

interface InspectionLogState {
  logs: InspectionLog[];
  addLog: (log: Omit<InspectionLog, 'id'>) => void;
  clearLogs: () => void;
}

const generateId = () => {
  return `LM-2024-${Math.floor(1000 + Math.random() * 9000)}`;
};

export const useInspectionLogStore = create<InspectionLogState>((set) => ({
  logs: [],
  
  addLog: (log) =>
    set((state) => ({
      logs: [{ ...log, id: generateId() }, ...state.logs],
    })),
  clearLogs: () => set({ logs: [] }),
}));
