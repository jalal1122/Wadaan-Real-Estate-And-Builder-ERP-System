import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AssetInventoryPage from './page';

let mockAssets: any[] = [];
let mockIsLoading = false;
let mockIsError = false;
const mockRefetch = vi.fn();
const mockDeleteMutateAsync = vi.fn();

vi.mock('@/features/assets/hooks/useAssets', () => ({
  useAssets: () => ({
    data: mockAssets,
    isLoading: mockIsLoading,
    isError: mockIsError,
    refetch: mockRefetch,
  }),
  useDeleteAsset: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
  useCreateAsset: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('AssetInventoryPage Component (/assets)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockIsError = false;
    mockAssets = [
      {
        id: 'asset-1',
        assetTitle: 'Plot 45, Block C, Faisal Town',
        assetCategory: 'PLOT',
        acquisitionCost: 4500000,
        acquisitionDate: '2026-01-15T00:00:00Z',
        description: 'Corner plot with road frontage',
        status: 'AVAILABLE',
        deal: null,
      },
      {
        id: 'asset-2',
        assetTitle: 'Villa 12, Sector B, DHA Phase 2',
        assetCategory: 'HOUSE',
        acquisitionCost: 15000000,
        acquisitionDate: '2026-02-10T00:00:00Z',
        description: 'Semi-finished 1 kanal house',
        status: 'RESERVED',
        deal: {
          id: 'deal-99',
          dealType: 'WADAAN_SALE',
          totalValue: 22000000,
          customer: {
            id: 'cust-1',
            fullName: 'Tariq Client',
            phone: '0300-1122334',
          },
        },
      },
    ];
  });

  // AP-1
  it('AP-1: renders KPI strip metrics and asset table with registered assets', () => {
    render(<AssetInventoryPage />);

    expect(screen.getByText('Wadaan Asset Inventory')).toBeInTheDocument();
    expect(screen.getByTestId('asset-kpi-strip')).toBeInTheDocument();

    // KPI verification
    expect(screen.getByTestId('kpi-total-count')).toHaveTextContent('2');
    expect(screen.getByTestId('kpi-available-count')).toHaveTextContent('1');
    expect(screen.getByTestId('kpi-reserved-count')).toHaveTextContent('1');

    // Table rows verification
    expect(screen.getByTestId('assets-table')).toBeInTheDocument();
    expect(screen.getByText('Plot 45, Block C, Faisal Town')).toBeInTheDocument();
    expect(screen.getByText('Villa 12, Sector B, DHA Phase 2')).toBeInTheDocument();

    // Status badges
    expect(screen.getByTestId('status-badge-available')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-reserved')).toBeInTheDocument();
  });

  // AP-2
  it('AP-2: clicking "+ Register Asset" button opens CreateAssetModal', () => {
    render(<AssetInventoryPage />);

    const openBtn = screen.getByTestId('open-register-asset-modal');
    fireEvent.click(openBtn);

    expect(screen.getByTestId('create-asset-modal')).toBeInTheDocument();
    expect(screen.getByText('Register Owned Asset')).toBeInTheDocument();
  });

  // AP-3
  it('AP-3: status filter tabs filter visible table rows correctly', () => {
    render(<AssetInventoryPage />);

    // Initially both assets visible
    expect(screen.getByText('Plot 45, Block C, Faisal Town')).toBeInTheDocument();
    expect(screen.getByText('Villa 12, Sector B, DHA Phase 2')).toBeInTheDocument();

    // Click "Available" tab
    const availableTab = screen.getByTestId('tab-available');
    fireEvent.click(availableTab);

    // Plot 45 should be visible, Villa 12 (RESERVED) should be filtered out
    expect(screen.getByText('Plot 45, Block C, Faisal Town')).toBeInTheDocument();
    expect(screen.queryByText('Villa 12, Sector B, DHA Phase 2')).not.toBeInTheDocument();

    // Click "Reserved" tab
    const reservedTab = screen.getByTestId('tab-reserved');
    fireEvent.click(reservedTab);

    // Villa 12 should be visible, Plot 45 should not
    expect(screen.queryByText('Plot 45, Block C, Faisal Town')).not.toBeInTheDocument();
    expect(screen.getByText('Villa 12, Sector B, DHA Phase 2')).toBeInTheDocument();
  });
});
