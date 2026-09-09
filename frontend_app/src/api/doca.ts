import apiClient from './client';
import { Endpoints } from './endpoints';

export interface Inspection {
  id: string;
  commodity_id: string;
  brand_name?: string | null;
  commodity_name?: string | null;
  status: string;
  compliance_result: string | null;
  final_decision: string | null;
  created_at: string;
}

export interface Commodity {
  id: string;
  generic_name: string;
  category: string;
  brand_id?: string;
  brand_name?: string | null;
  barcode?: string;
}

export interface Declaration {
  id: string;
  canonical_key: string;
  display_name?: string;
  machine_value: string | null;
  officer_value: string | null;
  final_value: string | null;
  confidence: number | null;
  confidence_label: string | null;
  font_size_mm: number | null;
  contrast_pass: boolean | null;
  clearance_pass: boolean | null;
  script_language: string | null;
  is_corrected: boolean;
}

export interface Finding {
  id: string;
  severity: string;
  title: string;
  explanation: string;
  legal_reference: string;
  officer_accepted: boolean | null;
}

export interface InspectionDetail extends Inspection {
  evidence_items: { id: string; file_url: string | null; view_type: string }[];
  declarations: Declaration[];
  findings: Finding[];
}

export interface OfficerDashboard {
  today_count: number;
  my_pending_assignments: number;
  my_completion_rate: number;
  my_total_inspections: number;
  recent_activity: {
    id: string;
    status: string;
    compliance_result: string | null;
    created_at: string;
    commodity_id?: string | null;
    brand_name?: string | null;
    commodity_name?: string | null;
  }[];
}

export const fetchInspections = async (): Promise<Inspection[]> =>
  (await apiClient.get(Endpoints.listInspections)).data;

export const fetchCommodities = async (): Promise<Commodity[]> => {
  const { data } = await apiClient.get(Endpoints.commodities);
  return Array.isArray(data) ? data : data.commodities ?? [];
};

export const fetchInspectionDetail = async (id: string): Promise<InspectionDetail> =>
  (await apiClient.get(Endpoints.inspectionDetail(id))).data;

export const createInspection = async (
  commodity_id: string, assignment_id?: string,
): Promise<Inspection> =>
  (await apiClient.post(
    Endpoints.createInspection,
    assignment_id ? { commodity_id, assignment_id } : { commodity_id },
  )).data;

export const submitInspection = async (inspectionId: string): Promise<Inspection> =>
  (await apiClient.post(Endpoints.submit(inspectionId))).data;

export interface Assignment {
  id: string;
  commodity_id: string;
  commodity_name: string;
  commodity_barcode?: string | null;
  status: string;
  due_date?: string | null;
  notes?: string | null;
}

export const fetchMyChecklist = async (): Promise<Assignment[]> => {
  const { data } = await apiClient.get(Endpoints.myChecklist);
  const items = Array.isArray(data) ? data : data.items ?? data.assignments ?? [];
  return items.filter((a: Assignment) => a.status === 'ASSIGNED');
};

export const fetchCommodity = async (id: string): Promise<Commodity> =>
  (await apiClient.get(Endpoints.commodityDetail(id))).data;

export const uploadEvidence = async (
  inspectionId: string, uri: string, viewType = 'FRONT_PDP',
) => {
  const form = new FormData();
  form.append('view_type', viewType);
  form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as any);
  return (await apiClient.post(Endpoints.uploadEvidence(inspectionId), form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })).data;
};

export const analyzeAuto = async (inspectionId: string, pkgHeightMm = 150) =>
  (await apiClient.post(
    `${Endpoints.analyzeAuto(inspectionId)}?pkg_height_mm=${pkgHeightMm}`,
    null, { timeout: 180000 },
  )).data;

export const correctDeclaration = async (
  inspectionId: string, declarationId: string,
  officer_value: string, correction_reason?: string,
): Promise<Declaration> =>
  (await apiClient.patch(
    Endpoints.correctDeclaration(inspectionId, declarationId),
    { officer_value, correction_reason },
  )).data;

export const evaluateInspection = async (inspectionId: string) =>
  (await apiClient.post(Endpoints.evaluate(inspectionId))).data;

export const fetchReport = async (inspectionId: string): Promise<{ file_url: string }> =>
  (await apiClient.get(Endpoints.report(inspectionId))).data;

export const fetchOfficerDashboard = async (): Promise<OfficerDashboard> =>
  (await apiClient.get(Endpoints.officerDashboard)).data;
