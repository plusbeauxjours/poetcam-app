/**
 * 스켈레톤 로딩 컴포넌트
 * Skeleton Loading Component
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
  useColorScheme
} from 'react-native';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  shimmerColors?: string[];
  animationDuration?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  shimmerColors,
  animationDuration = 1500
}) => {
  const colorScheme = useColorScheme();
  const shimmerValue = useRef(new Animated.Value(0)).current;

  const defaultShimmerColors = colorScheme === 'dark' 
    ? ['#2D3748', '#4A5568', '#2D3748']
    : ['#E2E8F0', '#F7FAFC', '#E2E8F0'];

  const colors = shimmerColors || defaultShimmerColors;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: false,
        }),
      ])
    );

    shimmerAnimation.start();

    return () => {
      shimmerAnimation.stop();
    };
  }, [shimmerValue, animationDuration]);

  const translateX = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const backgroundColor = shimmerValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: colors,
  });

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors[0],
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            backgroundColor,
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

// 복합 스켈레톤 컴포넌트들
export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.cardContainer, style]}>
    <View style={styles.cardHeader}>
      <SkeletonLoader width={40} height={40} borderRadius={20} />
      <View style={styles.cardHeaderText}>
        <SkeletonLoader width="60%" height={16} />
        <SkeletonLoader width="40%" height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
    <SkeletonLoader width="100%" height={12} style={{ marginTop: 12 }} />
    <SkeletonLoader width="80%" height={12} style={{ marginTop: 4 }} />
  </View>
);

export const SkeletonSettingItem: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.settingItem, style]}>
    <View style={styles.settingLeft}>
      <SkeletonLoader width={24} height={24} borderRadius={4} />
      <View style={styles.settingText}>
        <SkeletonLoader width="70%" height={16} />
        <SkeletonLoader width="50%" height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
    <SkeletonLoader width={50} height={24} borderRadius={12} />
  </View>
);

export const SkeletonNotification: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.notificationContainer, style]}>
    <SkeletonLoader width={40} height={40} borderRadius={20} />
    <View style={styles.notificationContent}>
      <View style={styles.notificationHeader}>
        <SkeletonLoader width="60%" height={16} />
        <SkeletonLoader width="30%" height={12} />
      </View>
      <SkeletonLoader width="90%" height={12} style={{ marginTop: 4 }} />
      <SkeletonLoader width="70%" height={12} style={{ marginTop: 4 }} />
    </View>
  </View>
);

export const SkeletonList: React.FC<{
  itemCount?: number;
  itemHeight?: number;
  showHeader?: boolean;
  style?: ViewStyle;
}> = ({ 
  itemCount = 3, 
  itemHeight = 60, 
  showHeader = false,
  style 
}) => (
  <View style={[styles.listContainer, style]}>
    {showHeader && (
      <View style={styles.listHeader}>
        <SkeletonLoader width="40%" height={24} />
        <SkeletonLoader width={80} height={32} borderRadius={16} />
      </View>
    )}
    {Array.from({ length: itemCount }).map((_, index) => (
      <SkeletonSettingItem
        key={index}
        style={[
          styles.listItem,
          { height: itemHeight },
          index < itemCount - 1 && styles.listItemBorder
        ]}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  shimmer: {
    flex: 1,
    opacity: 0.7,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    flex: 1,
    marginLeft: 12,
  },
  notificationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listContainer: {
    backgroundColor: '#FFFFFF',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
});

export default SkeletonLoader;