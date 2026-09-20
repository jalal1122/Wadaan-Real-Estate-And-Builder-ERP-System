import Decimal from 'decimal.js';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import {
  CreatePersonalContactInput,
  CreatePersonalLoanInput,
  AddPersonalRepaymentInput
} from '../utils/validation.util';
import { PersonalTxDirection, PersonalLoanStatus } from '@prisma/client';

export class PersonalService {
  /**
   * Fetches all registered personal contacts with aggregated ledger metrics.
   */
  static async getAllContacts() {
    const contacts = await prisma.personalContact.findMany({
      include: {
        loans: {
          include: {
            repayments: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    let globalTotalGiven = new Decimal(0);
    let globalTotalGivenSettled = new Decimal(0);
    let globalTotalReceived = new Decimal(0);
    let globalTotalReceivedSettled = new Decimal(0);
    let totalActiveLoans = 0;

    const contactSummaries = contacts.map((contact) => {
      let totalGiven = new Decimal(0);
      let totalGivenSettled = new Decimal(0);
      let totalReceived = new Decimal(0);
      let totalReceivedSettled = new Decimal(0);
      let activeLoansCount = 0;

      contact.loans.forEach((loan) => {
        const principal = new Decimal(loan.principalAmount);
        const settled = new Decimal(loan.amountSettled);

        if (loan.direction === 'GIVEN') {
          totalGiven = totalGiven.plus(principal);
          totalGivenSettled = totalGivenSettled.plus(settled);
        } else {
          totalReceived = totalReceived.plus(principal);
          totalReceivedSettled = totalReceivedSettled.plus(settled);
        }

        if (loan.status !== 'SETTLED') {
          activeLoansCount++;
          totalActiveLoans++;
        }
      });

      const outstandingGiven = totalGiven.minus(totalGivenSettled);
      const outstandingReceived = totalReceived.minus(totalReceivedSettled);
      // Net: positive means they owe us; negative means we owe them
      const netBalance = outstandingGiven.minus(outstandingReceived);

      globalTotalGiven = globalTotalGiven.plus(totalGiven);
      globalTotalGivenSettled = globalTotalGivenSettled.plus(totalGivenSettled);
      globalTotalReceived = globalTotalReceived.plus(totalReceived);
      globalTotalReceivedSettled = globalTotalReceivedSettled.plus(totalReceivedSettled);

      return {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        relation: contact.relation,
        notes: contact.notes,
        createdAt: contact.createdAt,
        totalLoansCount: contact.loans.length,
        activeLoansCount,
        totalGiven,
        totalGivenSettled,
        outstandingGiven,
        totalReceived,
        totalReceivedSettled,
        outstandingReceived,
        netBalance
      };
    });

    const globalOutstandingGiven = globalTotalGiven.minus(globalTotalGivenSettled);
    const globalOutstandingReceived = globalTotalReceived.minus(globalTotalReceivedSettled);
    const globalNetPosition = globalOutstandingGiven.minus(globalOutstandingReceived);

    return {
      kpi: {
        totalGivenOutstanding: globalOutstandingGiven,
        totalReceivedOutstanding: globalOutstandingReceived,
        netPosition: globalNetPosition,
        totalContacts: contacts.length,
        activeLoansTotal: totalActiveLoans
      },
      contacts: contactSummaries
    };
  }

  /**
   * Fetches single contact with all loan records and repayment history.
   */
  static async getContactById(id: string) {
    const contact = await prisma.personalContact.findUnique({
      where: { id },
      include: {
        loans: {
          include: {
            repayments: {
              orderBy: { repaidDate: 'desc' }
            }
          },
          orderBy: { loanDate: 'desc' }
        }
      }
    });

    if (!contact) {
      throw new AppError('Personal contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    let totalGiven = new Decimal(0);
    let totalGivenSettled = new Decimal(0);
    let totalReceived = new Decimal(0);
    let totalReceivedSettled = new Decimal(0);

    const loans = contact.loans.map((loan) => {
      const principal = new Decimal(loan.principalAmount);
      const settled = new Decimal(loan.amountSettled);
      const outstanding = principal.minus(settled);

      if (loan.direction === 'GIVEN') {
        totalGiven = totalGiven.plus(principal);
        totalGivenSettled = totalGivenSettled.plus(settled);
      } else {
        totalReceived = totalReceived.plus(principal);
        totalReceivedSettled = totalReceivedSettled.plus(settled);
      }

      return {
        ...loan,
        principalAmount: principal,
        amountSettled: settled,
        outstandingAmount: outstanding
      };
    });

    const outstandingGiven = totalGiven.minus(totalGivenSettled);
    const outstandingReceived = totalReceived.minus(totalReceivedSettled);
    const netBalance = outstandingGiven.minus(outstandingReceived);

    return {
      contact: {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        relation: contact.relation,
        notes: contact.notes,
        createdAt: contact.createdAt
      },
      summary: {
        totalGiven,
        totalGivenSettled,
        outstandingGiven,
        totalReceived,
        totalReceivedSettled,
        outstandingReceived,
        netBalance
      },
      loans
    };
  }

  /**
   * Creates a new personal contact.
   */
  static async createContact(data: CreatePersonalContactInput) {
    return await prisma.personalContact.create({
      data: {
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        relation: data.relation?.trim() || null,
        notes: data.notes?.trim() || null
      }
    });
  }

  /**
   * Updates contact metadata.
   */
  static async updateContact(id: string, data: Partial<CreatePersonalContactInput>) {
    const existing = await prisma.personalContact.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Personal contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    return await prisma.personalContact.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.relation !== undefined && { relation: data.relation?.trim() || null }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null })
      }
    });
  }

  /**
   * Deletes a contact and cascades all loans/repayments.
   */
  static async deleteContact(id: string) {
    const existing = await prisma.personalContact.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Personal contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    return await prisma.personalContact.delete({
      where: { id }
    });
  }

  /**
   * Records a new loan transaction (GIVEN or RECEIVED).
   */
  static async createLoan(contactId: string, data: CreatePersonalLoanInput) {
    const contact = await prisma.personalContact.findUnique({ where: { id: contactId } });
    if (!contact) {
      throw new AppError('Personal contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    const principal = new Decimal(data.principalAmount);

    return await prisma.personalLoan.create({
      data: {
        contactId,
        direction: data.direction as PersonalTxDirection,
        principalAmount: principal,
        amountSettled: new Decimal(0),
        status: PersonalLoanStatus.OUTSTANDING,
        description: data.description.trim(),
        loanDate: new Date(data.loanDate)
      }
    });
  }

  /**
   * Records a repayment against a specific loan and advances status.
   */
  static async addRepayment(loanId: string, data: AddPersonalRepaymentInput) {
    return await prisma.$transaction(async (tx) => {
      const loan = await tx.personalLoan.findUnique({
        where: { id: loanId }
      });

      if (!loan) {
        throw new AppError('Personal loan not found', 404, 'LOAN_NOT_FOUND');
      }

      if (loan.status === 'SETTLED') {
        throw new AppError('This loan is already fully settled', 400, 'LOAN_ALREADY_SETTLED');
      }

      const repaymentAmount = new Decimal(data.amount);
      const principal = new Decimal(loan.principalAmount);
      const currentSettled = new Decimal(loan.amountSettled);
      const outstanding = principal.minus(currentSettled);

      if (repaymentAmount.gt(outstanding)) {
        throw new AppError(
          `Repayment amount (${repaymentAmount.toString()}) cannot exceed remaining outstanding balance (${outstanding.toString()})`,
          400,
          'REPAYMENT_EXCEEDS_OUTSTANDING'
        );
      }

      // Create repayment record
      const repayment = await tx.personalRepayment.create({
        data: {
          loanId,
          amount: repaymentAmount,
          repaidDate: new Date(data.repaidDate),
          notes: data.notes?.trim() || null
        }
      });

      const newSettled = currentSettled.plus(repaymentAmount);
      let newStatus: PersonalLoanStatus = PersonalLoanStatus.PARTIAL;

      if (newSettled.gte(principal)) {
        newStatus = PersonalLoanStatus.SETTLED;
      }

      const updatedLoan = await tx.personalLoan.update({
        where: { id: loanId },
        data: {
          amountSettled: newSettled,
          status: newStatus
        }
      });

      return {
        loan: updatedLoan,
        repayment
      };
    });
  }

  /**
   * Deletes a loan and cascades its repayments.
   */
  static async deleteLoan(loanId: string) {
    const loan = await prisma.personalLoan.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw new AppError('Personal loan not found', 404, 'LOAN_NOT_FOUND');
    }

    return await prisma.personalLoan.delete({
      where: { id: loanId }
    });
  }
}
