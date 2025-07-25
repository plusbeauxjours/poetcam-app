import React, { useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  Info,
} from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutUp,
} from 'react-native-reanimated';
import { ShareStatus } from '@/types/shareTypes';

const { width: screenWidth } = Dimensions.get('window');

interface ShareNotificationProps {
  visible: boolean;
  status: ShareStatus;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
  autoHideDuration?: number;
}

export function ShareNotification({
  visible,
  status,
  message,
  onClose,
  onRetry,
  autoHideDuration = 3000,
}: ShareNotificationProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scale = useSharedValue(1);

  useEffect(() => {
    if (visible && (status === 'success' || status === 'cancelled')) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [visible, status, autoHideDuration, onClose]);

  const getIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle color={colors.success} size={24} />;
      case 'failed':
        return <AlertCircle color={colors.error} size={24} />;
      case 'pending':
        return <RefreshCw color={colors.primary} size={24} />;
      case 'cancelled':
        return <Info color={colors.warning} size={24} />;
    }
  };

  const getBackgroundColor = () => {
    switch (status) {
      case 'success':
        return colorScheme === 'dark' ? '#065f46' : '#f0fdf4';
      case 'failed':
        return colorScheme === 'dark' ? '#7f1d1d' : '#fef2f2';
      case 'pending':
        return colorScheme === 'dark' ? '#1e3a8a' : '#eff6ff';
      case 'cancelled':
        return colorScheme === 'dark' ? '#713f12' : '#fffbeb';
    }
  };

  const getBorderColor = () => {
    switch (status) {
      case 'success':
        return colorScheme === 'dark' ? '#047857' : '#86efac';
      case 'failed':
        return colorScheme === 'dark' ? '#b91c1c' : '#fca5a5';
      case 'pending':
        return colorScheme === 'dark' ? '#2563eb' : '#93c5fd';
      case 'cancelled':
        return colorScheme === 'dark' ? '#d97706' : '#fcd34d';
    }
  };

  const getTextColor = () => {
    switch (status) {
      case 'success':
        return colorScheme === 'dark' ? '#86efac' : '#15803d';
      case 'failed':
        return colorScheme === 'dark' ? '#fca5a5' : '#991b1b';
      case 'pending':
        return colorScheme === 'dark' ? '#93c5fd' : '#1d4ed8';
      case 'cancelled':
        return colorScheme === 'dark' ? '#fcd34d' : '#92400e';
    }
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      entering={SlideInUp.springify()}
      exiting={SlideOutUp.springify()}
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
        animatedContainerStyle,
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Animated.View entering={FadeIn.delay(100)} style={styles.iconContainer}>
          {getIcon()}
        </Animated.View>

        <ThemedView style={styles.textContainer}>
          <ThemedText
            style={[
              styles.message,
              { color: getTextColor() },
            ]}
          >
            {message}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.actionsContainer}>
          {status === 'failed' && onRetry && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={onRetry}
            >
              <RefreshCw color="#FFF" size={16} />
              <ThemedText style={styles.actionButtonText}>재시도</ThemedText>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X color={getTextColor()} size={20} />
          </TouchableOpacity>
        </ThemedView>
      </TouchableOpacity>

      {status === 'pending' && (
        <Animated.View
          style={[
            styles.progressBar,
            { backgroundColor: getBorderColor() },
          ]}
          entering={FadeIn}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    right: 16,
    maxWidth: 500,
    alignSelf: 'center',
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
});