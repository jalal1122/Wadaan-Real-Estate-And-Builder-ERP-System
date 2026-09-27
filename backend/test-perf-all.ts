import { prisma } from './src/config/db';
import { CustomerService } from './src/services/customer.service';
import { DealService } from './src/services/deal.service';
import { BillService } from './src/services/bill.service';
import { DocumentService } from './src/services/document.service';
import { JournalService } from './src/services/journal.service';
import { PersonalService } from './src/services/personal.service';
import { ReceiptService } from './src/services/receipt.service';
import { VendorService } from './src/services/vendor.service';
import { SystemService } from './src/services/system.service';
import { ProjectService } from './src/services/project.service';
import { FifoService } from './src/services/fifo.service';
import { AccountService } from './src/services/account.service';
import { AuthService } from './src/services/auth.service';

async function run() {
  console.log('--- WADAAN ERP: ALL ENDPOINTS PERFORMANCE BENCHMARK ---');
  console.time('DB Connect');
  await prisma.$connect();
  console.timeEnd('DB Connect');

  // Warmup
  await prisma.$queryRaw`SELECT 1`;

  const results: any[] = [];

  const bench = async (module: string, name: string, fn: () => Promise<any>) => {
    let coldTimeStr = '';
    let warmTimeStr = '';
    
    // Cold Start
    const coldStart = process.hrtime();
    await fn();
    const coldEnd = process.hrtime(coldStart);
    const coldMs = (coldEnd[0] * 1000 + coldEnd[1] / 1e6).toFixed(2);
    coldTimeStr = `${coldMs}ms`;

    // Warm Start (Cache Hit or DB Buffer Hit)
    const warmStart = process.hrtime();
    await fn();
    const warmEnd = process.hrtime(warmStart);
    const warmMs = (warmEnd[0] * 1000 + warmEnd[1] / 1e6).toFixed(2);
    warmTimeStr = `${warmMs}ms`;

    console.log(`[${module}] ${name} | Cold: ${coldTimeStr} | Warm: ${warmTimeStr}`);
    results.push({ module, name, cold: coldMs, warm: warmMs });
  };

  // 1. General GET All endpoints
  console.log('\n>> Testing General Collection Endpoints...');
  await bench('Customers', 'getAllCustomers', () => CustomerService.getAllCustomers());
  await bench('Deals', 'getAllDeals', () => DealService.getAllDeals());
  await bench('Bills', 'getAllBills', () => BillService.getAllBills());
  await bench('Documents', 'getDocumentArchive', () => DocumentService.getDocumentArchive({}));
  await bench('Journals', 'getEntries', () => JournalService.getEntries(1, 20));
  await bench('Personal', 'getAllContacts', () => PersonalService.getAllContacts());
  await bench('Receipts', 'getWaitingRoom', () => ReceiptService.getWaitingRoom());
  await bench('Vendors', 'getAllVendors', () => VendorService.getAllVendors());
  await bench('Projects', 'getAllProjects', () => ProjectService.getAllProjects());
  await bench('Fifo', 'getAllPayments', () => FifoService.getAllPayments());
  await bench('Accounts', 'getLiveBalances', () => AccountService.getLiveBalances());
  await bench('Auth', 'getLockoutStatus', () => AuthService.getLockoutStatus());
  await bench('System', 'getStatus', () => SystemService.getStatus());

  // 2. ID-Specific GET endpoints
  console.log('\n>> Testing Specific ID Endpoints...');
  const customer = await prisma.customer.findFirst();
  if (customer) await bench('Customers', 'getCustomerById', () => CustomerService.getCustomerById(customer.id));

  const deal = await prisma.deal.findFirst();
  if (deal) {
    await bench('Deals', 'getDealById', () => DealService.getDealById(deal.id));
    await bench('Deals', 'getCoClients', () => DealService.getCoClients(deal.id));
  }

  const bill = await prisma.expenseBill.findFirst();
  if (bill) await bench('Bills', 'getBillById', () => BillService.getBillById(bill.id));

  const vendor = await prisma.vendor.findFirst();
  if (vendor) await bench('Vendors', 'getUnpaidBillsByVendor', () => VendorService.getUnpaidBillsByVendor(vendor.id));

  const project = await prisma.project.findFirst();
  if (project) {
    await bench('Projects', 'getProjectById', () => ProjectService.getProjectById(project.id));
    await bench('Projects', 'getProjectTransactions', () => ProjectService.getProjectTransactions(project.id));
    await bench('Projects', 'getProjectReport', () => ProjectService.getProjectReport(project.id));
  }

  const payment = await prisma.vendorPayment.findFirst();
  if (payment) await bench('Fifo', 'getPaymentById', () => FifoService.getPaymentById(payment.id));

  // Write out a JSON for the report generation later if needed
  require('fs').writeFileSync('perf-results.json', JSON.stringify(results, null, 2));

  process.exit(0);
}

run().catch(console.error);
