import { useEffect, useState } from "react";
import { useSocket } from "./useSocket";

interface CleanupAction {
  type: string;
  cardsAwarded: number;
  awardedToPlayer: number;
  timestamp: number;
}

export const useCleanupAction = () => {
  const [cleanupAction, setCleanupAction] = useState<CleanupAction | null>(
    null,
  );
  const [isShowingCleanup, setIsShowingCleanup] = useState(false);
  const { sendAction } = useSocket();

  useEffect(() => {
    const handleCleanupAction = (event: CustomEvent<CleanupAction>) => {
      const action = event.detail;
      console.log("🎴 CLEANUP VISUAL FEEDBACK:", {
        cardsAwarded: action.cardsAwarded,
        awardedToPlayer: action.awardedToPlayer,
        timestamp: new Date(action.timestamp).toISOString(),
      });

      setCleanupAction(action);
      setIsShowingCleanup(true);

      // Auto-trigger game over after cleanup animation completes
      setTimeout(() => {
        console.log(
          "🎮 [CLIENT] Cleanup animation complete - triggering game over",
        );
        console.log("🎮 [CLIENT] Sending game-over action to server");

        sendAction({
          type: "game-over",
          payload: {},
        });

        console.log("🎮 [CLIENT] Game-over action sent, hiding cleanup UI");
        setIsShowingCleanup(false);
        setCleanupAction(null);
      }, 3000); // 3 seconds for visual feedback
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        "cleanupAction",
        handleCleanupAction as EventListener,
      );

      return () => {
        window.removeEventListener(
          "cleanupAction",
          handleCleanupAction as EventListener,
        );
      };
    }
  }, [sendAction]);

  return {
    cleanupAction,
    isShowingCleanup,
  };
};
