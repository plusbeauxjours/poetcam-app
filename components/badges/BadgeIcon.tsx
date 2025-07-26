import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Badge, BadgeRarity } from '../../types/badge';
import {
  BADGE_RARITY_COLORS,
  BADGE_CATEGORY_THEMES,
  BADGE_SIZES,
  BADGE_SHADOWS,
  BADGE_STATE_STYLES
} from '../../constants/badgeDesign';

interface BadgeIconProps {
  badge: Badge;
  size?: keyof typeof BADGE_SIZES;
  state?: 'earned' | 'locked' | 'inProgress' | 'almostEarned';
  progress?: number; // 0-100
  showGlow?: boolean;
  showProgress?: boolean;
  style?: ViewStyle;
}

const BadgeIcon: React.FC<BadgeIconProps> = ({
  badge,
  size = 'medium',
  state = 'locked',
  progress = 0,
  showGlow = true,
  showProgress = false,
  style
}) => {
  const sizeConfig = BADGE_SIZES[size];
  const rarityColors = BADGE_RARITY_COLORS[badge.rarity];
  const categoryTheme = BADGE_CATEGORY_THEMES[badge.category];
  const stateStyle = BADGE_STATE_STYLES[state];
  const shadowStyle = BADGE_SHADOWS[badge.rarity];

  const containerStyle: ViewStyle = {
    width: sizeConfig.width,
    height: sizeConfig.height,
    borderRadius: sizeConfig.width / 2,
    borderWidth: sizeConfig.borderWidth,
    borderColor: rarityColors.border,
    backgroundColor: rarityColors.background,
    opacity: stateStyle.opacity,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...shadowStyle,
    ...style
  };

  const iconTextStyle: TextStyle = {
    fontSize: sizeConfig.iconSize,
    opacity: stateStyle.saturation,
  };

  const progressBarStyle: ViewStyle = {
    position: 'absolute',
    bottom: -sizeConfig.borderWidth - 2,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 1.5,
    overflow: 'hidden'
  };

  const progressFillStyle: ViewStyle = {
    height: '100%',
    width: `${Math.min(Math.max(progress, 0), 100)}%`,
    backgroundColor: progress >= 80 ? '#F59E0B' : '#10B981',
    borderRadius: 1.5
  };

  const glowStyle: ViewStyle = showGlow && stateStyle.showGlow ? {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: (sizeConfig.width + 4) / 2,
    backgroundColor: rarityColors.glow,
    opacity: stateStyle.glowIntensity || 0.3,
    zIndex: -1
  } : {};

  return (
    <View style={containerStyle}>
      {/* 발광 효과 */}
      {showGlow && stateStyle.showGlow && <View style={glowStyle} />}
      
      {/* 뱃지 아이콘 */}
      <Text style={iconTextStyle}>
        {categoryTheme.icon}
      </Text>

      {/* 잠금 상태 오버레이 */}
      {state === 'locked' && (
        <View style={styles.lockOverlay}>
          <Text style={[styles.lockIcon, { fontSize: sizeConfig.iconSize * 0.6 }]}>
            🔒
          </Text>
        </View>
      )}

      {/* 진행도 바 */}
      {showProgress && stateStyle.showProgress && progress > 0 && progress < 100 && (
        <View style={progressBarStyle}>
          <View style={progressFillStyle} />
        </View>
      )}

      {/* 희귀도 표시 (작은 크기가 아닌 경우) */}
      {size !== 'small' && badge.rarity !== BadgeRarity.COMMON && (
        <View style={[styles.rarityIndicator, { 
          backgroundColor: rarityColors.primary,
          top: -sizeConfig.borderWidth,
          right: -sizeConfig.borderWidth
        }]}>
          <Text style={[styles.rarityText, { fontSize: sizeConfig.fontSize }]}>
            {badge.rarity === BadgeRarity.LEGENDARY ? '★' : 
             badge.rarity === BadgeRarity.EPIC ? '◆' :
             badge.rarity === BadgeRarity.RARE ? '▲' : '●'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center'
  },
  lockIcon: {
    textAlign: 'center'
  },
  rarityIndicator: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF'
  },
  rarityText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 14
  }
});

export default BadgeIcon;