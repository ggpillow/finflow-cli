import { TransactionType } from '../types/enums.js';
import type { Category } from '../types/enums.js';
import type { AccountId, ITransaction, TransactionId } from '../types/interfaces.js';

export interface ITransactionInit {
  readonly id: TransactionId;
  readonly accountId: AccountId;
  readonly type: TransactionType;
  readonly amountMinor: number;
  readonly category: Category;
  readonly date: string;
  readonly note: string;
}

export class Transaction implements ITransaction {
  public readonly id: TransactionId;
  public readonly accountId: AccountId;
  public readonly type: TransactionType;
  public readonly amountMinor: number;
  public readonly category: Category;
  public readonly date: string;
  public readonly note: string;

  public constructor(init: ITransactionInit) {
    if (!Number.isInteger(init.amountMinor) || init.amountMinor <= 0) {
      throw new Error('Сумма транзакции должна быть целым числом копеек больше нуля');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(init.date)) {
      throw new Error(`Некорректная дата транзакции: ${init.date}`);
    }

    this.id = init.id;
    this.accountId = init.accountId;
    this.type = init.type;
    this.amountMinor = init.amountMinor;
    this.category = init.category;
    this.date = init.date;
    this.note = init.note.trim();
  }

  public get signedAmountMinor(): number {
    return this.type === TransactionType.Income ? this.amountMinor : -this.amountMinor;
  }

  public isIncome(): boolean {
    return this.type === TransactionType.Income;
  }

  public toJSON(): ITransaction {
    return {
      id: this.id,
      accountId: this.accountId,
      type: this.type,
      amountMinor: this.amountMinor,
      category: this.category,
      date: this.date,
      note: this.note,
    };
  }

  public static fromJSON(raw: ITransaction): Transaction {
    return new Transaction({
      id: raw.id,
      accountId: raw.accountId,
      type: raw.type,
      amountMinor: raw.amountMinor,
      category: raw.category,
      date: raw.date,
      note: raw.note,
    });
  }
}