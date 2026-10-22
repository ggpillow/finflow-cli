import { useState } from 'react';
import type { Account } from '../../../src/models/Account.js';
import type { Currency } from '../../../src/types/enums.js';
import { formatMoney } from '../../../src/utils/money.js';
import { NewAccountCard } from './NewAccountCard.js';

interface IAccountCardProps {
  readonly account: Account;
  readonly isActive: boolean;
  readonly onSelect: () => void;
  readonly onRemove: () => void;
}

const AccountCard = ({ account, isActive, onSelect, onRemove }: IAccountCardProps) => {
  const [pending, setPending] = useState(false);

  if (pending) {
    return (
      <div className="card card--confirm">
        <span className="card__name">Удалить «{account.name}»?</span>
        <span className="muted small">
          {account.transactions.length === 0
            ? 'Операций на счёте нет'
            : `Удалятся операции: ${account.transactions.length}`}
        </span>
        <div className="card__actions">
          <button className="danger-btn" type="button" onClick={onRemove}>
            Удалить
          </button>
          <button className="ghost-btn" type="button" onClick={() => setPending(false)}>
            Отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={isActive ? 'card card--active' : 'card'}>
      <button className="card__hit" type="button" onClick={onSelect}>
        <span className="card__name">{account.name}</span>
        <span className="card__amount">{formatMoney(account.balanceMinor, account.currency)}</span>
      </button>
      <button
        className="card__remove"
        type="button"
        aria-label="Удалить счёт"
        onClick={() => setPending(true)}
      >
        ×
      </button>
    </div>
  );
};

interface IAccountsBarProps {
  readonly accounts: readonly Account[];
  readonly selectedId: string | null;
  readonly totalBalanceMinor: number;
  readonly onSelect: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onCreate: (name: string, currency: Currency) => void;
}

export const AccountsBar = ({
  accounts,
  selectedId,
  totalBalanceMinor,
  onSelect,
  onRemove,
  onCreate,
}: IAccountsBarProps) => (
  <section className="accounts">
    {accounts.map((account) => (
      <AccountCard
        key={account.id}
        account={account}
        isActive={account.id === selectedId}
        onSelect={() => onSelect(account.id)}
        onRemove={() => onRemove(account.id)}
      />
    ))}

    <NewAccountCard onCreate={onCreate} />

    <div className="total">
      <span className="muted small">Всего по счетам</span>
      <span className="total__value">{formatMoney(totalBalanceMinor)}</span>
    </div>
  </section>
);