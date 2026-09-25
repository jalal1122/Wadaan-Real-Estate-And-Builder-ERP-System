export type DocumentFilterType = 'ALL' | 'CPV' | 'DPR' | 'REC';

export interface ArchiveDocumentItem {
  id: string;
  documentType: 'CPV' | 'DPR' | 'REC';
  documentNumber: string;
  date: string;
  partyName: string;
  partyType: 'VENDOR' | 'CUSTOMER';
  reference: string | null;
  amount: number;
  paymentMethod: string;
  status: string;
  projectName: string | null;
  printPayload: any;
}

export interface DocumentArchiveFilter {
  search?: string;
  type?: DocumentFilterType;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface DocumentArchiveResponse {
  documents: ArchiveDocumentItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
