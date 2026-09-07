import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting Wadaan ERP Test Database to Uninitialized State...');

  // Delete transactional data in foreign-key dependency order
  await prisma.billLineItem.deleteMany({});
  await prisma.dealInvoice.deleteMany({});
  await prisma.receipt.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.vendorPayment.deleteMany({});
  await prisma.expenseBill.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.journalLine.deleteMany({});
  await prisma.journalEntry.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});

  // Reset SystemSetting id=1 to isInitialized = false
  await prisma.systemSetting.upsert({
    where: { id: 1 },
    update: { isInitialized: false, goLiveDate: null },
    create: { id: 1, isInitialized: false, goLiveDate: null },
  });

  console.log('✅ Database reset successful. System is uninitialized (ready for Wizard).');
}

main()
  .catch((e) => {
    console.error('Reset error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
