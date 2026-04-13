/**
 * Online Play Screen - Unified Multiplayer Lobby
 * 
 * A unified networked game mode lobby that supports:
 * - 2 players (two-hands)
 * - 3 players (three-hands)
 * - 4 players (four-hands, party, freeforall, tournament)
 * 
 * Refactored to use separated components:
 * - useSocketConnection for connection lifecycle
 * - useLobby for lobby state (single source of truth)
 * - useGameSession for game state
 * - Lobby component for UI
 * - GameRoomContainer for game rendering with tournament support
 * - ErrorScreen for error states
 */

import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  BackHandler,
  Clipboard,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Lobby } from '../components/lobby/Lobby';
import { GameRoomContainer } from '../components/lobby/GameRoomContainer';
import { ErrorScreen } from '../components/lobby/ErrorScreen';
import { useSocketConnection, useGameStateSync, useOpponentDrag } from '../hooks/multiplayer';
import { useLobby } from '../hooks/useLobby';
import { useGameSession } from '../hooks/useGameSession';
import { useSoundContext } from '../hooks/useSoundContext';
import { MODE_CONFIG, GameMode } from '../utils/modeConfig';

export const options = {
  headerShown: false,
};

export default function OnlinePlayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; roomCode?: string }>();
  const mode = (params.mode as GameMode) || 'party';
  const roomCodeParam = params.roomCode || null;
  const modeConfig = MODE_CONFIG[mode];

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
      return true;
    });

    return () => backHandler.remove();
  }, [router]);

  const { setInGameMode } = useSoundContext();

  const { socket, isConnected } = useSocketConnection({ mode, roomCode: roomCodeParam });
  const lobby = useLobby(socket, mode);
  const game = useGameSession(socket, mode);

  const opponentDrag = useOpponentDrag(socket);

  useEffect(() => {
    if (game.gameState != null) {
      setInGameMode(true);
    }
    return () => {
      setInGameMode(false);
    };
  }, [game.gameState, setInGameMode]);

  const handleCopyRoomCode = () => {
    const code = lobby.roomCode;
    if (code) {
      Clipboard.setString(code);
      Alert.alert('Copied!', `Room code "${code}" copied to clipboard`);
    }
  };

  if (game.playerDisconnected) {
    return <ErrorScreen type="disconnected" />;
  }

  if (!isConnected) {
    return (
      <Lobby
        mode={mode}
        modeConfig={modeConfig}
        socket={socket}
        playersInLobby={lobby.players.length}
        isConnected={false}
        onCopyRoomCode={handleCopyRoomCode}
      />
    );
  }

  if (!game.gameState || !game.gameReady || !game.allClientsReady) {
    return (
      <Lobby
        mode={mode}
        modeConfig={modeConfig}
        socket={socket}
        playersInLobby={lobby.players.length}
        isConnected={true}
        onCopyRoomCode={handleCopyRoomCode}
        roomCode={lobby.roomCode}
        isReady={lobby.isReady}
        setIsReady={lobby.toggleReady}
        isGameStarting={game.gameState != null && (!game.gameReady || !game.allClientsReady)}
      />
    );
  }

  return (
    <GameRoomContainer
      gameState={game.gameState}
      gameOverData={game.gameOverData}
      playerNumber={game.playerNumber}
      sendAction={game.sendAction}
      startNextRound={game.startNextRound}
      onRestart={() => {
        game.requestSync();
      }}
      onBackToMenu={() => {
        router.replace('/(tabs)');
      }}
      error={game.error}
      clearError={game.clearError}
      opponentDrag={opponentDrag.opponentDrag}
      emitDragStart={opponentDrag.emitDragStart}
      emitDragMove={opponentDrag.emitDragMove}
      emitDragEnd={opponentDrag.emitDragEnd}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4d0f',
  },
});