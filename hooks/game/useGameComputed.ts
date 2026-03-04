import { useMemo } from 'react';
import { GameState } from '../useGameState';
import { TempStack, BuildStack } from '../../types';

export function useGameComputed(gameState: GameState, playerNumber: number) {
  const isMyTurn = useMemo(() => 
    gameState.currentPlayer === playerNumber,
    [gameState.currentPlayer, playerNumber]
  );
  
  const myHand = useMemo(() => 
    gameState.playerHands?.[playerNumber] ?? [], 
    [gameState.playerHands, playerNumber]
  );
  
  const table = useMemo(() => 
    gameState.tableCards ?? [], 
    [gameState.tableCards]
  );
  
  const playerCaptures = useMemo(() => 
    gameState.playerCaptures?.[playerNumber] ?? [], 
    [gameState.playerCaptures, playerNumber]
  );
  
  const opponentCaptures = useMemo(() => 
    gameState.playerCaptures?.[playerNumber === 0 ? 1 : 0] ?? [], 
    [gameState.playerCaptures, playerNumber]
  );

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

  return {
    isMyTurn,
    myHand,
    table,
    playerCaptures,
    opponentCaptures,
    tableVersion,
    overlayStackId,
    extendingBuildId,
  };
}
