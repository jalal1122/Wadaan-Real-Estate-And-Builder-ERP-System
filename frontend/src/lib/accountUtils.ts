export interface BaseAccount {
  id?: string;
  accountCode?: string | null;
  accountName?: string | null;
  category?: string | null;
  isArchived?: boolean | null;
}

/**
 * Determines whether an asset account represents a Bank Account
 * (as opposed to physical Cash/Safe or non-liquid assets).
 *
 * Recognized Bank Accounts:
 * - Code starts with 102 (e.g. 1020-01 HBL, 1020-02 Standard Chartered) or 103.
 * - Names containing commercial bank identifiers: "hbl", "meezan", "scb", "standard chartered",
 *   "mcb", "ubl", "allied", "abl", "askari", "faysal", "alfalah", "habib", "bank",
 *   "operations account", "current account", "savings account".
 * - Explicitly excludes physical cash/safe/vault accounts (e.g. 1010-01 Office Safe).
 */
export function isBankAssetAccount(account?: BaseAccount | null): boolean {
  if (!account) return false;
  const name = (account.accountName || '').toLowerCase().trim();
  const code = (account.accountCode || '').toLowerCase().trim();

  // Physical cash / safe exclusions
  const isCashSafe =
    name.includes('safe') ||
    name.includes('vault') ||
    name.includes('petty') ||
    (name.includes('cash') && !name.includes('bank')) ||
    (code.startsWith('1010') && !name.includes('bank') && !/\b(hbl|meezan|scb|mcb|ubl|abl)\b/i.test(name));

  if (isCashSafe) {
    return false;
  }

  // Commercial bank keywords / regex with word boundaries
  const bankRegex = /\b(bank|hbl|meezan|scb|mcb|ubl|abl|allied|askari|faysal|alfalah|habib)\b/i;
  const hasBankKeyword =
    bankRegex.test(name) ||
    name.includes('standard chartered') ||
    name.includes('bank account') ||
    name.includes('operations account') ||
    name.includes('current account') ||
    name.includes('savings account') ||
    name.includes('escrow ops');

  // Account codes designated for banking (1020-xx, 1030-xx)
  const hasBankCode =
    code.startsWith('102') ||
    code.startsWith('103') ||
    code.startsWith('1002');

  return hasBankKeyword || hasBankCode;
}
