import { useState } from 'react';
import type { FormEvent } from 'react';
import { Currency } from '../../../src/types/enums.js';
import { CURRENCY_CHOICES } from '../../../src/ui/labels.js';

interface INewAccountCardProps {
  readonly onCreate: (name: string, currency: Currency) => void;
}

export const NewAccountCard = ({ onCreate }: INewAccountCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<Currency>(Currency.RUB);
  const [error, setError] = useState('');

  if (!isOpen) {
    return (
      <button className="card card--ghost" type="button" onClick={() => setIsOpen(true)}>
        + счёт
      </button>
    );
  }

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      setError('Название — минимум 2 символа');
      return;
    }
    if (trimmed.length > 40) {
      setError('Название — максимум 40 символов');
      return;
    }
    if (!/[\p{L}\p{N}]/u.test(trimmed)) {
      setError('Нужна хотя бы одна буква или цифра');
      return;
    }

    onCreate(trimmed, currency);
    setName('');
    setError('');
    setIsOpen(false);
  };

  return (
    <form className="card card--form" onSubmit={submit}>
      <input
        autoFocus
        value={name}
        placeholder="Название счёта"
        onChange={(event) => {
          setName(event.target.value);
          setError('');
        }}
      />
      <select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}>
        {CURRENCY_CHOICES.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.name}
          </option>
        ))}
      </select>
      {error !== '' && <span className="danger small">{error}</span>}
      <div className="card__actions">
        <button className="primary" type="submit">
          Создать
        </button>
        <button className="ghost-btn" type="button" onClick={() => setIsOpen(false)}>
          Отмена
        </button>
      </div>
    </form>
  );
};