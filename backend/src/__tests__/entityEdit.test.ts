import { ProjectService } from '../services/project.service';
import { VendorService } from '../services/vendor.service';
import { CustomerService } from '../services/customer.service';
import { WadaanAssetService } from '../services/wadaanAsset.service';
import { prisma } from '../config/db';
import Decimal from 'decimal.js';

jest.mock('../config/db', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    vendor: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    wadaanAsset: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Core Entity Editing Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ProjectService.updateProject', () => {
    test('successfully updates projectName and masterBOQ', async () => {
      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'proj-1',
        projectName: 'Wadaan Heights',
        projectPrefix: 'WH',
        masterBOQ: new Decimal(50000000),
      });

      (mockPrisma.project.update as jest.Mock).mockResolvedValue({
        id: 'proj-1',
        projectName: 'Wadaan Heights Tower A',
        projectPrefix: 'WH',
        masterBOQ: new Decimal(60000000),
      });

      const result = await ProjectService.updateProject('proj-1', {
        projectName: 'Wadaan Heights Tower A',
        masterBOQ: 60000000,
      });

      expect(result.projectName).toBe('Wadaan Heights Tower A');
      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: {
          projectName: 'Wadaan Heights Tower A',
          masterBOQ: new Decimal(60000000),
        },
      });
    });

    test('throws 404 if project does not exist', async () => {
      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        ProjectService.updateProject('invalid-id', { projectName: 'New Name' })
      ).rejects.toThrow('Project not found');
    });
  });

  describe('VendorService.updateVendor', () => {
    test('successfully updates vendorName and phone', async () => {
      (mockPrisma.vendor.findUnique as jest.Mock).mockResolvedValue({
        id: 'vend-1',
        vendorName: 'Ali Hardware',
        phone: '03001234567',
      });

      (mockPrisma.vendor.update as jest.Mock).mockResolvedValue({
        id: 'vend-1',
        vendorName: 'Ali Steel & Hardware',
        phone: '03009999999',
      });

      const result = await VendorService.updateVendor('vend-1', {
        vendorName: 'Ali Steel & Hardware',
        phone: '03009999999',
      });

      expect(result.vendorName).toBe('Ali Steel & Hardware');
      expect(mockPrisma.vendor.update).toHaveBeenCalledWith({
        where: { id: 'vend-1' },
        data: {
          vendorName: 'Ali Steel & Hardware',
          phone: '03009999999',
        },
      });
    });

    test('throws 404 if vendor does not exist', async () => {
      (mockPrisma.vendor.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        VendorService.updateVendor('invalid-id', { vendorName: 'New Name' })
      ).rejects.toThrow('Vendor not found');
    });
  });

  describe('CustomerService.updateCustomer', () => {
    test('successfully updates fullName and phone without altering walletBalance', async () => {
      (mockPrisma.customer.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1',
        fullName: 'Tariq Malik',
        phone: '03001112233',
        walletBalance: new Decimal(500000),
      });

      (mockPrisma.customer.update as jest.Mock).mockResolvedValue({
        id: 'cust-1',
        fullName: 'Tariq Mehmood Malik',
        phone: '03004445566',
        walletBalance: new Decimal(500000),
      });

      const result = await CustomerService.updateCustomer('cust-1', {
        fullName: 'Tariq Mehmood Malik',
        phone: '03004445566',
      });

      expect(result.fullName).toBe('Tariq Mehmood Malik');
      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: {
          fullName: 'Tariq Mehmood Malik',
          phone: '03004445566',
        },
      });
    });

    test('throws 404 if customer does not exist', async () => {
      (mockPrisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        CustomerService.updateCustomer('invalid-id', { fullName: 'New Name' })
      ).rejects.toThrow("Customer with ID 'invalid-id' not found");
    });
  });

  describe('WadaanAssetService.updateAsset', () => {
    test('successfully updates AVAILABLE asset details', async () => {
      (mockPrisma.wadaanAsset.findUnique as jest.Mock).mockResolvedValue({
        id: 'asset-1',
        assetTitle: 'Plot 45 Faisal Hills',
        assetCategory: 'PLOT',
        acquisitionCost: new Decimal(4500000),
        acquisitionDate: new Date('2025-01-01'),
        status: 'AVAILABLE',
      });

      (mockPrisma.wadaanAsset.update as jest.Mock).mockResolvedValue({
        id: 'asset-1',
        assetTitle: 'Plot 45-B Faisal Hills Executive Block',
        assetCategory: 'PLOT',
        acquisitionCost: new Decimal(4800000),
        acquisitionDate: new Date('2025-01-01'),
        status: 'AVAILABLE',
      });

      const result = await WadaanAssetService.updateAsset('asset-1', {
        assetTitle: 'Plot 45-B Faisal Hills Executive Block',
        acquisitionCost: 4800000,
      });

      expect(result.assetTitle).toBe('Plot 45-B Faisal Hills Executive Block');
    });

    test('throws 409 conflict if asset is RESERVED or SOLD', async () => {
      (mockPrisma.wadaanAsset.findUnique as jest.Mock).mockResolvedValue({
        id: 'asset-2',
        assetTitle: 'Villa 12',
        status: 'RESERVED',
      });

      await expect(
        WadaanAssetService.updateAsset('asset-2', {
          assetTitle: 'Renamed Villa',
        })
      ).rejects.toThrow('Cannot update asset "Villa 12" because it is currently RESERVED.');
    });
  });
});
