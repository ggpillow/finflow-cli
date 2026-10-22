import { useState } from 'react';
import type { FormEvent } from 'react';
import { Category, TransactionType } from '../../../src/types/enums.js';
import { parseMoneyInput, toMinor } from '../../../src/utils/money.js';
import { daysUntil, isValidIsoDate, todayIso } from '../../../src/utils/date.js';
import { CATEGORY_LABELS, TRANSACTION_TYPE_LABELS } from '../../../src/ui/labels.js';
import type { INewTransaction } from '../hooks/useFinance.js';

const CATEGORIES = Object.values(Category);
const NOTE_LIMIT = 120;
const AMOUNT_LIMIT = 100_000_000;

interface ITransactionFormProps {
  readonly onSubmit: (draft: INewTransaction) => void;
}

export const TransactionForm = ({ onSubmit }: ITransactionFormProps) => {
  const [type, setType] = useState<TransactionType>(TransactionType.Expense);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>(Category.Food);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const parsed = parseMoneyInput(amount);

    if (parsed === null) {
      setError('Введите сумму числом, например 1250,50');
      return;
    }
    if (parsed <= 0) {
      setError('Сумма должна быть больше нуля');
      return;
    }
    if (parsed > AMOUNT_LIMIT) {
      setError('Слишком большая сумма');
      return;
    }
    if (!isValidIsoDate(date)) {
      setError('Дата в формате ГГГГ-ММ-ДД, например 2026-02-14');
      return;
    }
    if (daysUntil(date) > 0) {
      setError('Дата не может быть в будущем');
      return;
    }
    if (note.trim().length > NOTE_LIMIT) {
      setError(`Комментарий не длиннее ${NOTE_LIMIT} символов`);
      return;
    }

    const resolvedCategory = type === TransactionType.Income ? Category.Other : category;

    onSubmit({
      type,
      amountMinor: toMinor(parsed),
      category: resolvedCategory,
      date,
      note: note.trim(),
    });

    setAmount('');
    setNote('');
    setError('');
    setSuccess(`${TRANSACTION_TYPE_LABELS[type]} записан`);
    globalThis.setTimeout(() => setSuccess(''), 2200);
  };

  return (
    <form className="panel" onSubmit={submit}>
      <h2>Добавить операцию</h2>

      <div className="switcher">
        {[TransactionType.Expense, TransactionType.Income].map((value) => (
          <button
            key={value}
            type="button"
            className={type === value ? 'switcher__item switcher__item--on' : 'switcher__item'}
            onClick={() => setType(value)}
          >
            {TRANSACTION_TYPE_LABELS[value]}
          </button>
        ))}
      </div>

      <label className="field">
        <span>Сумма, ₽</span>
        <input
          value={amount}
          placeholder="1 250,50"
          inputMode="decimal"
          onChange={(event) => {
            setAmount(event.target.value);
            setError('');
          }}
        />
      </label>

      {type === TransactionType.Expense && (
        <label className="field">
          <span>Категория</span>
          <select value={category} onChange={(event) => setCategory(event.target.value as Category)}>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="field">
        <span>Дата</span>
        <input
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setError('');
          }}
        />
      </label>

      <label className="field">
        <span>Комментарий</span>
        <input value={note} onChange={(event) => setNote(event.target.value)} />
      </label>

      {error !== '' && <p className="danger small field__error">{error}</p>}
      {success !== '' && <p className="ok small field__error">{success}</p>}

      <button className="primary" type="submit">
        Записать
      </button>
    </form>
  );
};