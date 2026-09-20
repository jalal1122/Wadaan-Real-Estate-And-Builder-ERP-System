import { PersonalService } from '../services/personal.service';
import { prisma } from '../config/db';
import Decimal from 'decimal.js';

jest.mock('../config/db', () => ({
  prisma: {
    personalContact: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    personalLoan: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    personalRepayment: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('PersonalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createContact', () => {
    it('creates a new personal contact with trimmed fields', async () => {
      (mockPrisma.personalContact.create as jest.Mock).mockResolvedValue({
        id: 'contact-1',
        name: 'Arshad Sir',
        phone: '03001234567',
        relation: 'Partner',
        notes: 'Co-founder personal account',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await PersonalService.createContact({
        name: '  Arshad Sir  ',
        phone: '  03001234567  ',
        relation: 'Partner',
        notes: 'Co-founder personal account',
      });

      expect(result.name).toBe('Arshad Sir');
      expect(mockPrisma.personalContact.create).toHaveBeenCalledWith({
        data: {
          name: 'Arshad Sir',
          phone: '03001234567',
          relation: 'Partner',
          notes: 'Co-founder personal account',
        },
      });
    });
  });

  describe('getAllContacts', () => {
    it('computes correct contact balances and global KPI metrics', async () => {
      (mockPrisma.personalContact.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'contact-1',
          name: 'Arshad Sir',
          phone: '03001112233',
          relation: 'Partner',
          notes: null,
          createdAt: new Date('2026-01-01'),
          loans: [
            {
              id: 'loan-1',
              direction: 'GIVEN',
              principalAmount: new Decimal(100000),
              amountSettled: new Decimal(40000),
              status: 'PARTIAL',
              repayments: [],
            },
            {
              id: 'loan-2',
              direction: 'RECEIVED',
              principalAmount: new Decimal(30000),
              amountSettled: new Decimal(0),
              status: 'OUTSTANDING',
              repayments: [],
            },
          ],
        },
        {
          id: 'contact-2',
          name: 'Zeeshan Sir',
          phone: '03004445566',
          relation: 'Partner',
          notes: null,
          createdAt: new Date('2026-01-02'),
          loans: [
            {
              id: 'loan-3',
              direction: 'GIVEN',
              principalAmount: new Decimal(50000),
              amountSettled: new Decimal(50000),
              status: 'SETTLED',
              repayments: [],
            },
          ],
        },
      ]);

      const result = await PersonalService.getAllContacts();

      expect(result.contacts).toHaveLength(2);

      // Contact 1 (Arshad Sir):
      // Given: 100k, Settled: 40k -> Outstanding Given: 60k
      // Received: 30k, Settled: 0 -> Outstanding Received: 30k
      // Net: 60k - 30k = 30k (He owes us 30k)
      const arshad = result.contacts[0];
      expect(arshad.name).toBe('Arshad Sir');
      expect(arshad.outstandingGiven.toString()).toBe('60000');
      expect(arshad.outstandingReceived.toString()).toBe('30000');
      expect(arshad.netBalance.toString()).toBe('30000');
      expect(arshad.activeLoansCount).toBe(2);

      // Contact 2 (Zeeshan Sir):
      // Given: 50k, Settled: 50k -> Outstanding Given: 0
      // Settled loan -> activeLoansCount: 0
      const zeeshan = result.contacts[1];
      expect(zeeshan.name).toBe('Zeeshan Sir');
      expect(zeeshan.outstandingGiven.toString()).toBe('0');
      expect(zeeshan.netBalance.toString()).toBe('0');
      expect(zeeshan.activeLoansCount).toBe(0);

      // Global KPI:
      // Total Given Outstanding: 60k + 0 = 60k
      // Total Received Outstanding: 30k
      // Net Position: 60k - 30k = +30k
      expect(result.kpi.totalGivenOutstanding.toString()).toBe('60000');
      expect(result.kpi.totalReceivedOutstanding.toString()).toBe('30000');
      expect(result.kpi.netPosition.toString()).toBe('30000');
      expect(result.kpi.totalContacts).toBe(2);
      expect(result.kpi.activeLoansTotal).toBe(2);
    });
  });

  describe('createLoan', () => {
    it('creates loan with OUTSTANDING status and zero amountSettled', async () => {
      (mockPrisma.personalContact.findUnique as jest.Mock).mockResolvedValue({
        id: 'contact-1',
        name: 'Arshad Sir',
      });

      (mockPrisma.personalLoan.create as jest.Mock).mockResolvedValue({
        id: 'loan-10',
        contactId: 'contact-1',
        direction: 'GIVEN',
        principalAmount: new Decimal(200000),
        amountSettled: new Decimal(0),
        status: 'OUTSTANDING',
        description: 'Personal advance for plot auction',
        loanDate: new Date('2026-03-01'),
      });

      const loan = await PersonalService.createLoan('contact-1', {
        direction: 'GIVEN',
        principalAmount: 200000,
        description: 'Personal advance for plot auction',
        loanDate: '2026-03-01',
      });

      expect(loan.id).toBe('loan-10');
      expect(loan.status).toBe('OUTSTANDING');
      expect(loan.amountSettled.toString()).toBe('0');
      expect(mockPrisma.personalLoan.create).toHaveBeenCalledWith({
        data: {
          contactId: 'contact-1',
          direction: 'GIVEN',
          principalAmount: new Decimal(200000),
          amountSettled: new Decimal(0),
          status: 'OUTSTANDING',
          description: 'Personal advance for plot auction',
          loanDate: new Date('2026-03-01'),
        },
      });
    });

    it('throws 404 when contact is not found', async () => {
      (mockPrisma.personalContact.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        PersonalService.createLoan('invalid-contact', {
          direction: 'GIVEN',
          principalAmount: 50000,
          description: 'Test',
          loanDate: '2026-03-01',
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'CONTACT_NOT_FOUND',
      });
    });
  });

  describe('addRepayment', () => {
    it('updates loan to PARTIAL when partial repayment is recorded', async () => {
      (mockPrisma.personalLoan.findUnique as jest.Mock).mockResolvedValue({
        id: 'loan-1',
        principalAmount: new Decimal(100000),
        amountSettled: new Decimal(0),
        status: 'OUTSTANDING',
      });

      (mockPrisma.personalRepayment.create as jest.Mock).mockResolvedValue({
        id: 'rep-1',
        loanId: 'loan-1',
        amount: new Decimal(40000),
        repaidDate: new Date('2026-03-15'),
        notes: 'Partial cash return',
      });

      (mockPrisma.personalLoan.update as jest.Mock).mockResolvedValue({
        id: 'loan-1',
        principalAmount: new Decimal(100000),
        amountSettled: new Decimal(40000),
        status: 'PARTIAL',
      });

      const result = await PersonalService.addRepayment('loan-1', {
        amount: 40000,
        repaidDate: '2026-03-15',
        notes: 'Partial cash return',
      });

      expect(result.loan.status).toBe('PARTIAL');
      expect(result.loan.amountSettled.toString()).toBe('40000');
      expect(mockPrisma.personalLoan.update).toHaveBeenCalledWith({
        where: { id: 'loan-1' },
        data: {
          amountSettled: new Decimal(40000),
          status: 'PARTIAL',
        },
      });
    });

    it('updates loan to SETTLED when remaining balance is fully paid', async () => {
      (mockPrisma.personalLoan.findUnique as jest.Mock).mockResolvedValue({
        id: 'loan-1',
        principalAmount: new Decimal(100000),
        amountSettled: new Decimal(40000),
        status: 'PARTIAL',
      });

      (mockPrisma.personalRepayment.create as jest.Mock).mockResolvedValue({
        id: 'rep-2',
        loanId: 'loan-1',
        amount: new Decimal(60000),
        repaidDate: new Date('2026-03-20'),
        notes: 'Final settlement via bank transfer',
      });

      (mockPrisma.personalLoan.update as jest.Mock).mockResolvedValue({
        id: 'loan-1',
        principalAmount: new Decimal(100000),
        amountSettled: new Decimal(100000),
        status: 'SETTLED',
      });

      const result = await PersonalService.addRepayment('loan-1', {
        amount: 60000,
        repaidDate: '2026-03-20',
        notes: 'Final settlement via bank transfer',
      });

      expect(result.loan.status).toBe('SETTLED');
      expect(result.loan.amountSettled.toString()).toBe('100000');
      expect(mockPrisma.personalLoan.update).toHaveBeenCalledWith({
        where: { id: 'loan-1' },
        data: {
          amountSettled: new Decimal(100000),
          status: 'SETTLED',
        },
      });
    });

    it('throws 400 REPAYMENT_EXCEEDS_OUTSTANDING if repayment > outstanding', async () => {
      (mockPrisma.personalLoan.findUnique as jest.Mock).mockResolvedValue({
        id: 'loan-1',
        principalAmount: new Decimal(50000),
        amountSettled: new Decimal(30000),
        status: 'PARTIAL', // Outstanding is 20,000
      });

      await expect(
        PersonalService.addRepayment('loan-1', {
          amount: 25000, // Exceeds 20,000
          repaidDate: '2026-03-20',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'REPAYMENT_EXCEEDS_OUTSTANDING',
      });
    });

    it('throws 400 LOAN_ALREADY_SETTLED if loan is already settled', async () => {
      (mockPrisma.personalLoan.findUnique as jest.Mock).mockResolvedValue({
        id: 'loan-1',
        principalAmount: new Decimal(50000),
        amountSettled: new Decimal(50000),
        status: 'SETTLED',
      });

      await expect(
        PersonalService.addRepayment('loan-1', {
          amount: 1000,
          repaidDate: '2026-03-20',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'LOAN_ALREADY_SETTLED',
      });
    });
  });
});
