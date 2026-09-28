export type AssetStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';
export type AssetCategory = 'PLOT' | 'HOUSE' | 'COMMERCIAL' | 'APARTMENT';

export interface WadaanAsset {
  id: string;
  assetTitle: string;
  assetCategory: AssetCategory;
  acquisitionCost: number | string;
  acquisitionDate: string;
  description?: string | null;
  status: AssetStatus;
  dealId?: string | null;
  createdAt: string;
  updatedAt?: string;
  deal?: {
    id: string;
    dealType: string;
    totalValue: number | string;
    customer?: {
      id: string;
      fullName: string;
      phone: string;
    } | null;
  } | null;
}

export interface CreateAssetPayload {
  assetTitle: string;
  assetCategory: AssetCategory;
  acquisitionCost: number | string;
  acquisitionDate: string;
  description?: string | null;
}

export interface UpdateAssetPayload {
  assetTitle?: string;
  assetCategory?: AssetCategory;
  acquisitionCost?: number | string;
  acquisitionDate?: string;
  description?: string | null;
}

export interface ReacquireAssetPayload {
  acquisitionCost: number | string;
  acquisitionDate: string;
  description?: string | null;
}
