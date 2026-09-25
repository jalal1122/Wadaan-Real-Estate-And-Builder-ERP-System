/**
 * Module 2: Vendors Types
 * Matches shape returned by VendorService.getAllVendors()
 */
export interface VendorItem {
  id: string;
  vendorName: string;
  phone: string | null;
  totalOutstanding: string | number;
  totalPaid: string | number;
  unpaidBillsCount: number;
}

export interface CreateVendorPayload {
  vendorName: string;
  phone?: string;
}
