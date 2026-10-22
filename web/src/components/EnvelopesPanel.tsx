import { useState } from 'react';
import { Category } from '../../../src/types/enums.js';
import type { Account } from '../../../src/models/Account.js';
import type { IEnvelopeStatus, ISafeToSpend } from '../../../src/types/interfaces.js';
import { formatMoney, parseMoneyInput, toMinor } from '../../../src/utils/money.js';
import { CATEGORY_LABELS } from '../../../src/ui/labels.js';

const CATEGORIES = Object.values(Category);

interface IEnvelopesPanelProps {
  readonly account: Account;
  readonly envelopes: readonly IEnvelopeStatus[];
  readonly safe: ISafeToSpend | null;
  readonly onSetLimit: (category: Category, limitMinor: number) => void;
  readonly onRemoveLimit: (category: Category) => void;
}

export const EnvelopesPanel = ({
  account,
  envelopes,
  safe,
  onSetLimit,
  onRemoveLimit,
}: IEnvelopesPanelProps) => {
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const openEditor = (): void => {
    const next: Record<string, string> = {};

    for (const category of CATEGORIES) {
      const current = account.getLimit(category);
      next[category] = current === undefined ? '' : String(current / 100);
    }

    setDrafts(next);
    setError('');
    setEditing(true);
  };

  const apply = (category: Category): void => {
    const raw = (drafts[category] ?? '').trim();

    if (raw === '') {
      onRemoveLimit(category);
      setError('');
      return;
    }

    const parsed = parseMoneyInput(raw);

    if (parsed === null || parsed < 0) {
      setError('Лимит — неотрицательное число, например 8000');
      return;
    }

    onSetLimit(category, toMinor(parsed));
    setError('');
  };

  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Конверты</h2>
        <button
          className="icon-btn icon-btn--small"
          type="button"
          onClick={() => (editing ? setEditing(false) : openEditor())}
        >
          {editing ? 'Готово' : 'Изменить'}
        </button>
      </div>

      {editing ? (
        <div className="limits">
          {CATEGORIES.map((category) => {
            const hasLimit = account.getLimit(category) !== undefined;

            return (
              <div key={category} className="limit-row">
                <span>{CATEGORY_LABELS[category]}</span>
                <input
                  value={drafts[category] ?? ''}
                  placeholder="без лимита"
                  inputMode="decimal"
                  onChange={(event) =>
                    setDrafts((prev) => ({ ...prev, [category]: event.target.value }))
                  }
                />
                <button className="mini" type="button" onClick={() => apply(category)}>
                  ok
                </button>
                <button
                  className="mini mini--danger"
                  type="button"
                  disabled={!hasLimit}
                  onClick={() => {
                    onRemoveLimit(category);
                    setDrafts((prev) => ({ ...prev, [category]: '' }));
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}

          {error !== '' && <p className="danger small">{error}</p>}
        </div>
      ) : (
        <>
          {envelopes.length === 0 && <p className="muted">Лимиты не заданы.</p>}

          {envelopes.map((envelope) => {
            const ratio = Math.min(envelope.usedRatio, 1);
            const over = envelope.remainingMinor < 0;

            return (
              <div key={envelope.category} className="envelope">
                <div className="envelope__head">
                  <span>{CATEGORY_LABELS[envelope.category]}</span>
                  <span className={over ? 'danger' : 'muted'}>
                    {formatMoney(envelope.remainingMinor, account.currency)}
                  </span>
                </div>
                <div className="bar">
                  <div
                    className={over ? 'bar__fill bar__fill--over' : 'bar__fill'}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </>
      )}

      {safe !== null && (
        <p className="safe">
          Можно в день: <strong>{formatMoney(safe.perDayMinor, account.currency)}</strong>
          <span className="muted"> · {safe.daysLeft} дн.</span>
        </p>
      )}
    </div>
  );
};