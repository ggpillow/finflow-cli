import type { IProgressSummary } from '../../../src/types/gamification.js';

interface IProfileModalProps {
  readonly progress: IProgressSummary;
  readonly onClose: () => void;
}

export const ProfileModal = ({ progress, onClose }: IProfileModalProps) => {
  const ratio = progress.xpForNextLevel === 0 ? 0 : progress.xpInLevel / progress.xpForNextLevel;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head">
          <h2>Профиль · уровень {progress.level}</h2>
          <button className="icon-btn icon-btn--small" type="button" onClick={onClose}>
            Закрыть
          </button>
        </div>

        <p className="muted small">
          {progress.xp} XP · открыто {progress.unlockedCount} из {progress.totalCount}
        </p>

        <div className="bar bar--tall">
          <div className="bar__fill" style={{ width: `${ratio * 100}%` }} />
        </div>
        <p className="muted small">
          {progress.xpInLevel} / {progress.xpForNextLevel} XP до следующего уровня
        </p>

        <div className="achievements">
          {progress.achievements.map((achievement) => (
            <div
              key={achievement.code}
              className={achievement.unlocked ? 'achievement' : 'achievement achievement--locked'}
            >
              <span className="achievement__title">
                {achievement.unlocked ? '＋' : '·'} {achievement.title}
              </span>
              <span className="achievement__xp">{achievement.xp} XP</span>
              <p className="muted small">{achievement.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};