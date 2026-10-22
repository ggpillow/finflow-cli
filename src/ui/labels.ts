import { Category, Currency, TransactionType } from '../types/enums.js';
import type { ISelectChoice } from '../types/interfaces.js';

export const CATEGORY_LABELS: Record<Category, string> = {
  [Category.Food]: 'Еда',
  [Category.Housing]: 'Жильё',
  [Category.Transport]: 'Транспорт',
  [Category.Study]: 'Учёба',
  [Category.Fun]: 'Развлечения',
  [Category.Health]: 'Здоровье',
  [Category.Other]: 'Прочее',
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.Income]: 'Доход',
  [TransactionType.Expense]: 'Расход',
};

export const CURRENCY_CHOICES: readonly ISelectChoice<Currency>[] = [
  { name: 'RUB  рубль', value: Currency.RUB },
  { name: 'USD  доллар', value: Currency.USD },
  { name: 'EUR  евро', value: Currency.EUR },
];

export const CATEGORY_CHOICES: readonly ISelectChoice<Category>[] = Object.values(Category).map(
  (category) => ({ name: CATEGORY_LABELS[category], value: category }),
);