import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TempStackIndicatorProps {
  captureValue?: number;
  totalValue?: number | string;
}

/**
 * Indicators for temporary stacks (capture value and build calculator display)
 */
export const TempStackIndicator: React.FC<TempStackIndicatorProps> = ({
  captureValue,
  totalValue
}) => {
  console.log('[DISPLAY_VALUE_PROPAGATION] 📥 CLIENT: TempStackIndicator received values', {
    captureValue: captureValue,
    totalValue: totalValue,
    totalValueType: typeof totalValue,
    hasTotalValue: totalValue !== undefined,
    hasCaptureValue: captureValue !== undefined
  });

  // Determine display style based on build calculator value
  const getDisplayStyle = (value: number | string) => {
    console.log('[INDICATOR_STYLING] 🎨 Determining display style for value:', {
      value: value,
      valueType: typeof value,
      isString: typeof value === 'string',
      isPositive: typeof value === 'number' && value > 0,
      isNegative: typeof value === 'number' && value < 0,
      isZero: typeof value === 'number' && value === 0
    });

    if (typeof value === 'string') {
      console.log('[INDICATOR_STYLING] 🎨 Style: INVALID (string value)');
      return styles.invalidContainer; // "INVALID"
    }
    if (value > 0) {
      console.log('[INDICATOR_STYLING] 🎨 Style: SEGMENT COMPLETE (positive number)');
      return styles.segmentCompleteContainer; // Segment complete
    }
    if (value < 0) {
      console.log('[INDICATOR_STYLING] 🎨 Style: SEGMENT BUILDING (negative number)');
      return styles.segmentBuildingContainer; // Building toward segment
    }

    console.log('[INDICATOR_STYLING] 🎨 Style: NEUTRAL (zero or neutral)');
    return styles.neutralContainer; // Zero or neutral
  };

  const getTextStyle = (value: number | string) => {
    console.log('[INDICATOR_STYLING] 📝 Determining text style for value:', {
      value: value,
      valueType: typeof value
    });

    if (typeof value === 'string') {
      console.log('[INDICATOR_STYLING] 📝 Text style: INVALID');
      return styles.invalidText; // "INVALID"
    }
    if (value > 0) {
      console.log('[INDICATOR_STYLING] 📝 Text style: SEGMENT COMPLETE');
      return styles.segmentCompleteText; // Segment complete
    }
    if (value < 0) {
      console.log('[INDICATOR_STYLING] 📝 Text style: SEGMENT BUILDING');
      return styles.segmentBuildingText; // Building toward segment
    }

    console.log('[INDICATOR_STYLING] 📝 Text style: NEUTRAL');
    return styles.neutralText; // Zero or neutral
  };

  console.log('[INDICATOR_RENDER] 🎯 TempStackIndicator rendering with final styling decisions', {
    captureValue: captureValue,
    totalValue: totalValue,
    willShowCaptureIndicator: captureValue !== undefined,
    willShowTotalValueIndicator: totalValue !== undefined,
    totalValueDisplayStyle: totalValue !== undefined ? getDisplayStyle(totalValue) : 'none',
    totalValueTextStyle: totalValue !== undefined ? getTextStyle(totalValue) : 'none'
  });

  return (
    <>
      {/* Capture value indicator for temporary stacks */}
      {captureValue !== undefined && (
        <View style={styles.captureValueContainer}>
          <Text style={styles.captureValueText}>{captureValue}</Text>
        </View>
      )}

      {/* Build calculator indicator for temporary stacks */}
      {totalValue !== undefined && (
        <View style={[styles.buildCalculatorContainer, getDisplayStyle(totalValue)]}>
          <Text style={[styles.buildCalculatorText, getTextStyle(totalValue)]}>
            {totalValue}
          </Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  captureValueContainer: {
    position: 'absolute',
    bottom: -8,
    right: -8,  // Opposite corner from card count
    backgroundColor: '#9C27B0', // Purple
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  captureValueText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  totalValueContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#9C27B0', // Purple
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  totalValueText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  buildCalculatorContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  buildCalculatorText: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Build calculator state styles
  segmentCompleteContainer: {
    backgroundColor: '#4CAF50', // Green - segment complete
  },
  segmentCompleteText: {
    color: '#FFFFFF',
  },
  segmentBuildingContainer: {
    backgroundColor: '#FF9800', // Orange - building toward segment
  },
  segmentBuildingText: {
    color: '#FFFFFF',
  },
  invalidContainer: {
    backgroundColor: '#F44336', // Red - invalid move
  },
  invalidText: {
    color: '#FFFFFF',
    fontSize: 8, // Smaller for "INVALID" text
  },
  neutralContainer: {
    backgroundColor: '#9C27B0', // Purple - neutral/fallback
  },
  neutralText: {
    color: '#FFFFFF',
  },
});
