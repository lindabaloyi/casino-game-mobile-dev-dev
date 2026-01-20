import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface BuildIndicatorProps {
  value?: number;
  displayValue?: number;
  owner?: number;
}

/**
 * Build value and owner indicator for build stacks
 */
export const BuildIndicator: React.FC<BuildIndicatorProps> = ({
  value,
  displayValue,
  owner,
}) => {
  // Use displayValue if provided, otherwise fallback to value
  const displayNumber = displayValue !== undefined ? displayValue : value;

  if (displayNumber === undefined) return null;

  // Get display style based on value (same logic as TempStackIndicator)
  const getDisplayStyle = (val: number) => {
    if (typeof val === "string") {
      return styles.invalidContainer; // "INVALID"
    }
    if (val > 0) {
      return styles.segmentCompleteContainer; // Segment complete / positive
    }
    if (val < 0) {
      return styles.segmentBuildingContainer; // Building toward segment / negative
    }
    return styles.neutralContainer; // Zero or neutral
  };

  const getTextStyle = (val: number) => {
    if (typeof val === "string") {
      return styles.invalidText; // "INVALID"
    }
    if (val > 0) {
      return styles.segmentCompleteText; // Segment complete / positive
    }
    if (val < 0) {
      return styles.segmentBuildingText; // Building toward segment / negative
    }
    return styles.neutralText; // Zero or neutral
  };

  return (
    <>
      {/* Build value indicator */}
      <View
        style={[styles.buildValueContainer, getDisplayStyle(displayNumber)]}
      >
        <Text style={[styles.buildValueText, getTextStyle(displayNumber)]}>
          {typeof displayNumber === "string"
            ? displayNumber
            : Math.abs(displayNumber)}
        </Text>
      </View>

      {/* Owner tag for builds */}
      {owner !== undefined && (
        <View style={styles.ownerTagContainer}>
          <Text style={styles.ownerTagText}>P{owner + 1}</Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  buildValueContainer: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FFD700", // Gold
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#B8860B",
  },
  buildValueText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "bold",
  },
  // Build calculator state styles (same as TempStackIndicator)
  segmentCompleteContainer: {
    backgroundColor: "#4CAF50", // Green - segment complete
  },
  segmentCompleteText: {
    color: "#FFFFFF",
  },
  segmentBuildingContainer: {
    backgroundColor: "#FF9800", // Orange - building toward segment
  },
  segmentBuildingText: {
    color: "#FFFFFF",
  },
  invalidContainer: {
    backgroundColor: "#F44336", // Red - invalid move
  },
  invalidText: {
    color: "#FFFFFF",
    fontSize: 8, // Smaller for "INVALID" text
  },
  neutralContainer: {
    backgroundColor: "#FFD700", // Gold - neutral/fallback
  },
  neutralText: {
    color: "#000",
  },
  ownerTagContainer: {
    position: "absolute",
    top: -8,
    left: -8,
    backgroundColor: "#4CAF50", // Green for player ownership
    borderRadius: 10,
    minWidth: 24,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  ownerTagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
});
