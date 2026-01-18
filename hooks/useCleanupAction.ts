import { useEffect, useState } from "react";

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

      // Auto-hide after animation completes (adjust timing as needed)
      setTimeout(() => {
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
  }, []);

  return {
    cleanupAction,
    isShowingCleanup,
  };
};
