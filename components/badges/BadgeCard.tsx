import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Animated
} from 'react-native';
import { Badge, UserBadge, BadgeProgress } from '../../types/badge';
import {
  BADGE_TYPOGRAPHY,
  BADGE_RARITY_COLORS,
  BADGE_CATEGORY_THEMES,
  PROGRESS_BAR_COLORS,
  DARK_MODE_BADGE_COLORS
} from '../../constants/badgeDesign';
import BadgeIcon from './BadgeIcon';

interface BadgeCardProps {
  badge: Badge;
  userBadge?: UserBadge;
  progress?: BadgeProgress[];
  state?: 'earned' | 'locked' | 'inProgress' | 'almostEarned';
  showDescription?: boolean;
  showProgress?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  isDarkMode?: boolean;
}

const BadgeCard: React.FC<BadgeCardProps> = ({
  badge,
  userBadge,
  progress = [],
  state = 'locked',
  showDescription = true,
  showProgress = true,
  onPress,
  style,
  isDarkMode = false
}) => {
  const rarityColors = BADGE_RARITY_COLORS[badge.rarity];
  const categoryTheme = BADGE_CATEGORY_THEMES[badge.category];
  const colorScheme = isDarkMode ? DARK_MODE_BADGE_COLORS : null;

  // 전체 진행도 계산
  const overallProgress = progress.length > 0 ? 
    Math.round((progress.filter(p => p.completed).length / progress.length) * 100) : 
    (state === 'earned' ? 100 : 0);

  const cardStyle: ViewStyle = {
    backgroundColor: colorScheme?.background.dark || '#FFFFFF',
    borderColor: rarityColors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    shadowColor: rarityColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    ...style
  };

  const titleColor = colorScheme?.text.dark || BADGE_TYPOGRAPHY.title.color;
  const descriptionColor = colorScheme?.text.dark || BADGE_TYPOGRAPHY.description.color;

  return (
    <TouchableOpacity
      style={cardStyle}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <BadgeIcon
          badge={badge}
          size="large"
          state={state}
          progress={overallProgress}
          showProgress={showProgress && state === 'inProgress'}
        />
        
        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: titleColor }]}>
              {badge.name}
            </Text>
            <View style={[styles.categoryTag, { backgroundColor: categoryTheme.accentColor }]}>
              <Text style={styles.categoryText}>
                {badge.category.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <View style={styles.rarityRow}>
            <Text style={[styles.rarity, { color: rarityColors.primary }]}>
              {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
            </Text>
            <Text style={[styles.points, { color: titleColor }]}>
              {badge.points}P
            </Text>
          </View>
        </View>
      </View>

      {showDescription && (
        <Text style={[styles.description, { color: descriptionColor }]}>
          {state === 'locked' && badge.unlockHint ? badge.unlockHint : badge.description}
        </Text>
      )}

      {/* 획득 날짜 표시 */}
      {state === 'earned' && userBadge && (
        <View style={styles.earnedInfo}>
          <Text style={[styles.earnedDate, { color: descriptionColor }]}>
            {new Date(userBadge.earnedAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} 획득
          </Text>
        </View>
      )}

      {/* 진행도 상세 표시 */}
      {showProgress && progress.length > 0 && state !== 'earned' && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: titleColor }]}>
              진행도 ({progress.filter(p => p.completed).length}/{progress.length})
            </Text>
            <Text style={[styles.progressPercentage, { color: rarityColors.primary }]}>
              {overallProgress}%
            </Text>
          </View>
          
          {/* 전체 진행도 바 */}
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${overallProgress}%`,
                  backgroundColor: overallProgress >= 80 ? 
                    PROGRESS_BAR_COLORS.almostComplete : 
                    PROGRESS_BAR_COLORS.filled
                }
              ]} 
            />
          </View>

          {/* 개별 조건 진행도 */}
          {progress.slice(0, 3).map((p, index) => {
            const condition = badge.conditions[p.conditionIndex];
            if (!condition) return null;

            const conditionProgress = Math.round((p.current / p.target) * 100);
            
            return (
              <View key={index} style={styles.conditionProgress}>
                <View style={styles.conditionInfo}>
                  <Text style={[styles.conditionText, { color: descriptionColor }]}>
                    {getConditionDescription(condition.type)}
                  </Text>
                  <Text style={[styles.conditionValues, { color: titleColor }]}>
                    {p.current}/{p.target}
                  </Text>
                </View>
                <View style={styles.smallProgressBar}>
                  <View 
                    style={[
                      styles.smallProgressFill,
                      { 
                        width: `${Math.min(conditionProgress, 100)}%`,
                        backgroundColor: p.completed ? 
                          PROGRESS_BAR_COLORS.complete : 
                          PROGRESS_BAR_COLORS.filled
                      }
                    ]} 
                  />
                </View>
              </View>
            );
          })}

          {progress.length > 3 && (
            <Text style={[styles.moreConditions, { color: descriptionColor }]}>
              +{progress.length - 3}개 조건 더보기
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// 조건 타입에 따른 설명 텍스트
const getConditionDescription = (conditionType: string): string => {
  const descriptions: { [key: string]: string } = {
    'poem_count': '시 작성',
    'photo_count': '사진 촬영',
    'challenge_complete': '챌린지 완료',
    'location_visit': '위치 방문',
    'consecutive_days': '연속 접속',
    'total_points': '총 포인트',
    'share_count': '공유',
    'like_received': '받은 좋아요',
    'comment_count': '댓글 작성',
    'specific_challenge': '특정 챌린지',
    'time_based': '시간 기반 활동',
    'seasonal_event': '이벤트 참여'
  };
  return descriptions[conditionType] || conditionType;
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  title: {
    ...BADGE_TYPOGRAPHY.title,
    flex: 1,
    marginRight: 8
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  rarityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  rarity: {
    ...BADGE_TYPOGRAPHY.rarity,
    fontWeight: '600'
  },
  points: {
    ...BADGE_TYPOGRAPHY.rarity,
    fontWeight: '500'
  },
  description: {
    ...BADGE_TYPOGRAPHY.description,
    marginBottom: 8,
    lineHeight: 20
  },
  earnedInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  earnedDate: {
    ...BADGE_TYPOGRAPHY.hint,
    textAlign: 'center'
  },
  progressSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  progressTitle: {
    ...BADGE_TYPOGRAPHY.progress
  },
  progressPercentage: {
    ...BADGE_TYPOGRAPHY.progress,
    fontWeight: '600'
  },
  progressBar: {
    height: 6,
    backgroundColor: PROGRESS_BAR_COLORS.background,
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 3
  },
  conditionProgress: {
    marginBottom: 8
  },
  conditionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  conditionText: {
    fontSize: 12,
    flex: 1
  },
  conditionValues: {
    fontSize: 12,
    fontWeight: '500'
  },
  smallProgressBar: {
    height: 3,
    backgroundColor: PROGRESS_BAR_COLORS.background,
    borderRadius: 1.5,
    overflow: 'hidden'
  },
  smallProgressFill: {
    height: '100%',
    borderRadius: 1.5
  },
  moreConditions: {
    ...BADGE_TYPOGRAPHY.hint,
    textAlign: 'center',
    marginTop: 4
  }
});

export default BadgeCard;