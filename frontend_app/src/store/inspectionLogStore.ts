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

const INITIAL_MOCK_DATA: InspectionLog[] = [
  { id: 'LM-2024-0821', time: '20 May 2024', companyName: 'Aaradhya Foods', productName: 'Besan 1kg', officerName: 'R. Sharma', status: 'Pending', complianceStatus: 'Non-Compliant', aiReview: 'High' },
  { id: 'LM-2024-0820', time: '19 May 2024', companyName: 'GreenLeaf Bev.', productName: 'Nimbu Pani 250ml', officerName: 'A. Khan', status: 'Pending', complianceStatus: 'Non-Compliant', aiReview: 'Medium' },
  { id: 'LM-2024-0819', time: '19 May 2024', companyName: 'Shakti Spices Co.', productName: 'Haldi Powder 200g', officerName: 'T. Yadav', status: 'AI Review', complianceStatus: 'Non-Compliant', aiReview: 'High' },
  { id: 'LM-2024-0818', time: '18 May 2024', companyName: 'Vatsalya Dairy', productName: 'Ghee 500ml', officerName: 'P. Yadav', status: 'Approved', complianceStatus: 'Compliant', aiReview: 'Low' },
  { id: 'LM-2024-0817', time: '18 May 2024', companyName: 'Sunrise Foods', productName: 'Oats 1kg', officerName: 'K. Nair', status: 'Approved', complianceStatus: 'Compliant', aiReview: 'Low' },
  { id: 'LM-2024-0816', time: '17 May 2024', companyName: 'Bharat Tea', productName: 'Green Tea 100g', officerName: 'R. Sharma', status: 'Approved', complianceStatus: 'Compliant', aiReview: 'Low' },
  { id: 'LM-2024-0815', time: '17 May 2024', companyName: 'Ruchi Masala', productName: 'Mirchi Powder 100g', officerName: 'S. Varma', status: 'Pending', complianceStatus: 'Non-Compliant', aiReview: 'Medium' },
  { id: 'LM-2024-0814', time: '16 May 2024', companyName: 'Amrut Snacks', productName: 'Potato Chips 50g', officerName: 'A. Khan', status: 'AI Review', complianceStatus: 'Non-Compliant', aiReview: 'High' },
  { id: 'LM-2024-0813', time: '16 May 2024', companyName: 'Fresh&Juice', productName: 'Mango Drink 1L', officerName: 'T. Yadav', status: 'Approved', complianceStatus: 'Compliant', aiReview: 'Low' },
  { id: 'LM-2024-0812', time: '15 May 2024', companyName: 'Daily Good', productName: 'Bread 400g', officerName: 'P. Yadav', status: 'Approved', complianceStatus: 'Compliant', aiReview: 'Low' },
];

export const useInspectionLogStore = create<InspectionLogState>((set) => ({
  logs: [], // Empty by default for real-time usage
  
  addLog: (log) =>
    set((state) => ({
      logs: [{ ...log, id: generateId() }, ...state.logs],
    })),
    
  clearLogs: () => set({ logs: [] }),
}));
