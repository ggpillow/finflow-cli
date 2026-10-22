import { Account } from '../src/models/Account.js';
import { Transaction } from '../src/models/Transaction.js';
import { Category, Currency, TransactionType } from '../src/types/enums.js';

export const createAccount = (openingBalanceMinor = 0): Account =>
  new Account({
    id: 'acc_test',
    name: 'Тестовый',
    currency: Currency.RUB,
    createdAt: '2026-01-01T00:00:00.000Z',
    openingBalanceMinor,
  });

export interface ITransactionInput {
  readonly type: TransactionType;
  readonly amountMinor: number;
  readonly category: Category;
  readonly date: string;
  readonly note?: string;
  readonly accountId?: string;
}

export const addTransaction = (account: Account, input: ITransactionInput): Transaction => {
  const transaction = new Transaction({
    id: `txn_${Math.random().toString(36).slice(2, 10)}`,
    accountId: input.accountId ?? account.id,
    type: input.type,
    amountMinor: input.amountMinor,
    category: input.category,
    date: input.date,
    note: input.note ?? '',
  });
  account.addTransaction(transaction);
  return transaction;
};

export const expense = (
  account: Account,
  amountMinor: number,
  category: Category,
  date: string,
): Transaction =>
  addTransaction(account, { type: TransactionType.Expense, amountMinor, category, date });

export const income = (account: Account, amountMinor: number, date: string): Transaction =>
  addTransaction(account, {
    type: TransactionType.Income,
    amountMinor,
    category: Category.Other,
    date,
  });