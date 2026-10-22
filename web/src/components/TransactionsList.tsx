import type { Account } from '../../../src/models/Account.js';
import type { Transaction } from '../../../src/models/Transaction.js';
import { formatMoney } from '../../../src/utils/money.js';
import { formatDateShort } from '../../../src/utils/date.js';
import { CATEGORY_LABELS } from '../../../src/ui/labels.js';

interface ITransactionsListProps {
  readonly account: Account;
  readonly transactions: readonly Transaction[];
  readonly onRemove: (id: string) => void;
}

export const TransactionsList = ({ account, transactions, onRemove }: ITransactionsListProps) => (
  <div className="panel panel--wide">
    <h2>Последние операции</h2>

    {transactions.length === 0 && <p className="muted">Операций пока нет.</p>}

    {transactions.map((tx) => (
      <div key={tx.id} className="row">
        <span className="muted">{formatDateShort(tx.date)}</span>
        <span>{CATEGORY_LABELS[tx.category]}</span>
        <span className="muted row__note">{tx.note}</span>
        <span className={tx.isIncome() ? 'ok' : 'danger'}>
          {tx.isIncome() ? '+' : '−'}
          {formatMoney(tx.amountMinor, account.currency)}
        </span>
        <button
          className="row__remove"
          type="button"
          aria-label="Удалить операцию"
          onClick={() => onRemove(tx.id)}
        >
          ×
        </button>
      </div>
    ))}
  </div>
);