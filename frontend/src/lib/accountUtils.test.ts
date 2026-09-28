import { describe, it, expect } from 'vitest';
import { isBankAssetAccount } from './accountUtils';

describe('isBankAssetAccount', () => {
  it('returns false for null/undefined accounts', () => {
    expect(isBankAssetAccount(null)).toBe(false);
    expect(isBankAssetAccount(undefined)).toBe(false);
  });

  it('correctly identifies Cash / Safe accounts as NOT bank accounts', () => {
    expect(isBankAssetAccount({ accountCode: '1010-01', accountName: 'Office Safe (Vault A)' })).toBe(false);
    expect(isBankAssetAccount({ accountCode: '1001', accountName: 'Office Cash Safe' })).toBe(false);
    expect(isBankAssetAccount({ accountCode: '1010-02', accountName: 'Petty Cash Peshawar' })).toBe(false);
    expect(isBankAssetAccount({ accountCode: '1010-03', accountName: 'Main Vault Cash' })).toBe(false);
  });

  it('correctly identifies HBL Operations Account as a bank account', () => {
    expect(isBankAssetAccount({ accountCode: '1020-01', accountName: 'HBL Operations Account' })).toBe(true);
    expect(isBankAssetAccount({ accountCode: '1030-01', accountName: 'HBL Operations' })).toBe(true);
  });

  it('correctly identifies Standard Chartered as a bank account', () => {
    expect(isBankAssetAccount({ accountCode: '1020-02', accountName: 'Standard Chartered (Escrow Ops)' })).toBe(true);
  });

  it('correctly identifies other Pakistani banks and generic bank accounts', () => {
    expect(isBankAssetAccount({ accountCode: '1020-03', accountName: 'Meezan Bank' })).toBe(true);
    expect(isBankAssetAccount({ accountCode: '1002', accountName: 'Meezan Bank - Ops' })).toBe(true);
    expect(isBankAssetAccount({ accountCode: '1020-04', accountName: 'MCB Islamic' })).toBe(true);
    expect(isBankAssetAccount({ accountCode: '1020-05', accountName: 'UBL Corporate' })).toBe(true);
    expect(isBankAssetAccount({ accountCode: '1020-06', accountName: 'Bank Alfalah Premier' })).toBe(true);
    expect(isBankAssetAccount({ accountCode: '1020-07', accountName: 'Allied Bank Limited' })).toBe(true);
  });

  it('returns false for non-liquid asset accounts like AR and WIP', () => {
    expect(isBankAssetAccount({ accountCode: '1100', accountName: 'Accounts Receivable (AR)' })).toBe(false);
    expect(isBankAssetAccount({ accountCode: '1200', accountName: 'Construction Work-in-Progress (WIP)' })).toBe(false);
  });
});
