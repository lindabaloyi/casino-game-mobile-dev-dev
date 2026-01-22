import React, { useState } from "react";
import { View, Text } from "react-native";

interface ConnectionStatusProps {
  status?: string;
}

export const ConnectionStatus = React.memo<ConnectionStatusProps>(({ status = "connected" }) => {
  const statusColors: Record<string, string> = {
    connected: "#4CAF50",
    disconnected: "#F44336",
    connecting: "#FF9800",
    reconnected: "#2196F3",
  };

  return (
    <View
      style={{
        position: "absolute",
        top: 10,
        left: 10,
        backgroundColor: statusColors[status] || "#999",
        padding: 5,
        borderRadius: 5,
        zIndex: 9999,
      }}
    >
      <Text style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
});

ConnectionStatus.displayName = "ConnectionStatus";
