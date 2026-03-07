import { useMemo } from 'react';
import { GameState } from '../useGameState';
import { TempStack, BuildStack } from '../../types';
import { areTeammates } from '../../shared/game/team';

export function useGameComputed(gameState: GameState, playerNumber: number) {
  const isMyTurn = useMemo(() => 
    gameState.currentPlayer === playerNumber,
    [gameState.currentPlayer, playerNumber]
  );
  
  const myHand = useMemo(() => 
    gameState.players?.[playerNumber]?.hand ?? [], 
    [gameState.players, playerNumber]
  );
  
  const table = useMemo(() => 
    gameState.tableCards ?? [], 
    [gameState.tableCards]
  );
  
  const playerCaptures = useMemo(() => 
    gameState.players?.[playerNumber]?.captures ?? [], 
    [gameState.players, playerNumber]
  );
  
  const opponentCaptures = useMemo(() => 
    gameState.players?.[playerNumber === 0 ? 1 : 0]?.captures ?? [], 
    [gameState.players, playerNumber]
  );

  // For 4-player mode, get all players' captures
  const allPlayerCaptures = useMemo(() => {
    if (!gameState.players) return [];
    return gameState.players.map(p => p?.captures ?? []);
  }, [gameState.players]);

  const playerCount = gameState.playerCount || 2;

  const tableVersion = useMemo(() => {
    const cards = gameState.tableCards ?? [];
    const cardCount = cards.length;
    const idString = cards.map((c: any) => c.stackId || `${c.rank}${c.suit}`).join('');
    return cardCount + idString.length;
  }, [gameState.tableCards]);

  const overlayStackId = useMemo(() => {
    if (!isMyTurn) return null;
    const myTemp = table.find(
      (tc: any) => tc.type === 'temp_stack' && tc.owner === playerNumber,
    ) as TempStack | undefined;
    return myTemp?.stackId ?? null;
  }, [table, isMyTurn, playerNumber]);

  const extendingBuildId = useMemo(() => {
    if (!isMyTurn) return null;
    
    const myExtending = table.find(
      (tc: any) => tc.type === 'build_stack' && tc.owner === playerNumber && 
        (tc.pendingExtension?.looseCard || tc.pendingExtension?.cards),
    ) as BuildStack | undefined;
    return myExtending?.stackId ?? null;
  }, [table, isMyTurn, playerNumber]);

  // Find a build that can be Shiya'd (teammate's build with matching card in hand)
  // Only for party mode (4 players)
  const selectedBuild = useMemo(() => {
    if (gameState.playerCount !== 4 || !isMyTurn) return null;
    
    const myHand = gameState.players?.[playerNumber]?.hand ?? [];
    const builds = table.filter((tc: any) => tc.type === 'build_stack') as any[];
    
    for (const build of builds) {
      // Must be owned by a teammate
      if (!areTeammates(playerNumber, build.owner)) continue;
      // Must not already have Shiya active
      if (build.shiyaActive) continue;
      // Must have a matching card in hand
      const hasMatch = myHand.some((card: any) => card.value === build.value);
      if (hasMatch) {
        return build;
      }
    }
    return null;
  }, [table, isMyTurn, gameState.playerCount, gameState.players, playerNumber]);

  return {
    isMyTurn,
    myHand,
    table,
    playerCaptures,
    opponentCaptures,
    tableVersion,
    overlayStackId,
    extendingBuildId,
    allPlayerCaptures,
    playerCount,
    selectedBuild,
  };
}
