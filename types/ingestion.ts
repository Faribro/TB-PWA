export type QuarantineStatus = 'PENDING' | 'DISPATCHING' | 'SYNCHRONIZED' | 'FAILED_RETRY' | 'REJECTED';

export interface CandidateMatch {
  id: string;
  patient_name: string;
  screening_date: string;
  facility_name: string;
  status: string;
  similarity_score: number;
}

export interface QuarantineRecord {
  id: string; // unique row UUID
  patient_name: string;
  screening_date: string; // Normalized YYYY-MM-DD
  facility_name: string;
  status: string;
  confidence_score: 'high' | 'medium' | 'low';
  quarantine_status: QuarantineStatus;
  conflict_reason?: string;
  candidate_match?: CandidateMatch | null;
  extracted_details: {
    inmate_name?: string;
    screening_date?: string;
    facility_name?: string;
    xray_result?: string;
    tb_diagnosed?: string;
    att_start_date?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BatchResolvePayload {
  resolutions: Array<{
    id: string; // QuarantineRecord UUID
    action: 'APPROVE_NEW' | 'MERGE_CANDIDATE' | 'REJECT';
    candidateId?: string; // Set when action is MERGE_CANDIDATE
  }>;
}

export interface GoogleSheetsBatchPayload {
  records: Array<{
    id: string;
    patient_name: string;
    screening_date: string;
    facility_name: string;
    status: string;
    action: 'INSERT' | 'UPDATE';
    targetRowId?: string; // Google Sheet Row index or NIKSHAY ID
    details: Record<string, any>;
  }>;
}

export interface GoogleSheetsResponse {
  success: boolean;
  message?: string;
  failedIds?: string[];
}
