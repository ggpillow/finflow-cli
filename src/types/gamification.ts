export type AchievementCode =
  | 'first-account'
  | 'first-transaction'
  | 'limits-master'
  | 'cushion'
  | 'clean-month'
  | 'streak-7'
  | 'steady-3'
  | 'archivist';

export interface IAchievementDefinition {
  readonly code: AchievementCode;
  readonly title: string;
  readonly description: string;
  readonly xp: number;
}

export interface IAchievementStatus extends IAchievementDefinition {
  readonly unlocked: boolean;
  readonly unlockedAt: string | null;
}

export interface IProgressSummary {
  readonly xp: number;
  readonly level: number;
  readonly xpInLevel: number;
  readonly xpForNextLevel: number;
  readonly unlockedCount: number;
  readonly totalCount: number;
  readonly achievements: readonly IAchievementStatus[];
}

export type IUnlockedMap = Readonly<Record<string, string>>;

export interface IMetrics {
  readonly accountsCount: number;
  readonly transactionsCount: number;
  readonly limitsCount: number;
  readonly maxDailyStreak: number;
  readonly monthsWithoutOverspend: number;
  readonly maxConsecutivePositiveMonths: number;
  readonly averageMonthlyIncomeMinor: number;
  readonly totalBalanceMinor: number;
}