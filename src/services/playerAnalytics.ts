import { GameMetadata, GameAnalysisResult, PlayerStats, ComparisonSample, TimeClass } from '../types/chess';

export class PlayerAnalytics {
  /**
   * Generates a comprehensive PlayerStats dashboard object from games and analysis results.
   */
  static generateStats(
    username: string,
    games: GameMetadata[],
    resultsMap: Map<string, GameAnalysisResult>
  ): PlayerStats {
    const cleanUser = username.toLowerCase();
    const relevantGames = games.filter(
      (g) => g.white.toLowerCase() === cleanUser || g.black.toLowerCase() === cleanUser
    );

    let wins = 0;
    let losses = 0;
    let draws = 0;

    let totalWhiteAcc = 0;
    let whiteAccCount = 0;
    let totalBlackAcc = 0;
    let blackAccCount = 0;

    let totalCpl = 0;
    let totalBlunders = 0;
    let totalMistakes = 0;
    let totalInaccuracies = 0;
    let analyzedCount = 0;

    const openingMap = new Map<string, { eco: string; name: string; games: number; wins: number; losses: number; draws: number; totalAcc: number }>();
    const timeControlMap = new Map<TimeClass, { games: number; wins: number; losses: number; draws: number; totalAcc: number }>();
    const ratingHistory: { date: string; rating: number; gameId: string }[] = [];

    // Sort chronologically
    const sortedGames = [...relevantGames].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const game of sortedGames) {
      const isWhite = game.white.toLowerCase() === cleanUser;
      const userRating = isWhite ? game.whiteElo : game.blackElo;
      if (userRating) {
        ratingHistory.push({
          date: game.date,
          rating: userRating,
          gameId: game.id,
        });
      }

      // Result tracking
      let outcome: 'win' | 'loss' | 'draw' = 'draw';
      if (game.result === '1-0') {
        outcome = isWhite ? 'win' : 'loss';
      } else if (game.result === '0-1') {
        outcome = isWhite ? 'loss' : 'win';
      } else {
        outcome = 'draw';
      }

      if (outcome === 'win') wins++;
      else if (outcome === 'loss') losses++;
      else draws++;

      // Analysis result tracking
      const analysis = resultsMap.get(game.id);
      let gameAccuracy = 0;

      if (analysis) {
        analyzedCount++;
        const playerAccuracy = isWhite ? analysis.whiteAccuracy : analysis.blackAccuracy;
        const playerAcpl = isWhite ? analysis.whiteAcpl : analysis.blackAcpl;
        const classifications = isWhite ? analysis.whiteClassifications : analysis.blackClassifications;

        gameAccuracy = playerAccuracy;
        totalCpl += playerAcpl;
        totalBlunders += classifications.blunder;
        totalMistakes += classifications.mistake;
        totalInaccuracies += classifications.inaccuracy;

        if (isWhite) {
          totalWhiteAcc += playerAccuracy;
          whiteAccCount++;
        } else {
          totalBlackAcc += playerAccuracy;
          blackAccCount++;
        }
      }

      // Opening aggregation
      const openingKey = game.openingName || game.eco || 'Unknown Opening';
      const existingOpening = openingMap.get(openingKey) || {
        eco: game.eco || '---',
        name: openingKey,
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        totalAcc: 0,
      };
      existingOpening.games++;
      if (outcome === 'win') existingOpening.wins++;
      else if (outcome === 'loss') existingOpening.losses++;
      else existingOpening.draws++;
      if (gameAccuracy > 0) existingOpening.totalAcc += gameAccuracy;
      openingMap.set(openingKey, existingOpening);

      // Time control aggregation
      const tcKey = game.timeClass;
      const existingTc = timeControlMap.get(tcKey) || {
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        totalAcc: 0,
      };
      existingTc.games++;
      if (outcome === 'win') existingTc.wins++;
      else if (outcome === 'loss') existingTc.losses++;
      else existingTc.draws++;
      if (gameAccuracy > 0) existingTc.totalAcc += gameAccuracy;
      timeControlMap.set(tcKey, existingTc);
    }

    const totalGames = relevantGames.length;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 1000) / 10 : 0;
    const avgWhiteAcc = whiteAccCount > 0 ? Math.round((totalWhiteAcc / whiteAccCount) * 10) / 10 : 0;
    const avgBlackAcc = blackAccCount > 0 ? Math.round((totalBlackAcc / blackAccCount) * 10) / 10 : 0;
    const overallAvgAcc =
      analyzedCount > 0
        ? Math.round(((totalWhiteAcc + totalBlackAcc) / (whiteAccCount + blackAccCount)) * 10) / 10
        : 0;

    const avgAcpl = analyzedCount > 0 ? Math.round((totalCpl / analyzedCount) * 10) / 10 : 0;
    const blundersPerGame = analyzedCount > 0 ? Math.round((totalBlunders / analyzedCount) * 10) / 10 : 0;
    const mistakesPerGame = analyzedCount > 0 ? Math.round((totalMistakes / analyzedCount) * 10) / 10 : 0;
    const inaccuraciesPerGame =
      analyzedCount > 0 ? Math.round((totalInaccuracies / analyzedCount) * 10) / 10 : 0;

    const openings = Array.from(openingMap.values())
      .map((op) => ({
        eco: op.eco,
        name: op.name,
        games: op.games,
        wins: op.wins,
        losses: op.losses,
        draws: op.draws,
        winRate: Math.round((op.wins / op.games) * 1000) / 10,
        averageAccuracy: op.totalAcc > 0 ? Math.round((op.totalAcc / op.games) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.games - a.games);

    const timeControls = Array.from(timeControlMap.entries()).map(([tc, val]) => ({
      timeClass: tc,
      games: val.games,
      wins: val.wins,
      losses: val.losses,
      draws: val.draws,
      winRate: Math.round((val.wins / val.games) * 1000) / 10,
      averageAccuracy: val.totalAcc > 0 ? Math.round((val.totalAcc / val.games) * 10) / 10 : 0,
    }));

    return {
      username,
      platform: relevantGames[0]?.platform || 'chesscom',
      totalGames,
      analyzedGames: analyzedCount,
      wins,
      losses,
      draws,
      winRate,
      averageWhiteAccuracy: avgWhiteAcc,
      averageBlackAccuracy: avgBlackAcc,
      averageAccuracy: overallAvgAcc,
      averageAcpl: avgAcpl,
      blundersPerGame,
      mistakesPerGame,
      inaccuraciesPerGame,
      openings,
      timeControls,
      ratingHistory,
    };
  }

  /**
   * Compares the oldest N games against the most recent N games.
   */
  static compareOldestVsRecent(
    username: string,
    games: GameMetadata[],
    resultsMap: Map<string, GameAnalysisResult>,
    sampleSize: number = 25
  ): {
    oldestSample: ComparisonSample;
    recentSample: ComparisonSample;
    hasOverlap: boolean;
    overlapCount: number;
    deltaAccuracy: number;
    deltaAcpl: number;
    deltaBlunders: number;
    deltaWinRate: number;
  } {
    const cleanUser = username.toLowerCase();
    const userGames = games.filter(
      (g) => g.white.toLowerCase() === cleanUser || g.black.toLowerCase() === cleanUser
    );

    // Sort chronologically ascending
    const sorted = [...userGames].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const actualSize = Math.min(sampleSize, Math.floor(sorted.length / 2) || 1);
    const oldestGames = sorted.slice(0, actualSize);
    const recentGames = sorted.slice(-actualSize);

    // Check overlap
    const oldestIds = new Set(oldestGames.map((g) => g.id));
    const overlapCount = recentGames.filter((g) => oldestIds.has(g.id)).length;
    const hasOverlap = overlapCount > 0;

    const buildSample = (sampleGames: GameMetadata[], label: string): ComparisonSample => {
      let sampleWins = 0;
      let sampleLosses = 0;
      let sampleDraws = 0;

      let totalAcc = 0;
      let totalCpl = 0;
      let totalBlunders = 0;
      let totalMistakes = 0;
      let totalInacc = 0;
      let analyzed = 0;

      let whiteAcc = 0;
      let whiteCount = 0;
      let blackAcc = 0;
      let blackCount = 0;

      for (const g of sampleGames) {
        const isWhite = g.white.toLowerCase() === cleanUser;
        if (g.result === '1-0') {
          if (isWhite) sampleWins++;
          else sampleLosses++;
        } else if (g.result === '0-1') {
          if (isWhite) sampleLosses++;
          else sampleWins++;
        } else {
          sampleDraws++;
        }

        const res = resultsMap.get(g.id);
        if (res) {
          analyzed++;
          const acc = isWhite ? res.whiteAccuracy : res.blackAccuracy;
          const cpl = isWhite ? res.whiteAcpl : res.blackAcpl;
          const cls = isWhite ? res.whiteClassifications : res.blackClassifications;

          totalAcc += acc;
          totalCpl += cpl;
          totalBlunders += cls.blunder;
          totalMistakes += cls.mistake;
          totalInacc += cls.inaccuracy;

          if (isWhite) {
            whiteAcc += acc;
            whiteCount++;
          } else {
            blackAcc += acc;
            blackCount++;
          }
        }
      }

      const count = sampleGames.length;
      const from = sampleGames[0]?.date || 'N/A';
      const to = sampleGames[sampleGames.length - 1]?.date || 'N/A';

      return {
        label,
        gameCount: count,
        dateRange: { from, to },
        avgAccuracy: analyzed > 0 ? Math.round((totalAcc / analyzed) * 10) / 10 : 0,
        avgAcpl: analyzed > 0 ? Math.round((totalCpl / analyzed) * 10) / 10 : 0,
        blundersPerGame: analyzed > 0 ? Math.round((totalBlunders / analyzed) * 10) / 10 : 0,
        mistakesPerGame: analyzed > 0 ? Math.round((totalMistakes / analyzed) * 10) / 10 : 0,
        inaccuraciesPerGame: analyzed > 0 ? Math.round((totalInacc / analyzed) * 10) / 10 : 0,
        winRate: count > 0 ? Math.round((sampleWins / count) * 1000) / 10 : 0,
        wins: sampleWins,
        losses: sampleLosses,
        draws: sampleDraws,
        whiteAccuracy: whiteCount > 0 ? Math.round((whiteAcc / whiteCount) * 10) / 10 : 0,
        blackAccuracy: blackCount > 0 ? Math.round((blackAcc / blackCount) * 10) / 10 : 0,
      };
    };

    const oldestSample = buildSample(oldestGames, `Oldest ${oldestGames.length} Games`);
    const recentSample = buildSample(recentGames, `Recent ${recentGames.length} Games`);

    return {
      oldestSample,
      recentSample,
      hasOverlap,
      overlapCount,
      deltaAccuracy: Math.round((recentSample.avgAccuracy - oldestSample.avgAccuracy) * 10) / 10,
      deltaAcpl: Math.round((recentSample.avgAcpl - oldestSample.avgAcpl) * 10) / 10,
      deltaBlunders: Math.round((recentSample.blundersPerGame - oldestSample.blundersPerGame) * 10) / 10,
      deltaWinRate: Math.round((recentSample.winRate - oldestSample.winRate) * 10) / 10,
    };
  }
}
