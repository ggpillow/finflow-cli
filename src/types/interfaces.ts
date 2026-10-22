import type { Category, Currency, TransactionType } from './enums.js';
import type { IUnlockedMap } from './gamification.js';

export type AccountId = string;
export type TransactionId = string;

export interface ITransaction {
  readonly id: TransactionId;
  readonly accountId: AccountId;
  readonly type: TransactionType;
  readonly amountMinor: number;
  readonly category: Category;
  readonly date: string;
  readonly note: string;
}

export interface IAccount {
  readonly id: AccountId;
  readonly name: string;
  readonly currency: Currency;
  readonly createdAt: string;
  readonly openingBalanceMinor: number;
  readonly transactions: readonly ITransaction[];
  readonly balanceMinor: number;
}

export interface IAccountSnapshot extends IAccount {
  readonly limits: Readonly<Record<string, number>>;
}

export interface IAccountInit {
  readonly id: AccountId;
  readonly name: string;
  readonly currency: Currency;
  readonly createdAt: string;
  readonly openingBalanceMinor: number;
  readonly transactions?: readonly ITransaction[];
  readonly limits?: Readonly<Record<string, number>>;
}

export interface ITransactionDraft {
  readonly type: TransactionType;
  readonly amountMinor: number;
  readonly category: Category;
  readonly date: string;
  readonly note: string;
}

export interface IPeriodStats {
  readonly incomeMinor: number;
  readonly expenseMinor: number;
  readonly netMinor: number;
  readonly count: number;
}

export interface ISelectChoice<TValue> {
  readonly name: string;
  readonly value: TValue;
  readonly disabled?: boolean | string;
}

export interface ISession {
  selectedAccountId: AccountId | null;
}

export interface IEnvelopeStatus {
  readonly category: Category;
  readonly limitMinor: number;
  readonly spentMinor: number;
  readonly remainingMinor: number;
  readonly usedRatio: number;
}

export interface ISafeToSpend {
  readonly balanceMinor: number;
  readonly daysLeft: number;
  readonly perDayMinor: number;
}

export interface IPersistedState {
  readonly version: number;
  readonly savedAt: string;
  readonly selectedAccountId: AccountId | null;
  readonly accounts: readonly IAccountSnapshot[];
  readonly gamification: IUnlockedMap;
}

export interface ILoadResult {
  readonly state: IPersistedState | null;
  readonly warning: string | null;
}