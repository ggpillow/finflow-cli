import { Category, TransactionAction, TransactionType } from '../types/enums.js';
import type { Account } from '../models/Account.js';
import type { AccountManager } from '../managers/AccountManager.js';
import type { TransactionId } from '../types/interfaces.js';
import type { StatsService } from '../services/StatsService.js';
import { toMinor } from '../utils/money.js';
import { todayIso } from '../utils/date.js';
import { askConfirm, askMoney, askSelect, askText, pressEnter } from './prompts.js';
import { CATEGORY_CHOICES, CATEGORY_LABELS, TRANSACTION_TYPE_LABELS } from './labels.js';
import {
  clearScreen,
  describeTransaction,
  renderNotice,
  renderSuccess,
  renderTransactionsScreen,
} from './render.js';
import { validateNote, validateTransactionDate } from './validators.js';

const LIST_PAGE_SIZE = 12;

export class TransactionMenu {
  public constructor(
    private readonly accounts: AccountManager,
    private readonly stats: StatsService,
    private readonly account: Account,
  ) {}

  public async open(): Promise<void> {
    let keepRunning = true;

    while (keepRunning) {
      clearScreen();
      renderTransactionsScreen(this.account);

      const action = await askSelect<TransactionAction>('Операции счёта', [
        { name: 'добавить операцию', value: TransactionAction.Add },
        {
          name: 'удалить операцию',
          value: TransactionAction.Remove,
          disabled: this.account.transactions.length === 0 ? 'операций нет' : false,
        },
        { name: 'назад', value: TransactionAction.Back },
      ]);

      switch (action) {
        case TransactionAction.Add:
          await this.addTransaction();
          break;
        case TransactionAction.Remove:
          await this.removeTransaction();
          break;
        case TransactionAction.Back:
          keepRunning = false;
          break;
        default:
          throw new Error(`Неизвестное действие: ${String(action)}`);
      }
    }
  }

  private async addTransaction(): Promise<void> {
    clearScreen();
    renderTransactionsScreen(this.account);

    const type = await askSelect<TransactionType>('Тип операции', [
      { name: TRANSACTION_TYPE_LABELS[TransactionType.Expense], value: TransactionType.Expense },
      { name: TRANSACTION_TYPE_LABELS[TransactionType.Income], value: TransactionType.Income },
    ]);

    const amount = await askMoney('Сумма, ₽');

    const category =
      type === TransactionType.Income
        ? Category.Other
        : await askSelect<Category>('Категория', CATEGORY_CHOICES);

    const date = await askText({
      message: 'Дата (ГГГГ-ММ-ДД)',
      defaultValue: todayIso(),
      validate: validateTransactionDate,
    });

    const note = await askText({
      message: 'Комментарий (необязательно)',
      defaultValue: '',
      validate: validateNote,
    });

    this.accounts.addTransaction(this.account.id, {
      type,
      amountMinor: toMinor(amount),
      category,
      date,
      note,
    });

    clearScreen();
    renderTransactionsScreen(this.account);
    renderSuccess(
      `${TRANSACTION_TYPE_LABELS[type]} «${CATEGORY_LABELS[category]}» записан.`,
    );

    const overspent = this.stats.overspentCategories(this.account);
    if (overspent.length > 0) {
      renderNotice(`Лимит превышен: ${overspent.map((item) => CATEGORY_LABELS[item]).join(', ')}`);
    }

    await pressEnter();
  }

  private async removeTransaction(): Promise<void> {
    clearScreen();
    renderTransactionsScreen(this.account);

    const transactionId = await askSelect<TransactionId>(
      'Какую операцию удалить?',
      this.account
        .getTransactionsSorted()
        .map((tx) => ({ name: describeTransaction(tx), value: tx.id })),
      LIST_PAGE_SIZE,
    );

    const target = this.account.findTransaction(transactionId);
    if (target === undefined) {
      renderNotice('Операция не найдена — возможно, уже удалена.');
      await pressEnter();
      return;
    }

    const confirmed = await askConfirm(
      `Удалить операцию «${describeTransaction(target)}»?`,
      false,
    );

    if (!confirmed) {
      clearScreen();
      renderTransactionsScreen(this.account);
      renderNotice('Удаление отменено.');
      await pressEnter();
      return;
    }

    this.account.removeTransaction(transactionId);

    clearScreen();
    renderTransactionsScreen(this.account);
    renderSuccess('Операция удалена.');
    await pressEnter();
  }
}