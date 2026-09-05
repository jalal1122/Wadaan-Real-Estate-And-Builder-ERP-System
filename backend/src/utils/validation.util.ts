import { z } from 'zod';
import Decimal from 'decimal.js';
import { AppError } from '../middleware/errorHandler';
import { MathUtility } from './math.util';

export const AdminSetupSchema = z.object({
  email: z.string().email('Invalid email address'),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  fullName: z.string().min(1, 'Full name is required')
});

export const CashAndBankInputSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  code: z.string().min(1, 'Account code is required'),
  balance: z.union([
    z.number().min(0, 'Bank balance must be greater than or equal to 0'),
    z.string().regex(/^\d+(\.\d+)?$/, 'Bank balance must be a non-negative number')
  ])
});

export const ActiveProjectInputSchema = z
  .object({
    name: z.string().min(1, 'Project name is required'),
    prefix: z
      .string()
      .min(1, 'Project prefix is required')
      .transform((val) => val.toUpperCase()),
    masterBOQ: z
      .union([
        z.number().min(0, 'masterBOQ must be greater than or equal to 0'),
        z.string().regex(/^\d+(\.\d+)?$/, 'masterBOQ must be a non-negative number')
      ])
      .optional(),
    boq: z
      .union([
        z.number().min(0, 'boq must be greater than or equal to 0'),
        z.string().regex(/^\d+(\.\d+)?$/, 'boq must be a non-negative number')
      ])
      .optional(),
    spentToDate: z
      .union([
        z.number().min(0, 'spentToDate must be greater than or equal to 0'),
        z.string().regex(/^\d+(\.\d+)?$/, 'spentToDate must be a non-negative number')
      ])
      .default(0)
  })
  .refine((data) => data.masterBOQ !== undefined || data.boq !== undefined, {
    message: 'Either masterBOQ or boq must be provided for project',
    path: ['masterBOQ']
  });

export const UnpaidPayableInputSchema = z.object({
  vendorName: z.string().min(1, 'Vendor name is required'),
  phone: z.string().optional(),
  amountDue: z.union([
    z.number().min(0, 'amountDue must be greater than or equal to 0'),
    z.string().regex(/^\d+(\.\d+)?$/, 'amountDue must be a non-negative number')
  ]),
  projectId: z.string().optional()
});

export const ActiveDealInputSchema = z
  .object({
    customerName: z.string().min(1, 'Customer name is required'),
    phone: z.string().min(1, 'Phone number is required'),
    projectName: z.string().optional(),
    dealType: z.enum(['WADAAN_SALE', 'CONSTRUCTION', 'BROKERAGE']).optional(),
    totalDealValue: z.union([
      z.number().min(0, 'totalDealValue must be greater than or equal to 0'),
      z.string().regex(/^\d+(\.\d+)?$/, 'totalDealValue must be a non-negative number')
    ]),
    amountReceivedPast: z
      .union([
        z.number().min(0, 'amountReceivedPast must be greater than or equal to 0'),
        z.string().regex(/^\d+(\.\d+)?$/, 'amountReceivedPast must be a non-negative number')
      ])
      .default(0)
  })
  .refine(
    (data) => {
      const total = new Decimal(data.totalDealValue);
      const past = new Decimal(data.amountReceivedPast);
      return past.lessThanOrEqualTo(total);
    },
    {
      message: 'amountReceivedPast cannot exceed totalDealValue',
      path: ['amountReceivedPast']
    }
  );

export const GoLivePayloadSchema = z
  .object({
    admin: AdminSetupSchema.optional(),
    cashAndBanks: z.array(CashAndBankInputSchema).min(1, 'At least one cash or bank account is required'),
    activeProjects: z.array(ActiveProjectInputSchema).default([]),
    unpaidPayables: z.array(UnpaidPayableInputSchema).default([]),
    activeDeals: z.array(ActiveDealInputSchema).default([])
  })
  .refine(
    (data) => {
      const prefixes = data.activeProjects.map((p) => p.prefix.toUpperCase());
      return new Set(prefixes).size === prefixes.length;
    },
    {
      message: 'Active project prefixes must be unique',
      path: ['activeProjects']
    }
  )
  .refine(
    (data) => {
      const codes = data.cashAndBanks.map((b) => b.code);
      return new Set(codes).size === codes.length;
    },
    {
      message: 'Cash and bank account codes must be unique',
      path: ['cashAndBanks']
    }
  );

export type GoLivePayload = z.infer<typeof GoLivePayloadSchema>;

export class DoubleEntryValidator {
  /**
   * Validates that total debits equal total credits.
   * If unbalanced, throws an AppError to roll back the transaction.
   */
  static validate(
    lines: { debitAmount: number | string | Decimal; creditAmount: number | string | Decimal }[]
  ): void {
    if (lines.length < 2) {
      throw new AppError(
        'A journal entry must contain at least 2 lines (debit and credit).',
        400,
        'INVALID_JOURNAL_LINES'
      );
    }

    const signedDifferences = lines.map((line) =>
      new Decimal(line.debitAmount || 0).minus(new Decimal(line.creditAmount || 0))
    );

    if (!MathUtility.isZeroSum(signedDifferences)) {
      const totalDebits = lines.reduce(
        (sum, line) => sum.plus(new Decimal(line.debitAmount || 0)),
        new Decimal(0)
      );
      const totalCredits = lines.reduce(
        (sum, line) => sum.plus(new Decimal(line.creditAmount || 0)),
        new Decimal(0)
      );

      throw new AppError(
        `Double-entry journal is unbalanced. Total Debits (${totalDebits.toFixed(2)}) must equal Total Credits (${totalCredits.toFixed(2)}).`,
        400,
        'UNBALANCED_JOURNAL'
      );
    }
  }
}
