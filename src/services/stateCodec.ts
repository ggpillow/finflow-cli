import type { Currency } from '../types/enums.js';
import type {
  IAccountSnapshot,
  IPersistedState,
  ITransaction,
} from '../types/interfaces.js';

export const STATE_VERSION = 2;
const SUPPORTED_VERSIONS: readonly number[] = [1, 2];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const parseTransaction = (raw: unknown): ITransaction | null => {
  if (!isRecord(raw)) {
    return null;
  }
  const { id, accountId, type, amountMinor, category, date, note } = raw;

  if (
    !isString(id) ||
    !isString(accountId) ||
    !isString(type) ||
    !isFiniteNumber(amountMinor) ||
    !isString(category) ||
    !isString(date) ||
    !isString(note)
  ) {
    return null;
  }

  return {
    id,
    accountId,
    type: type as ITransaction['type'],
    amountMinor,
    category: category as ITransaction['category'],
    date,
    note,
  };
};

const parseLimits = (value: unknown): Record<string, number> => {
  if (!isRecord(value)) {
    return {};
  }

  const limits: Record<string, number> = {};
  for (const [category, limit] of Object.entries(value)) {
    if (isFiniteNumber(limit) && limit >= 0) {
      limits[category] = limit;
    }
  }
  return limits;
};

const parseUnlocked = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) {
    return {};
  }

  const unlocked: Record<string, string> = {};
  for (const [code, date] of Object.entries(value)) {
    if (isString(date)) {
      unlocked[code] = date;
    }
  }
  return unlocked;
};

const parseAccount = (raw: unknown): IAccountSnapshot | null => {
  if (!isRecord(raw)) {
    return null;
  }
  const { id, name, currency, createdAt, openingBalanceMinor, transactions } = raw;

  if (
    !isString(id) ||
    !isString(name) ||
    !isString(currency) ||
    !isString(createdAt) ||
    !isFiniteNumber(openingBalanceMinor)
  ) {
    return null;
  }

  const parsedTransactions: ITransaction[] = [];
  if (Array.isArray(transactions)) {
    for (const entry of transactions) {
      const transaction = parseTransaction(entry);
      if (transaction !== null) {
        parsedTransactions.push(transaction);
      }
    }
  }

  return {
    id,
    name,
    currency: currency as Currency,
    createdAt,
    openingBalanceMinor,
    transactions: parsedTransactions,
    balanceMinor: 0,
    limits: parseLimits(raw.limits),
  };
};

export const parseState = (raw: unknown): IPersistedState | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const version = raw.version;
  if (!isFiniteNumber(version) || !SUPPORTED_VERSIONS.includes(version)) {
    return null;
  }

  const accounts: IAccountSnapshot[] = [];
  if (Array.isArray(raw.accounts)) {
    for (const entry of raw.accounts) {
      const account = parseAccount(entry);
      if (account !== null) {
        accounts.push(account);
      }
    }
  }

  return {
    version: STATE_VERSION,
    savedAt: isString(raw.savedAt) ? raw.savedAt : new Date().toISOString(),
    selectedAccountId: isString(raw.selectedAccountId) ? raw.selectedAccountId : null,
    accounts,
    gamification: parseUnlocked(raw.gamification),
  };
};

export const parseStateJson = (text: string): IPersistedState | null => {
  try {
    return parseState(JSON.parse(text.replace(/^\uFEFF/, '')));
  } catch {
    return null;
  }
};