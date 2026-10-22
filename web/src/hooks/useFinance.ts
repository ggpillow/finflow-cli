import { useCallback, useMemo, useRef, useState } from 'react';
import { AccountManager } from '../../../src/managers/AccountManager.js';
import { StatsService } from '../../../src/services/StatsService.js';
import { GamificationService } from '../../../src/services/GamificationService.js';
import { STATE_VERSION } from '../../../src/services/stateCodec.js';
import type { Category, Currency, TransactionType } from '../../../src/types/enums.js';
import type { AccountId, IPersistedState } from '../../../src/types/interfaces.js';
import type { IProgressSummary } from '../../../src/types/gamification.js';
import { LocalStorageAdapter } from '../adapters/LocalStorageAdapter.js';

export interface INewTransaction {
  readonly type: TransactionType;
  readonly amountMinor: number;
  readonly category: Category;
  readonly date: string;
  readonly note: string;
}

const storage = new LocalStorageAdapter();
const stats = new StatsService();
const gamification = new GamificationService();

export const useFinance = () => {
  const [init] = useState(() => {
    const loaded = storage.load();
    const instance = new AccountManager();

    if (loaded.state !== null) {
      instance.restore(loaded.state.accounts);
    }

    return {
      manager: instance,
      selectedAccountId: loaded.state?.selectedAccountId ?? null,
      unlocked: loaded.state?.gamification ?? {},
      warning: loaded.warning,
    };
  });

  const manager = init.manager;
  const [revision, setRevision] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState<AccountId | null>(
    init.selectedAccountId,
  );
  const unlockedRef = useRef<Record<string, string>>({ ...init.unlocked });

  const touch = useCallback(() => setRevision((value) => value + 1), []);

  const persist = useCallback(
    (accountId: AccountId | null) => {
      const all = manager.getAll();
      const now = new Date().toISOString();

      for (const achievement of gamification.evaluate(all, unlockedRef.current).achievements) {
        if (achievement.unlocked && unlockedRef.current[achievement.code] === undefined) {
          unlockedRef.current[achievement.code] = now;
        }
      }

      const state: IPersistedState = {
        version: STATE_VERSION,
        savedAt: new Date().toISOString(),
        selectedAccountId: accountId,
        accounts: manager.toJSON(),
        gamification: { ...unlockedRef.current },
      };

      storage.save(state);
    },
    [manager],
  );

  const accounts = useMemo(() => manager.getAll(), [manager, revision]);
  const activeAccount = useMemo(
    () => (selectedAccountId === null ? null : (manager.findById(selectedAccountId) ?? null)),
    [manager, selectedAccountId, revision],
  );
  const totalBalanceMinor = useMemo(
    () => accounts.reduce((sum, item) => sum + item.balanceMinor, 0),
    [accounts],
  );
  const progress: IProgressSummary = useMemo(
    () => gamification.evaluate(accounts, { ...unlockedRef.current }),
    [accounts, revision],
  );

  const createAccount = useCallback(
    (name: string, currency: Currency) => {
      const account = manager.create(name, currency);
      setSelectedAccountId(account.id);
      persist(account.id);
      touch();
      return account;
    },
    [manager, persist, touch],
  );

  const removeAccount = useCallback(
    (id: AccountId) => {
      manager.remove(id);
      const next = selectedAccountId === id ? null : selectedAccountId;
      setSelectedAccountId(next);
      persist(next);
      touch();
    },
    [manager, persist, selectedAccountId, touch],
  );

  const selectAccount = useCallback(
    (id: AccountId) => {
      setSelectedAccountId(id);
      persist(id);
      touch();
    },
    [persist, touch],
  );

  const addTransaction = useCallback(
    (accountId: AccountId, draft: INewTransaction) => {
      manager.addTransaction(accountId, draft);
      persist(selectedAccountId);
      touch();
    },
    [manager, persist, selectedAccountId, touch],
  );

  const removeTransaction = useCallback(
    (accountId: AccountId, transactionId: string) => {
      manager.removeTransaction(accountId, transactionId);
      persist(selectedAccountId);
      touch();
    },
    [manager, persist, selectedAccountId, touch],
  );

  const setLimit = useCallback(
    (accountId: AccountId, category: Category, limitMinor: number) => {
      manager.findById(accountId)?.setLimit(category, limitMinor);
      persist(selectedAccountId);
      touch();
    },
    [manager, persist, selectedAccountId, touch],
  );

  const removeLimit = useCallback(
    (accountId: AccountId, category: Category) => {
      manager.findById(accountId)?.removeLimit(category);
      persist(selectedAccountId);
      touch();
    },
    [manager, persist, selectedAccountId, touch],
  );

  return {
    accounts,
    activeAccount,
    selectedAccountId,
    totalBalanceMinor,
    progress,
    stats,
    revision,
    warning: init.warning,
    createAccount,
    removeAccount,
    selectAccount,
    addTransaction,
    removeTransaction,
    setLimit,
    removeLimit,
  };
};