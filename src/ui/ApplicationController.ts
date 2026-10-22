import { MainAction } from '../types/enums.js';
import type { Account } from '../models/Account.js';
import type { AccountManager } from '../managers/AccountManager.js';
import type { IPersistedState, ISession } from '../types/interfaces.js';
import type { IProgressSummary, IUnlockedMap } from '../types/gamification.js';
import { AccountMenu } from './AccountMenu.js';
import { TransactionMenu } from './TransactionMenu.js';
import { LimitsMenu } from './LimitsMenu.js';
import { CsvExporter } from '../services/CsvExporter.js';
import { StatsService } from '../services/StatsService.js';
import { GamificationService } from '../services/GamificationService.js';
import type { JsonStorage } from '../services/JsonStorage.js';
import { askSelect, pressEnter } from './prompts.js';
import {
  clearScreen,
  renderDashboard,
  renderError,
  renderMainScreen,
  renderNotice,
  renderProfileScreen,
  renderSuccess,
  theme,
} from './render.js';

const STATE_VERSION = 2;

export class ApplicationController {
  private readonly accountMenu: AccountMenu;
  private readonly stats = new StatsService();
  private readonly gamification = new GamificationService();
  private readonly csvExporter = new CsvExporter();
  private readonly unlocked: Map<string, string>;

  public constructor(
    private readonly accounts: AccountManager,
    private readonly storage: JsonStorage,
    private readonly session: ISession,
    unlocked: IUnlockedMap,
  ) {
    this.accountMenu = new AccountMenu(accounts, session);
    this.unlocked = new Map<string, string>(Object.entries(unlocked));
  }

  public async run(): Promise<void> {
    let keepRunning = true;

    while (keepRunning) {
      clearScreen();
      const account = this.getActiveAccount();
      renderMainScreen(
        this.accounts,
        this.session,
        account === null ? null : this.stats.safeToSpend(account),
        this.refreshProgress(),
      );

      const action = await askSelect<MainAction>('Главное меню', this.buildMainChoices());

      try {
        keepRunning = await this.handle(action);
        await this.persist();
      } catch (error: unknown) {
        renderError(error);
        await pressEnter();
      }
    }
  }

  private buildMainChoices(): { name: string; value: MainAction; disabled?: boolean | string }[] {
    const noAccounts = this.accounts.isEmpty() ? 'счетов пока нет' : false;

    return [
      { name: 'дашборд', value: MainAction.Dashboard, disabled: noAccounts },
      { name: 'операции', value: MainAction.AddTransaction, disabled: noAccounts },
      { name: 'лимиты', value: MainAction.Limits, disabled: noAccounts },
      { name: 'профиль', value: MainAction.Profile },
      { name: 'счета', value: MainAction.Accounts },
      { name: 'экспорт в CSV', value: MainAction.ExportCsv, disabled: noAccounts },
      { name: 'выход', value: MainAction.Exit },
    ];
  }

  private async handle(action: MainAction): Promise<boolean> {
    switch (action) {
      case MainAction.Dashboard:
        await this.openDashboard();
        return true;

      case MainAction.Accounts:
        await this.accountMenu.open();
        return true;

      case MainAction.AddTransaction:
        await this.openTransactions();
        return true;

      case MainAction.Limits:
        await this.openLimits();
        return true;

      case MainAction.Profile:
        await this.openProfile();
        return true;

      case MainAction.ExportCsv:
        await this.exportCsv();
        return true;

      case MainAction.Exit:
        clearScreen();
        console.log(theme.success('\nВыход.\n'));
        return false;

      default:
        throw new Error(`Неизвестное действие: ${String(action)}`);
    }
  }

  private async openDashboard(): Promise<void> {
    const account = this.requireActiveAccount();
    if (account === null) {
      return;
    }

    clearScreen();
    renderDashboard(
      account,
      this.stats.safeToSpend(account),
      this.stats.envelopes(account),
      this.stats.dailyExpenses(account),
    );
    await pressEnter();
  }

  private async openTransactions(): Promise<void> {
    const account = this.requireActiveAccount();
    if (account === null) {
      return;
    }

    await new TransactionMenu(this.accounts, this.stats, account).open();
  }

  private async openLimits(): Promise<void> {
    const account = this.requireActiveAccount();
    if (account === null) {
      return;
    }

    await new LimitsMenu(this.stats, account).open();
  }

  private async openProfile(): Promise<void> {
    const progress = this.refreshProgress();

    clearScreen();
    renderProfileScreen(progress);
    await pressEnter();
  }

  private async exportCsv(): Promise<void> {
    const account = this.requireActiveAccount();
    if (account === null) {
      return;
    }

    const filePath = await this.csvExporter.exportAccount(account);

    clearScreen();
    renderSuccess(`Экспортировано в ${filePath}`);
    await pressEnter();
  }

  private refreshProgress(): IProgressSummary {
    const accounts = this.accounts.getAll();
    const now = new Date().toISOString();

    const draft = this.gamification.evaluate(accounts, this.toUnlockedMap());
    for (const achievement of draft.achievements) {
      if (achievement.unlocked && !this.unlocked.has(achievement.code)) {
        this.unlocked.set(achievement.code, now);
      }
    }

    return this.gamification.evaluate(accounts, this.toUnlockedMap());
  }

  private toUnlockedMap(): IUnlockedMap {
    return Object.fromEntries(this.unlocked);
  }

  private async persist(): Promise<void> {
    this.refreshProgress();

    const state: IPersistedState = {
      version: STATE_VERSION,
      savedAt: new Date().toISOString(),
      selectedAccountId: this.session.selectedAccountId,
      accounts: this.accounts.toJSON(),
      gamification: this.toUnlockedMap(),
    };

    await this.storage.save(state);
  }

  private requireActiveAccount(): Account | null {
    const account = this.getActiveAccount();

    if (account === null) {
      renderNotice('Сначала выбери активный счёт в разделе «счета».');
      return null;
    }

    return account;
  }

  private getActiveAccount(): Account | null {
    if (this.session.selectedAccountId === null) {
      return null;
    }

    return this.accounts.findById(this.session.selectedAccountId) ?? null;
  }
}