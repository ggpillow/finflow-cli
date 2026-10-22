import { EnvelopeAction } from '../types/enums.js';
import type { Category } from '../types/enums.js';
import type { Account } from '../models/Account.js';
import type { StatsService } from '../services/StatsService.js';
import { formatMoney, toMinor } from '../utils/money.js';
import { askMoney, askSelect, pressEnter } from './prompts.js';
import { CATEGORY_CHOICES, CATEGORY_LABELS } from './labels.js';
import { clearScreen, renderLimitsScreen, renderNotice, renderSuccess } from './render.js';

export class LimitsMenu {
  public constructor(
    private readonly stats: StatsService,
    private readonly account: Account,
  ) {}

  public async open(): Promise<void> {
    let keepRunning = true;

    while (keepRunning) {
      clearScreen();
      renderLimitsScreen(this.account, this.stats.envelopes(this.account));

      const action = await askSelect<EnvelopeAction>('Лимиты по конвертам', [
        { name: 'установить лимит', value: EnvelopeAction.Set },
        {
          name: 'снять лимит',
          value: EnvelopeAction.Remove,
          disabled: this.account.limits.size === 0 ? 'лимитов нет' : false,
        },
        { name: 'назад', value: EnvelopeAction.Back },
      ]);

      switch (action) {
        case EnvelopeAction.Set:
          await this.setLimit();
          break;
        case EnvelopeAction.Remove:
          await this.removeLimit();
          break;
        case EnvelopeAction.Back:
          keepRunning = false;
          break;
        default:
          throw new Error(`Неизвестное действие меню лимитов: ${String(action)}`);
      }
    }
  }

  private async setLimit(): Promise<void> {
    clearScreen();
    renderLimitsScreen(this.account, this.stats.envelopes(this.account));

    const choices = CATEGORY_CHOICES.map((choice) => {
      const current = this.account.getLimit(choice.value);
      const suffix =
        current === undefined ? '' : ` — сейчас ${formatMoney(current, this.account.currency)}`;

      return { name: `${choice.name}${suffix}`, value: choice.value };
    });

    const category = await askSelect<Category>('Категория', choices);
    const limit = await askMoney(`Лимит на «${CATEGORY_LABELS[category]}» в месяц, ₽`);

    this.account.setLimit(category, toMinor(limit));

    clearScreen();
    renderLimitsScreen(this.account, this.stats.envelopes(this.account));
    renderSuccess(`Лимит на «${CATEGORY_LABELS[category]}» установлен.`);
    await pressEnter();
  }

  private async removeLimit(): Promise<void> {
    clearScreen();
    renderLimitsScreen(this.account, this.stats.envelopes(this.account));

  
    const categories: Category[] = [...this.account.limits.keys()];

    const category = await askSelect<Category>(
      'Какой лимит снять?',
      categories.map((entry: Category) => ({ name: CATEGORY_LABELS[entry], value: entry })),
    );

    const removed = this.account.removeLimit(category);

    clearScreen();
    renderLimitsScreen(this.account, this.stats.envelopes(this.account));

    if (removed) {
      renderSuccess(`Лимит на «${CATEGORY_LABELS[category]}» снят.`);
    } else {
      renderNotice('Лимит не найден — возможно, уже снят.');
    }

    await pressEnter();
  }
}