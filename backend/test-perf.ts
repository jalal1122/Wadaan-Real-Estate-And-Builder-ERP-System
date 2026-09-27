import { prisma } from './src/config/db';
import { ReportService } from './src/services/report.service';
import { AccountService } from './src/services/account.service';

async function run() {
  console.time('DB Connect');
  await prisma.$connect();
  console.timeEnd('DB Connect');

  // Warmup
  await prisma.$queryRaw`SELECT 1`;

  const bench = async (name: string, fn: () => Promise<any>) => {
    console.time(name);
    await fn();
    console.timeEnd(name);
  };

  await bench('calculateSnapshot', () => ReportService.calculateSnapshot());
  await bench('getLiveBalances', () => AccountService.getLiveBalances());
  await bench('getAgingRadar', () => ReportService.getAgingRadar());
  await bench('getTrialBalance', () => ReportService.getTrialBalance());
  await bench('calculateDealMargins', () => ReportService.calculateDealMargins());
  await bench('calculateTrueNetIncome', () => ReportService.calculateTrueNetIncome());
  await bench('getOverheadLedger', () => ReportService.getOverheadLedger());
  await bench('getEquityLedger', () => ReportService.getEquityLedger());

  const projects = await prisma.project.findFirst();
  if (projects) {
    await bench('getProjectLedger', () => ReportService.getProjectLedger(projects.id));
  }

  process.exit(0);
}

run().catch(console.error);
