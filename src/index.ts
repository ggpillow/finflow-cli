import { AccountManager } from './managers/AccountManager.js';
import { JsonStorage } from './services/JsonStorage.js';
import { ApplicationController } from './ui/ApplicationController.js';
import { renderNotice } from './ui/render.js';
import type { ISession } from './types/interfaces.js';
import type { IUnlockedMap } from './types/gamification.js';

const isExitPromptError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'ExitPromptError';

const main = async (): Promise<void> => {
  const storage = new JsonStorage();
  const accounts = new AccountManager();
  const session: ISession = { selectedAccountId: null };
  const loaded = await storage.load();

  if (loaded.warning !== null) {
    renderNotice(loaded.warning);
  }

  let unlocked: IUnlockedMap = {};

  if (loaded.state !== null) {
    accounts.restore(loaded.state.accounts);
    session.selectedAccountId = loaded.state.selectedAccountId;
    unlocked = loaded.state.gamification;
  }

  const controller = new ApplicationController(accounts, storage, session, unlocked);
  await controller.run();
};

main().catch((error: unknown) => {
  if (isExitPromptError(error)) {
    console.log('\nПрервано пользователем.');
    process.exitCode = 0;
    return;
  }

  console.error('Критическая ошибка:', error);
  process.exitCode = 1;
});