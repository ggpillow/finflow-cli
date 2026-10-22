import type { Account } from '../models/Account.js';
import { monthKeyOf, toDayNumber } from '../utils/date.js';
import type {
  IAchievementDefinition,
  IAchievementStatus,
  IMetrics,
  IProgressSummary,
  IUnlockedMap,
} from '../types/gamification.js';

const XP_PER_LEVEL_STEP = 50;
const CUSHION_RATIO = 0.1;
const CUSHION_PERCENT = Math.round(CUSHION_RATIO * 100);
const XP_PER_TRANSACTION = 2;
const MAX_XP_TRANSACTIONS = 20;
const MIN_LIMITS_FOR_BONUS = 3;
const STREAK_TARGET = 7;
const STREAK_LONG_TARGET = 14;
const STEADY_MONTHS_TARGET = 3;
const ARCHIVIST_THRESHOLD = 100;
const MAX_CLEAN_MONTHS_FOR_XP = 3;

interface IAchievementRule extends IAchievementDefinition {
  readonly isSatisfied: (metrics: IMetrics) => boolean;
}

const ACHIEVEMENT_RULES: readonly IAchievementRule[] = [
  {
    code: 'first-account',
    title: 'Первый шаг',
    description: 'Создан первый счёт',
    xp: 5,
    isSatisfied: (metrics) => metrics.accountsCount > 0,
  },
  {
    code: 'first-transaction',
    title: 'Первая запись',
    description: 'Добавлена первая операция',
    xp: 10,
    isSatisfied: (metrics) => metrics.transactionsCount > 0,
  },
  {
    code: 'limits-master',
    title: 'Конверты настроены',
    description: `Лимиты заданы минимум для ${MIN_LIMITS_FOR_BONUS} категорий`,
    xp: 15,
    isSatisfied: (metrics) => metrics.limitsCount >= MIN_LIMITS_FOR_BONUS,
  },
  {
    code: 'cushion',
    title: 'Подушка безопасности',
    description: `Баланс не меньше ${CUSHION_PERCENT}% среднего месячного дохода`,
    xp: 25,
    isSatisfied: (metrics) =>
      metrics.averageMonthlyIncomeMinor > 0 &&
      metrics.totalBalanceMinor >= metrics.averageMonthlyIncomeMinor * CUSHION_RATIO,
  },
  {
    code: 'clean-month',
    title: 'Месяц без перерасхода',
    description: 'Есть месяц, в котором ни один лимит не превышен',
    xp: 20,
    isSatisfied: (metrics) => metrics.monthsWithoutOverspend > 0,
  },
  {
    code: 'streak-7',
    title: 'Неделя дисциплины',
    description: `${STREAK_TARGET} дней подряд с записанными операциями`,
    xp: 15,
    isSatisfied: (metrics) => metrics.maxDailyStreak >= STREAK_TARGET,
  },
  {
    code: 'steady-3',
    title: 'Три месяца в плюсе',
    description: `${STEADY_MONTHS_TARGET} месяца подряд доходы превышали расходы`,
    xp: 30,
    isSatisfied: (metrics) => metrics.maxConsecutivePositiveMonths >= STEADY_MONTHS_TARGET,
  },
  {
    code: 'archivist',
    title: 'Архивариус',
    description: `Внесено ${ARCHIVIST_THRESHOLD} операций`,
    xp: 20,
    isSatisfied: (metrics) => metrics.transactionsCount >= ARCHIVIST_THRESHOLD,
  },
];

export class GamificationService {
  public static xpForLevel(level: number): number {
    const steps = Math.max(level - 1, 0);
    return XP_PER_LEVEL_STEP * steps * steps;
  }

  public evaluate(accounts: readonly Account[], unlocked: IUnlockedMap): IProgressSummary {
    const metrics = this.collectMetrics(accounts);
    const achievements = this.buildAchievements(metrics, unlocked);
    const xp = this.calculateXp(metrics);
    const level = 1 + Math.floor(Math.sqrt(xp / XP_PER_LEVEL_STEP));

    return {
      xp,
      level,
      xpInLevel: xp - GamificationService.xpForLevel(level),
      xpForNextLevel:
        GamificationService.xpForLevel(level + 1) - GamificationService.xpForLevel(level),
      unlockedCount: achievements.filter((achievement) => achievement.unlocked).length,
      totalCount: achievements.length,
      achievements,
    };
  }

  private collectMetrics(accounts: readonly Account[]): IMetrics {
    let transactionsCount = 0;
    let limitsCount = 0;
    let totalBalanceMinor = 0;

    const dates = new Set<string>();
    const monthKeys = new Set<string>();

    for (const account of accounts) {
      totalBalanceMinor += account.balanceMinor;

      for (const limit of account.limits.values()) {
        if (limit > 0) {
          limitsCount += 1;
        }
      }

      for (const transaction of account.transactions) {
        transactionsCount += 1;
        dates.add(transaction.date);
        monthKeys.add(monthKeyOf(transaction.date));
      }
    }

    const months = [...monthKeys].sort();

    let monthsWithoutOverspend = 0;
    let maxConsecutivePositiveMonths = 0;
    let currentRun = 0;
    let incomeSum = 0;
    let incomeMonths = 0;

    for (const month of months) {
      let incomeMinor = 0;
      let expenseMinor = 0;
      let hasLimit = false;
      let overspent = false;

      for (const account of accounts) {
        const stats = account.statsForMonth(month);
        incomeMinor += stats.incomeMinor;
        expenseMinor += stats.expenseMinor;

        const spent = account.spentByCategory(month);
        for (const [category, limit] of account.limits) {
          if (limit <= 0) {
            continue;
          }
          hasLimit = true;
          if ((spent.get(category) ?? 0) > limit) {
            overspent = true;
          }
        }
      }

      if (incomeMinor > 0) {
        incomeSum += incomeMinor;
        incomeMonths += 1;
      }

      if (hasLimit && !overspent && expenseMinor > 0) {
        monthsWithoutOverspend += 1;
      }

      if (incomeMinor - expenseMinor > 0) {
        currentRun += 1;
        maxConsecutivePositiveMonths = Math.max(maxConsecutivePositiveMonths, currentRun);
      } else {
        currentRun = 0;
      }
    }

    return {
      accountsCount: accounts.length,
      transactionsCount,
      limitsCount,
      maxDailyStreak: this.longestStreak([...dates]),
      monthsWithoutOverspend,
      maxConsecutivePositiveMonths,
      averageMonthlyIncomeMinor: incomeMonths > 0 ? Math.round(incomeSum / incomeMonths) : 0,
      totalBalanceMinor,
    };
  }

  private longestStreak(dates: readonly string[]): number {
    const dayNumbers = dates
      .map((date) => toDayNumber(date))
      .filter((value): value is number => value !== null)
      .sort((left, right) => left - right);

    if (dayNumbers.length === 0) {
      return 0;
    }

    let best = 1;
    let run = 1;

    for (let index = 1; index < dayNumbers.length; index += 1) {
      const previous = dayNumbers[index - 1];
      const current = dayNumbers[index];

      if (previous === undefined || current === undefined) {
        continue;
      }
      if (current === previous) {
        continue;
      }
      if (current - previous === 1) {
        run += 1;
        best = Math.max(best, run);
      } else {
        run = 1;
      }
    }

    return best;
  }

  private calculateXp(metrics: IMetrics): number {
    const transactionXp =
      Math.min(metrics.transactionsCount, MAX_XP_TRANSACTIONS) * XP_PER_TRANSACTION;

    const limitsXp = metrics.limitsCount >= MIN_LIMITS_FOR_BONUS ? 20 : 0;

    const cushionXp =
      metrics.averageMonthlyIncomeMinor > 0 &&
      metrics.totalBalanceMinor >= metrics.averageMonthlyIncomeMinor * CUSHION_RATIO
        ? 25
        : 0;

    const cleanMonthXp = Math.min(metrics.monthsWithoutOverspend, MAX_CLEAN_MONTHS_FOR_XP) * 15;

    const steadyXp = metrics.maxConsecutivePositiveMonths >= STEADY_MONTHS_TARGET ? 30 : 0;

    let streakXp = 0;
    if (metrics.maxDailyStreak >= STREAK_LONG_TARGET) {
      streakXp = 15;
    } else if (metrics.maxDailyStreak >= STREAK_TARGET) {
      streakXp = 10;
    }

    return transactionXp + limitsXp + cushionXp + cleanMonthXp + steadyXp + streakXp;
  }

  private buildAchievements(metrics: IMetrics, unlocked: IUnlockedMap): IAchievementStatus[] {
    return ACHIEVEMENT_RULES.map((rule) => {
      const unlockedAt = unlocked[rule.code] ?? null;

      return {
        code: rule.code,
        title: rule.title,
        description: rule.description,
        xp: rule.xp,
        unlocked: rule.isSatisfied(metrics) || unlockedAt !== null,
        unlockedAt,
      };
    });
  }
}