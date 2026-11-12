/**
 * Snake Nexus — Score & High-Score Persistence
 */

export class ScoreManager {
  static STORAGE_KEY = 'snake_nexus_classic_best';

  static getBestScore() {
    try {
      const saved = localStorage.getItem(ScoreManager.STORAGE_KEY);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  }

  static saveScore(score) {
    try {
      const currentBest = ScoreManager.getBestScore();
      if (score > currentBest) {
        localStorage.setItem(ScoreManager.STORAGE_KEY, score.toString());
        return { isNewBest: true, bestScore: score };
      }
      return { isNewBest: false, bestScore: currentBest };
    } catch {
      return { isNewBest: false, bestScore: score };
    }
  }
}

