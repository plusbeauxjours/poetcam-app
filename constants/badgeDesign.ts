// 뱃지 디자인 시스템 및 시각적 요소 정의

import { BadgeRarity, BadgeCategory } from '../types/badge';

// 뱃지 등급별 색상 시스템
export const BADGE_RARITY_COLORS = {
  [BadgeRarity.COMMON]: {
    primary: '#9CA3AF',      // 회색
    secondary: '#6B7280',
    background: '#F3F4F6',
    border: '#D1D5DB',
    glow: 'rgba(156, 163, 175, 0.3)',
    gradient: ['#9CA3AF', '#6B7280']
  },
  [BadgeRarity.UNCOMMON]: {
    primary: '#10B981',      // 초록
    secondary: '#059669',
    background: '#ECFDF5',
    border: '#A7F3D0',
    glow: 'rgba(16, 185, 129, 0.4)',
    gradient: ['#10B981', '#059669']
  },
  [BadgeRarity.RARE]: {
    primary: '#3B82F6',      // 파랑
    secondary: '#2563EB',
    background: '#EFF6FF',
    border: '#93C5FD',
    glow: 'rgba(59, 130, 246, 0.5)',
    gradient: ['#3B82F6', '#2563EB']
  },
  [BadgeRarity.EPIC]: {
    primary: '#8B5CF6',      // 보라
    secondary: '#7C3AED',
    background: '#F5F3FF',
    border: '#C4B5FD',
    glow: 'rgba(139, 92, 246, 0.6)',
    gradient: ['#8B5CF6', '#7C3AED']
  },
  [BadgeRarity.LEGENDARY]: {
    primary: '#F59E0B',      // 금색
    secondary: '#D97706',
    background: '#FFFBEB',
    border: '#FDE68A',
    glow: 'rgba(245, 158, 11, 0.7)',
    gradient: ['#F59E0B', '#D97706', '#FBBF24']
  }
} as const;

// 뱃지 카테고리별 아이콘 및 테마
export const BADGE_CATEGORY_THEMES = {
  [BadgeCategory.BEGINNER]: {
    icon: '🌱',
    emoji: '🎯',
    symbolIcon: 'star-outline',
    description: '첫 걸음을 내딛는 새로운 시인들을 위한 뱃지',
    accentColor: '#10B981'
  },
  [BadgeCategory.CREATIVE]: {
    icon: '🎨',
    emoji: '✨',
    symbolIcon: 'brush',
    description: '창작 활동과 예술적 표현을 인정하는 뱃지',
    accentColor: '#8B5CF6'
  },
  [BadgeCategory.LOCATION]: {
    icon: '📍',
    emoji: '🗺️',
    symbolIcon: 'location',
    description: '특별한 장소에서의 창작을 기념하는 뱃지',
    accentColor: '#3B82F6'
  },
  [BadgeCategory.CHALLENGE]: {
    icon: '🏆',
    emoji: '💪',
    symbolIcon: 'trophy',
    description: '챌린지 완료와 성취를 축하하는 뱃지',
    accentColor: '#F59E0B'
  },
  [BadgeCategory.SOCIAL]: {
    icon: '👥',
    emoji: '🤝',
    symbolIcon: 'people',
    description: '커뮤니티 참여와 소통을 인정하는 뱃지',
    accentColor: '#EF4444'
  },
  [BadgeCategory.ACHIEVEMENT]: {
    icon: '🎖️',
    emoji: '🏅',
    symbolIcon: 'medal',
    description: '특별한 성과와 업적을 기념하는 뱃지',
    accentColor: '#F59E0B'
  },
  [BadgeCategory.SEASONAL]: {
    icon: '🌸',
    emoji: '🎄',
    symbolIcon: 'calendar',
    description: '계절과 특별한 시기를 기념하는 한정 뱃지',
    accentColor: '#EC4899'
  },
  [BadgeCategory.SPECIAL]: {
    icon: '⭐',
    emoji: '🎁',
    symbolIcon: 'gift',
    description: '특별한 이벤트와 기념일을 위한 희귀 뱃지',
    accentColor: '#6366F1'
  }
} as const;

// 뱃지 크기 시스템
export const BADGE_SIZES = {
  small: {
    width: 32,
    height: 32,
    iconSize: 16,
    fontSize: 8,
    borderWidth: 1
  },
  medium: {
    width: 48,
    height: 48,
    iconSize: 24,
    fontSize: 10,
    borderWidth: 2
  },
  large: {
    width: 64,
    height: 64,
    iconSize: 32,
    fontSize: 12,
    borderWidth: 2
  },
  xlarge: {
    width: 96,
    height: 96,
    iconSize: 48,
    fontSize: 14,
    borderWidth: 3
  },
  showcase: {
    width: 128,
    height: 128,
    iconSize: 64,
    fontSize: 16,
    borderWidth: 4
  }
} as const;

// 뱃지 애니메이션 설정
export const BADGE_ANIMATIONS = {
  earned: {
    scale: [0.5, 1.2, 1],
    opacity: [0, 1, 1],
    rotation: [0, 10, -5, 0],
    duration: 800
  },
  glow: {
    glowOpacity: [0.3, 0.8, 0.3],
    duration: 2000,
    repeat: -1
  },
  hover: {
    scale: [1, 1.05],
    duration: 200
  },
  press: {
    scale: [1, 0.95],
    duration: 100
  },
  shimmer: {
    shimmerPosition: [-100, 100],
    duration: 1500,
    repeat: -1
  }
} as const;

// 뱃지 진행도 바 색상
export const PROGRESS_BAR_COLORS = {
  background: '#E5E7EB',
  filled: '#10B981',
  almostComplete: '#F59E0B', // 80% 이상
  complete: '#10B981'
} as const;

// 뱃지 상태별 스타일
export const BADGE_STATE_STYLES = {
  earned: {
    opacity: 1,
    saturation: 1,
    brightness: 1,
    showGlow: true
  },
  locked: {
    opacity: 0.4,
    saturation: 0.2,
    brightness: 0.8,
    showGlow: false,
    overlayColor: 'rgba(0, 0, 0, 0.3)',
    lockIcon: '🔒'
  },
  inProgress: {
    opacity: 0.8,
    saturation: 0.7,
    brightness: 0.9,
    showGlow: false,
    showProgress: true
  },
  almostEarned: {
    opacity: 0.9,
    saturation: 0.9,
    brightness: 1,
    showGlow: true,
    glowIntensity: 0.5,
    showProgress: true
  }
} as const;

// 뱃지 레이아웃 패턴
export const BADGE_LAYOUTS = {
  grid: {
    spacing: 12,
    columns: 3,
    aspectRatio: 1
  },
  list: {
    spacing: 8,
    padding: 16,
    showDescription: true
  },
  showcase: {
    spacing: 24,
    columns: 1,
    showDetails: true,
    showProgress: true
  },
  carousel: {
    spacing: 16,
    itemWidth: 120,
    showTitle: true
  }
} as const;

// 뱃지 텍스트 스타일
export const BADGE_TYPOGRAPHY = {
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20,
    color: '#111827'
  },
  description: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 18,
    color: '#6B7280'
  },
  category: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 14,
    color: '#9CA3AF',
    textTransform: 'uppercase' as const
  },
  rarity: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 14,
    textTransform: 'capitalize' as const
  },
  progress: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 14,
    color: '#374151'
  },
  hint: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: '#9CA3AF',
    fontStyle: 'italic' as const
  }
} as const;

// 뱃지 사운드 효과 (파일명)
export const BADGE_SOUNDS = {
  earned: 'badge_earned.mp3',
  progress: 'badge_progress.mp3',
  rare_earned: 'rare_badge_earned.mp3',
  legendary_earned: 'legendary_badge_earned.mp3'
} as const;

// 뱃지 햅틱 피드백 패턴
export const BADGE_HAPTICS = {
  earned: {
    type: 'success' as const,
    intensity: 'heavy' as const
  },
  progress: {
    type: 'light' as const,
    intensity: 'light' as const
  },
  rare_earned: {
    type: 'success' as const,
    intensity: 'heavy' as const,
    pattern: [100, 50, 100, 50, 200]
  }
} as const;

// 다크 모드 색상 오버라이드
export const DARK_MODE_BADGE_COLORS = {
  background: {
    light: '#FFFFFF',
    dark: '#1F2937'
  },
  text: {
    light: '#111827',
    dark: '#F9FAFB'
  },
  border: {
    light: '#E5E7EB',
    dark: '#374151'
  },
  shadow: {
    light: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.3)'
  }
} as const;

// 뱃지 카드 그림자 설정
export const BADGE_SHADOWS = {
  [BadgeRarity.COMMON]: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  [BadgeRarity.UNCOMMON]: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  [BadgeRarity.RARE]: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6
  },
  [BadgeRarity.EPIC]: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8
  },
  [BadgeRarity.LEGENDARY]: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12
  }
} as const;

// 뱃지 컬렉션 표시 옵션
export const COLLECTION_VIEW_CONFIGS = {
  grid: {
    numColumns: 3,
    spacing: 16,
    showTitle: false,
    showProgress: false
  },
  detailed: {
    numColumns: 1,
    spacing: 12,
    showTitle: true,
    showProgress: true,
    showDescription: true
  },
  compact: {
    numColumns: 4,
    spacing: 8,
    showTitle: false,
    showProgress: false
  }
} as const;