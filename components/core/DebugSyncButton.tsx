import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { useSocket } from "../../hooks/useSocket";

interface DebugSyncButtonProps {
  playerNumber: number;
}

export const DebugSyncButton = React.memo<DebugSyncButtonProps>(({ playerNumber }) => {
  const socket = useSocket();

  const handleForceSync = React.useCallback(() => {
    console.log("🔄 [DEBUG] Requesting manual state sync");
    if (socket.sendAction) {
      socket.sendAction({
        type: "request-sync",
        payload: {
          playerNumber,
          reason: "manual_sync",
        },
      });
    }
  }, [socket.sendAction, playerNumber]);

  if (!__DEV__) return null;

  return (
    <TouchableOpacity
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        backgroundColor: "#FF6B6B",
        padding: 8,
        borderRadius: 5,
        zIndex: 9999,
      }}
      onPress={handleForceSync}
    >
      <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>
        🔄 SYNC
      </Text>
    </TouchableOpacity>
  );
});

DebugSyncButton.displayName = "DebugSyncButton";
