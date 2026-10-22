import { Category, TransactionType } from '../types/enums.js';
import type { Currency } from '../types/enums.js';
import type {
  AccountId,
  IAccount,
  IAccountInit,
  IAccountSnapshot,
  IPeriodStats,
  TransactionId,
} from '../types/interfaces.js';
import { Transaction } from './Transaction.js';

export class Account implements IAccount {
  public readonly id: AccountId;
  public readonly name: string;
  public readonly currency: Currency;
  public readonly createdAt: string;
  public readonly openingBalanceMinor: number;

  private readonly _transactions: Transaction[] = [];
  private readonly _limits: Map<Category, number> = new Map<Category, number>();

  public constructor(init: IAccountInit) {
    const trimmed = init.name.trim();
    if (trimmed.length < 2 || trimmed.length > 40) {
      throw new Error('Название счёта должно быть от 2 до 40 символов');
    }

    this.id = init.id;
    this.name = trimmed;
    this.currency = init.currency;
    this.createdAt = init.createdAt;
    this.openingBalanceMinor = init.openingBalanceMinor;

    for (const raw of init.transactions ?? []) {
      this._transactions.push(Transaction.fromJSON(raw));
    }

    for (const [key, limitMinor] of Object.entries(init.limits ?? {})) {
      const category = key as Category;
      if (Object.values(Category).includes(category)) {
        this._limits.set(category, limitMinor);
      }
    }
  }

  public get transactions(): readonly Transaction[] {
    return this._transactions;
  }

  public getTransactionsSorted(): readonly Transaction[] {
    return [...this._transactions].sort((a, b) => b.date.localeCompare(a.date));
  }

  public get balanceMinor(): number {
    return this._transactions.reduce(
      (sum, tx) => sum + tx.signedAmountMinor,
      this.openingBalanceMinor,
    );
  }

  public addTransaction(transaction: Transaction): void {
    if (transaction.accountId !== this.id) {
      throw new Error('Транзакция относится к другому счёту');
    }
    this._transactions.push(transaction);
  }

  public findTransaction(id: TransactionId): Transaction | undefined {
    return this._transactions.find((tx) => tx.id === id);
  }

  public removeTransaction(id: TransactionId): Transaction | undefined {
    const index = this._transactions.findIndex((tx) => tx.id === id);
    if (index === -1) {
      return undefined;
    }

    const removed = this._transactions[index];
    this._transactions.splice(index, 1);
    return removed;
  }

  public setLimit(category: Category, limitMinor: number): void {
    if (!Number.isInteger(limitMinor) || limitMinor < 0) {
      throw new Error('Лимит должен быть неотрицательным целым числом копеек');
    }
    this._limits.set(category, limitMinor);
  }

  public removeLimit(category: Category): boolean {
    return this._limits.delete(category);
  }

  public getLimit(category: Category): number | undefined {
    return this._limits.get(category);
  }

  public get limits(): ReadonlyMap<Category, number> {
    return this._limits;
  }

  public spentByCategory(month: string): ReadonlyMap<Category, number> {
    const result = new Map<Category, number>();

    for (const tx of this._transactions) {
      if (tx.type !== TransactionType.Expense || !tx.date.startsWith(month)) {
        continue;
      }
      result.set(tx.category, (result.get(tx.category) ?? 0) + tx.amountMinor);
    }

    return result;
  }

  public statsForMonth(month: string): IPeriodStats {
    let incomeMinor = 0;
    let expenseMinor = 0;
    let count = 0;

    for (const tx of this._transactions) {
      if (!tx.date.startsWith(month)) {
        continue;
      }
      count += 1;
      if (tx.type === TransactionType.Income) {
        incomeMinor += tx.amountMinor;
      } else {
        expenseMinor += tx.amountMinor;
      }
    }

    return {
      incomeMinor,
      expenseMinor,
      netMinor: incomeMinor - expenseMinor,
      count,
    };
  }

  public toJSON(): IAccountSnapshot {
    return {
      id: this.id,
      name: this.name,
      currency: this.currency,
      createdAt: this.createdAt,
      openingBalanceMinor: this.openingBalanceMinor,
      transactions: this._transactions.map((tx) => tx.toJSON()),
      balanceMinor: this.balanceMinor,
      limits: Object.fromEntries(this._limits),
    };
  }

  public static fromJSON(raw: IAccountSnapshot): Account {
    return new Account({
      id: raw.id,
      name: raw.name,
      currency: raw.currency,
      createdAt: raw.createdAt,
      openingBalanceMinor: raw.openingBalanceMinor,
      transactions: raw.transactions,
      limits: raw.limits,
    });
  }
}