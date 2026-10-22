import { Account } from '../models/Account.js';
import { Transaction } from '../models/Transaction.js';
import type { Currency } from '../types/enums.js';
import type {
  AccountId,
  IAccountSnapshot,
  ITransactionDraft,
  TransactionId,
} from '../types/interfaces.js';
import { createId } from '../utils/id.js';

export interface IAccountManager {
  create(name: string, currency: Currency): Account;
  getAll(): readonly Account[];
  findById(id: AccountId): Account | undefined;
  remove(id: AccountId): Account | undefined;
  isEmpty(): boolean;
  getTotalBalanceMinor(): number;
  countTransactions(id: AccountId): number;
  addTransaction(accountId: AccountId, draft: ITransactionDraft): Transaction;
  removeTransaction(accountId: AccountId, transactionId: TransactionId): Transaction | undefined;
  toJSON(): readonly IAccountSnapshot[];
  restore(accounts: readonly IAccountSnapshot[]): void;
}

export class AccountManager implements IAccountManager {
  private readonly _accounts: Map<AccountId, Account> = new Map<AccountId, Account>();
  private readonly _usedIds: Set<AccountId> = new Set<AccountId>();

  public create(name: string, currency: Currency): Account {
    const id = this.generateUniqueId();
    const account = new Account({
      id,
      name,
      currency,
      createdAt: new Date().toISOString(),
      openingBalanceMinor: 0,
    });

    this._accounts.set(id, account);
    return account;
  }

  public getAll(): readonly Account[] {
    return [...this._accounts.values()];
  }

  public findById(id: AccountId): Account | undefined {
    return this._accounts.get(id);
  }

  public isEmpty(): boolean {
    return this._accounts.size === 0;
  }

  public remove(id: AccountId): Account | undefined {
    const account = this._accounts.get(id);
    if (account === undefined) {
      return undefined;
    }

    this._accounts.delete(id);
    return account;
  }

  public getTotalBalanceMinor(): number {
    return this.getAll().reduce((sum, account) => sum + account.balanceMinor, 0);
  }

  public countTransactions(id: AccountId): number {
    return this.findById(id)?.transactions.length ?? 0;
  }

  public addTransaction(accountId: AccountId, draft: ITransactionDraft): Transaction {
    const account = this._accounts.get(accountId);
    if (account === undefined) {
      throw new Error(`Счёт ${accountId} не найден`);
    }

    const transaction = new Transaction({
      id: createId('txn'),
      accountId,
      type: draft.type,
      amountMinor: draft.amountMinor,
      category: draft.category,
      date: draft.date,
      note: draft.note,
    });

    account.addTransaction(transaction);
    return transaction;
  }

  public removeTransaction(
    accountId: AccountId,
    transactionId: TransactionId,
  ): Transaction | undefined {
    const account = this._accounts.get(accountId);
    if (account === undefined) {
      return undefined;
    }

    return account.removeTransaction(transactionId);
  }

  public toJSON(): readonly IAccountSnapshot[] {
    return this.getAll().map((account) => account.toJSON());
  }

  public restore(accounts: readonly IAccountSnapshot[]): void {
    for (const raw of accounts) {
      const account = Account.fromJSON(raw);
      this._accounts.set(account.id, account);
      this._usedIds.add(account.id);
    }
  }

  private generateUniqueId(): AccountId {
    let candidate = createId('acc');
    while (this._usedIds.has(candidate)) {
      candidate = createId('acc');
    }

    this._usedIds.add(candidate);
    return candidate;
  }
}