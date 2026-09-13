import { z } from 'zod';
import Decimal from 'decimal.js';
import { AccountCategory } from '@prisma/client';
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

export const CreateAccountSchema = z.object({
  accountCode: z.string().min(1, 'Account code is required'),
  accountName: z.string().min(1, 'Account name is required'),
  category: z.nativeEnum(AccountCategory, {
    message: 'Category must be one of ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE'
  })
});

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;

export const UpdateAccountSchema = z
  .object({
    accountName: z.string().min(1, 'Account name is required').optional(),
    category: z
      .nativeEnum(AccountCategory, {
        message: 'Category must be one of ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE'
      })
      .optional()
  })
  .refine((data) => data.accountName !== undefined || data.category !== undefined, {
    message: 'At least one field (accountName or category) must be provided for update'
  });

export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;

export const CreateJournalLineSchema = z
  .object({
    accountId: z.string().uuid('Invalid account ID format'),
    debitAmount: z
      .union([
        z.number().min(0, 'Debit amount must be greater than or equal to 0'),
        z.string().regex(/^\d+(\.\d+)?$/, 'Debit amount must be a non-negative number'),
        z.instanceof(Decimal)
      ])
      .default(0),
    creditAmount: z
      .union([
        z.number().min(0, 'Credit amount must be greater than or equal to 0'),
        z.string().regex(/^\d+(\.\d+)?$/, 'Credit amount must be a non-negative number'),
        z.instanceof(Decimal)
      ])
      .default(0),
    memo: z.string().max(200, 'Memo cannot exceed 200 characters').optional().nullable(),
    customerId: z.string().uuid('Invalid customer ID format').optional().nullable(),
    vendorId: z.string().uuid('Invalid vendor ID format').optional().nullable(),
    projectId: z.string().uuid('Invalid project ID format').optional().nullable()
  })
  .refine(
    (line) => {
      const debit = new Decimal(line.debitAmount || 0);
      const credit = new Decimal(line.creditAmount || 0);
      // Rule: A single line cannot have both a debit and a credit
      return !(debit.gt(0) && credit.gt(0));
    },
    {
      message: 'A single journal line cannot contain both debit and credit amounts',
      path: ['debitAmount']
    }
  );

export type CreateJournalLineInput = z.infer<typeof CreateJournalLineSchema>;


export const CreateJournalSchema = z.object({
  entryDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'entryDate must be a valid date'
    })
    .optional()
    .default(() => new Date().toISOString()),
  description: z.string().min(1, 'Description is required'),
  lines: z
    .array(CreateJournalLineSchema)
    .min(2, 'A journal entry must contain at least 2 lines (debit and credit)')
});

export type CreateJournalInput = z.infer<typeof CreateJournalSchema>;

// ==========================================
// MODULE 2 SCHEMAS: PAYABLES & PROJECTS
// ==========================================

export const CreateProjectSchema = z
  .object({
    name: z.string().optional(),
    projectName: z.string().optional(),
    prefix: z.string().optional(),
    projectPrefix: z.string().optional(),
    masterBOQ: z.union([
      z.number().min(0, 'masterBOQ must be greater than or equal to 0'),
      z.string().regex(/^\d+(\.\d+)?$/, 'masterBOQ must be a non-negative number')
    ])
  })
  .refine((data) => !!(data.name || data.projectName), {
    message: 'Project name is required',
    path: ['projectName']
  })
  .refine((data) => !!(data.prefix || data.projectPrefix), {
    message: 'Project prefix is required',
    path: ['projectPrefix']
  })
  .transform((data) => ({
    projectName: (data.projectName || data.name)!,
    projectPrefix: (data.projectPrefix || data.prefix)!.toUpperCase(),
    masterBOQ: data.masterBOQ
  }));

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD'])
});

export type UpdateProjectStatusInput = z.infer<typeof UpdateProjectStatusSchema>;

export const CreateVendorSchema = z.object({
  vendorName: z.string().min(1, 'Vendor name is required'),
  phone: z.string().optional()
});

export type CreateVendorInput = z.infer<typeof CreateVendorSchema>;

export const CreateBillLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be an integer greater than 0'),
  unitPrice: z.union([
    z.number().min(0, 'unitPrice must be non-negative'),
    z.string().regex(/^\d+(\.\d+)?$/, 'unitPrice must be a non-negative number')
  ])
});

export const CreateBillSchema = z
  .object({
    vendorId: z.string().uuid('Invalid vendor ID format'),
    projectId: z.string().uuid('Invalid project ID format').optional().nullable(),
    invoiceNumber: z.string().min(1, 'Invoice number is required'),
    billDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'billDate must be a valid date'
      })
      .optional()
      .default(() => new Date().toISOString()),
    paymentType: z.enum(['ACCOUNTS_PAYABLE', 'DIRECT_CASH']),
    sourceAccountId: z.string().uuid('Invalid source account ID format').optional().nullable(),
    lineItems: z
      .array(CreateBillLineItemSchema)
      .min(1, 'At least one line item is required')
  })
  .refine(
    (data) => {
      if (data.paymentType === 'DIRECT_CASH' && !data.sourceAccountId) {
        return false;
      }
      return true;
    },
    {
      message: 'sourceAccountId is required when paymentType is DIRECT_CASH',
      path: ['sourceAccountId']
    }
  );

export type CreateBillInput = z.infer<typeof CreateBillSchema>;

export const CreatePaymentSchema = z.object({
  vendorId: z.string().uuid('Invalid vendor ID format'),
  sourceAccountId: z.string().uuid('Invalid source account ID format'),
  amountPaid: z
    .union([
      z.number().positive('amountPaid must be greater than 0'),
      z.string().regex(/^\d+(\.\d+)?$/, 'amountPaid must be a positive number')
    ])
    .refine((val) => new Decimal(val).gt(0), {
      message: 'amountPaid must be greater than 0'
    }),
  chequeRef: z.string().optional().nullable(),
  transactionId: z.string().optional().nullable(),
  paymentDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'paymentDate must be a valid date'
    })
    .optional()
    .default(() => new Date().toISOString())
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

// ==========================================
// MODULE 3: RECEIVABLES & REVENUE SCHEMAS
// ==========================================

export const CreateCustomerSchema = z.object({
  fullName: z.string().min(1, 'fullName is required'),
  phone: z.string().min(1, 'phone is required')
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

export const CreateDealInvoiceSchema = z.object({
  description: z.string().min(1, 'Invoice description is required'),
  amount: z
    .union([
      z.number().positive('amount must be greater than 0'),
      z.string().regex(/^\d+(\.\d+)?$/, 'amount must be a positive number')
    ])
    .refine((val) => new Decimal(val).gt(0), {
      message: 'amount must be greater than 0'
    }),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'dueDate must be a valid date'
  })
});

export type CreateDealInvoiceInput = z.infer<typeof CreateDealInvoiceSchema>;

export const CreateDealSchema = z
  .object({
    customerId: z.string().uuid('Invalid customer ID format'),
    dealType: z.enum(['WADAAN_SALE', 'CONSTRUCTION', 'BROKERAGE']),
    projectId: z.string().uuid('Invalid project ID format').optional().nullable(),
    totalValue: z
      .union([
        z.number().positive('totalValue must be greater than 0'),
        z.string().regex(/^\d+(\.\d+)?$/, 'totalValue must be a positive number')
      ])
      .refine((val) => new Decimal(val).gt(0), {
        message: 'totalValue must be greater than 0'
      }),
    commissionAmount: z
      .union([
        z.number().min(0, 'commissionAmount cannot be negative'),
        z.string().regex(/^\d+(\.\d+)?$/, 'commissionAmount must be a non-negative number')
      ])
      .optional()
      .nullable(),
    invoices: z.array(CreateDealInvoiceSchema).min(1, 'At least one invoice is required')
  })
  .refine(
    (data) => {
      const total = new Decimal(data.totalValue);
      const invoicesSum = data.invoices.reduce(
        (sum, inv) => sum.plus(new Decimal(inv.amount)),
        new Decimal(0)
      );
      return total.equals(invoicesSum);
    },
    {
      message: 'The sum of invoice amounts must equal totalValue exactly',
      path: ['invoices']
    }
  )
  .refine(
    (data) => {
      if (data.dealType === 'BROKERAGE') {
        if (data.commissionAmount === undefined || data.commissionAmount === null) {
          return false;
        }
        const comm = new Decimal(data.commissionAmount);
        const total = new Decimal(data.totalValue);
        return comm.gt(0) && comm.lte(total);
      }
      return true;
    },
    {
      message: 'commissionAmount is required for BROKERAGE deals and must be between 0 and totalValue',
      path: ['commissionAmount']
    }
  );

export type CreateDealInput = z.infer<typeof CreateDealSchema>;

export const CreateReceiptSchema = z
  .object({
    customerId: z.string().uuid('Invalid customer ID format'),
    invoiceIds: z.array(z.string().uuid('Invalid invoice ID format')).optional().default([]),
    amount: z
      .union([
        z.number().positive('amount must be greater than 0'),
        z.string().regex(/^\d+(\.\d+)?$/, 'amount must be a positive number')
      ])
      .refine((val) => new Decimal(val).gt(0), {
        message: 'amount must be greater than 0'
      }),
    paymentMethod: z.enum(['CASH', 'CHEQUE', 'ONLINE']),
    bankRefNumber: z.string().optional().nullable(),
    targetAccountId: z.string().uuid('Invalid target account ID format').optional().nullable()
  })
  .refine(
    (data) => {
      if ((data.paymentMethod === 'CHEQUE' || data.paymentMethod === 'ONLINE') && !data.bankRefNumber?.trim()) {
        return false;
      }
      return true;
    },
    {
      message: 'bankRefNumber is required for CHEQUE and ONLINE payments',
      path: ['bankRefNumber']
    }
  );

export type CreateReceiptInput = z.infer<typeof CreateReceiptSchema>;

export const ClearChequeSchema = z.object({
  targetBankAccountId: z.string().uuid('Invalid target bank account ID format')
});

export type ClearChequeInput = z.infer<typeof ClearChequeSchema>;

export const TransferFileSchema = z.object({
  newCustomerId: z.string().uuid('Invalid new customer ID format'),
  transferFeeAmount: z
    .union([
      z.number().min(0, 'transferFeeAmount cannot be negative'),
      z.string().regex(/^\d+(\.\d+)?$/, 'transferFeeAmount must be a non-negative number')
    ])
    .default(0)
});

export type TransferFileInput = z.infer<typeof TransferFileSchema>;

export const ApplyWalletSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID format'),
  amount: z
    .union([
      z.number().positive('amount must be greater than 0'),
      z.string().regex(/^\d+(\.\d+)?$/, 'amount must be a positive number')
    ])
    .refine((val) => new Decimal(val).gt(0), {
      message: 'amount must be greater than 0'
    })
});

export type ApplyWalletInput = z.infer<typeof ApplyWalletSchema>;

