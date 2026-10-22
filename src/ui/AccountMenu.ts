import { AccountAction, Currency } from '../types/enums.js';
import type { AccountId, ISession } from '../types/interfaces.js';
import type { AccountManager } from '../managers/AccountManager.js';
import { formatMoney } from '../utils/money.js';
import { askConfirm, askSelect, askText, pressEnter } from './prompts.js';
import { CURRENCY_CHOICES } from './labels.js';
import { clearScreen, renderAccountsScreen, renderNotice, renderSuccess } from './render.js';
import { validateAccountName } from './validators.js';

export class AccountMenu {
  public constructor(
    private readonly accounts: AccountManager,
    private readonly session: ISession,
  ) {}

  public async open(): Promise<void> {
    let keepRunning = true;

    while (keepRunning) {
      clearScreen();
      renderAccountsScreen(this.accounts, this.session.selectedAccountId);

      const action = await askSelect<AccountAction>('Что делаем со счетами?', [
        { name: 'создать счёт', value: AccountAction.Create },
        {
          name: 'выбрать активный счёт',
          value: AccountAction.Select,
          disabled: this.accounts.isEmpty() ? 'счетов пока нет' : false,
        },
        {
          name: 'удалить счёт',
          value: AccountAction.Delete,
          disabled: this.accounts.isEmpty() ? 'счетов пока нет' : false,
        },
        { name: 'назад', value: AccountAction.Back },
      ]);

      switch (action) {
        case AccountAction.Create:
          await this.createAccount();
          break;
        case AccountAction.Select:
          await this.selectAccount();
          break;
        case AccountAction.Delete:
          await this.deleteAccount();
          break;
        case AccountAction.Back:
          keepRunning = false;
          break;
        default:
          throw new Error(`Неизвестное действие меню счетов: ${String(action)}`);
      }
    }
  }

  private async createAccount(): Promise<void> {
    clearScreen();
    renderAccountsScreen(this.accounts, this.session.selectedAccountId);

    const name = await askText({
      message: 'Название счёта',
      validate: validateAccountName,
    });
    const currency = await askSelect<Currency>('Валюта счёта', CURRENCY_CHOICES);

    const account = this.accounts.create(name, currency);
    this.session.selectedAccountId = account.id;

    clearScreen();
    renderAccountsScreen(this.accounts, this.session.selectedAccountId);
    renderSuccess(`Счёт «${account.name}» создан и активен. ID: ${account.id}`);
    await pressEnter();
  }

  private async selectAccount(): Promise<void> {
    clearScreen();
    renderAccountsScreen(this.accounts, this.session.selectedAccountId);

    const accountId = await askSelect<AccountId>(
      'Какой счёт сделаем активным?',
      this.accounts.getAll().map((account) => ({
        name: `${account.name} · ${formatMoney(account.balanceMinor, account.currency)}`,
        value: account.id,
      })),
    );

    this.session.selectedAccountId = accountId;

    clearScreen();
    renderAccountsScreen(this.accounts, this.session.selectedAccountId);
    renderSuccess('Активный счёт переключён.');
    await pressEnter();
  }

  private async deleteAccount(): Promise<void> {
    clearScreen();
    renderAccountsScreen(this.accounts, this.session.selectedAccountId);

    const accountId = await askSelect<AccountId>(
      'Какой счёт удалить?',
      this.accounts.getAll().map((account) => ({
        name: `${account.name} · операций: ${account.transactions.length}`,
        value: account.id,
      })),
    );

    const account = this.accounts.findById(accountId);
    if (account === undefined) {
      renderNotice('Счёт не найден — возможно, он уже удалён.');
      await pressEnter();
      return;
    }

    const transactionCount = account.transactions.length;
    const details =
      transactionCount === 0
        ? 'Операций на счёте нет.'
        : `Вместе с ним будут удалены все операции: ${transactionCount}.`;

    const confirmed = await askConfirm(
      `Удалить счёт «${account.name}»? ${details} Действие необратимо.`,
      false,
    );

    if (!confirmed) {
      clearScreen();
      renderAccountsScreen(this.accounts, this.session.selectedAccountId);
      renderNotice('Удаление отменено.');
      await pressEnter();
      return;
    }

    this.accounts.remove(accountId);
    if (this.session.selectedAccountId === accountId) {
      this.session.selectedAccountId = null;
    }

    clearScreen();
    renderAccountsScreen(this.accounts, this.session.selectedAccountId);
    renderSuccess(`Счёт «${account.name}» удалён.`);
    await pressEnter();
  }
}