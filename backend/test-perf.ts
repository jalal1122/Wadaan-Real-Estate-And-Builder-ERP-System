import { prisma } from './src/config/db';
import { ReportService } from './src/services/report.service';
import { AccountService } from './src/services/account.service';

async function run() {
  console.time('DB Connect');
  await prisma.$connect();
  console.timeEnd('DB Connect');

  console.time('calculateSnapshot');
  await ReportService.calculateSnapshot();
  console.timeEnd('calculateSnapshot');

  console.time('getLiveBalances');
  await AccountService.getLiveBalances();
  console.timeEnd('getLiveBalances');

  console.time('getAgingRadar');
  await ReportService.getAgingRadar();
  console.timeEnd('getAgingRadar');

  process.exit(0);
}

run().catch(console.error);
