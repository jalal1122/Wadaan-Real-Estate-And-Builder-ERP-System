import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditAssetModal } from './EditAssetModal';
import { WadaanAsset } from '@/features/assets/types';

const mockUpdateAssetMutateAsync = vi.fn();

vi.mock('@/features/assets/hooks/useAssets', () => ({
  useUpdateAsset: () => ({
    mutateAsync: mockUpdateAssetMutateAsync,
    isPending: false,
  }),
}));

describe('EditAssetModal Component', () => {
  const mockAsset: WadaanAsset = {
    id: 'asset-1',
    assetTitle: 'Plot 42 Sector B-17',
    assetCategory: 'PLOT',
    acquisitionCost: 4500000,
    acquisitionDate: '2026-01-15T00:00:00.000Z',
    description: 'Prime 1 kanal plot',
    status: 'AVAILABLE',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    dealId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with pre-filled asset data', () => {
    render(
      <EditAssetModal
        asset={mockAsset}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Edit Asset Details')).toBeDefined();
    expect(screen.getByDisplayValue('Plot 42 Sector B-17')).toBeDefined();
    expect(screen.getByDisplayValue('4500000')).toBeDefined();
    expect(screen.getByDisplayValue('Prime 1 kanal plot')).toBeDefined();
  });

  it('validates empty title and displays error', async () => {
    render(
      <EditAssetModal
        asset={mockAsset}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const titleInput = screen.getByDisplayValue('Plot 42 Sector B-17');
    fireEvent.change(titleInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Please provide a valid asset title.')).toBeDefined();
    expect(mockUpdateAssetMutateAsync).not.toHaveBeenCalled();
  });

  it('submits updated asset data', async () => {
    render(
      <EditAssetModal
        asset={mockAsset}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const titleInput = screen.getByDisplayValue('Plot 42 Sector B-17');
    fireEvent.change(titleInput, { target: { value: 'Plot 42-Corner Sector B-17' } });

    const costInput = screen.getByDisplayValue('4500000');
    fireEvent.change(costInput, { target: { value: '4900000' } });

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    expect(mockUpdateAssetMutateAsync).toHaveBeenCalledWith({
      id: 'asset-1',
      payload: {
        assetTitle: 'Plot 42-Corner Sector B-17',
        assetCategory: 'PLOT',
        acquisitionCost: 4900000,
        acquisitionDate: '2026-01-15',
        description: 'Prime 1 kanal plot',
      },
    });
  });
});
