import { useMemo, useState } from 'react';
import { currentMonthKey, formatMonthRu } from '../../src/utils/date.js';
import { useFinance } from './hooks/useFinance.js';
import { AccountsBar } from './components/AccountsBar.js';
import { TransactionForm } from './components/TransactionForm.js';
import { EnvelopesPanel } from './components/EnvelopesPanel.js';
import { TransactionsList } from './components/TransactionsList.js';
import { ProfileModal } from './components/ProfileModal.js';
import { downloadCsv } from './utils/downloadCsv.js';

const RECENT_LIMIT = 12;

export const App = () => {
  const fin = useFinance();
  const [profileOpen, setProfileOpen] = useState(false);
  const month = currentMonthKey();
  const account = fin.activeAccount;

  const envelopes = useMemo(
    () => (account === null ? [] : fin.stats.envelopes(account, month)),
    [fin.stats, account, month, fin.revision],
  );

  const safe = useMemo(
    () => (account === null ? null : fin.stats.safeToSpend(account)),
    [fin.stats, account, fin.revision],
  );

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>FinFlow</h1>
          <p className="muted">{formatMonthRu(month)}</p>
        </div>

        <div className="topbar__actions">
          <span className="badge">Уровень {fin.progress.level}</span>
          <span className="muted small">{fin.progress.xp} XP</span>
          <button className="icon-btn" type="button" onClick={() => setProfileOpen(true)}>
            Достижения
          </button>
          <button
            className="icon-btn"
            type="button"
            disabled={account === null}
            onClick={() => {
              if (account !== null) {
                downloadCsv(account);
              }
            }}
          >
            CSV
          </button>
        </div>
      </header>

      {fin.warning !== null && <p className="notice">{fin.warning}</p>}

      <AccountsBar
        accounts={fin.accounts}
        selectedId={fin.selectedAccountId}
        totalBalanceMinor={fin.totalBalanceMinor}
        onSelect={fin.selectAccount}
        onRemove={fin.removeAccount}
        onCreate={fin.createAccount}
      />

      {account === null ? (
        <p className="empty">Выбери или создай счёт, чтобы начать.</p>
      ) : (
        <main className="grid">
          <TransactionForm onSubmit={(draft) => fin.addTransaction(account.id, draft)} />

          <EnvelopesPanel
            account={account}
            envelopes={envelopes}
            safe={safe}
            onSetLimit={(category, limitMinor) => fin.setLimit(account.id, category, limitMinor)}
            onRemoveLimit={(category) => fin.removeLimit(account.id, category)}
          />

          <TransactionsList
            account={account}
            transactions={account.getTransactionsSorted().slice(0, RECENT_LIMIT)}
            onRemove={(id) => fin.removeTransaction(account.id, id)}
          />
        </main>
      )}

      {profileOpen && (
        <ProfileModal progress={fin.progress} onClose={() => setProfileOpen(false)} />
      )}
    </div>
  );
};