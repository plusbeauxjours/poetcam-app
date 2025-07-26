import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LeaderboardTab } from './LeaderboardTab';
import { leaderboardService } from '../../services/leaderboardService';

const { width } = Dimensions.get('window');

interface LeaderboardScreenProps {
  userId?: string;
  onUserPress?: (userId: string) => void;
  onClose?: () => void;
}

type TabType = 'global' | 'weekly' | 'monthly' | 'regional' | 'level';

interface TabConfig {
  id: TabType;
  title: string;
  icon: string;
  description: string;
}

const tabs: TabConfig[] = [
  {
    id: 'global',
    title: '전체',
    icon: 'globe-outline',
    description: '모든 사용자의 종합 랭킹'
  },
  {
    id: 'weekly',
    title: '주간',
    icon: 'calendar-outline',
    description: '이번 주 활동 점수'
  },
  {
    id: 'monthly',
    title: '월간',
    icon: 'calendar',
    description: '이번 달 활동 점수'
  },
  {
    id: 'regional',
    title: '지역',
    icon: 'location-outline',
    description: '같은 지역 사용자들'
  },
  {
    id: 'level',
    title: '레벨',
    icon: 'trophy-outline',
    description: '비슷한 레벨 사용자들'
  }
];

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  userId,
  onUserPress,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [userRanking, setUserRanking] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserRanking();
  }, [userId]);

  const loadUserRanking = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const ranking = await leaderboardService.getUserRankingInfo(userId);
      setUserRanking(ranking);
    } catch (error) {
      console.error('사용자 랭킹 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabPress = (tabId: TabType) => {
    setActiveTab(tabId);
  };

  const handleRefreshRanking = async () => {
    try {
      setLoading(true);
      const success = await leaderboardService.triggerRankingUpdate();
      if (success) {
        Alert.alert('알림', '랭킹이 업데이트되었습니다.');
        await loadUserRanking();
      } else {
        Alert.alert('오류', '랭킹 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('랭킹 업데이트 실패:', error);
      Alert.alert('오류', '랭킹 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getRegionCode = () => {
    return userRanking?.region_code || 'KR_SE';
  };

  const getLevelGroup = () => {
    return userRanking?.level_group || '1-10';
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>리더보드</Text>
        <Text style={styles.headerSubtitle}>시인들의 랭킹을 확인해보세요</Text>
      </View>
      
      <View style={styles.headerRight}>
        <TouchableOpacity
          onPress={handleRefreshRanking}
          style={styles.refreshButton}
          disabled={loading}
        >
          <Ionicons 
            name="refresh" 
            size={20} 
            color={loading ? '#9CA3AF' : '#667eea'} 
          />
        </TouchableOpacity>
        
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScrollContainer}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          // 지역/레벨 탭은 해당 정보가 있을 때만 표시
          if (tab.id === 'regional' && !userRanking?.region_code) {
            return null;
          }
          if (tab.id === 'level' && !userRanking?.level_group) {
            return null;
          }

          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => handleTabPress(tab.id)}
              style={[
                styles.tab,
                isActive && styles.activeTab
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon as any}
                size={18}
                color={isActive ? '#667eea' : '#9CA3AF'}
              />
              <Text style={[
                styles.tabTitle,
                isActive && styles.activeTabTitle
              ]}>
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView >
    </View>
  );

  const renderTabDescription = () => {
    const currentTab = tabs.find(tab => tab.id === activeTab);
    if (!currentTab) return null;

    return (
      <View style={styles.tabDescription}>
        <Text style={styles.tabDescriptionText}>
          {currentTab.description}
        </Text>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'global':
        return (
          <LeaderboardTab
            type="global"
            userId={userId}
            onUserPress={onUserPress}
          />
        );
      case 'weekly':
        return (
          <LeaderboardTab
            type="weekly"
            userId={userId}
            onUserPress={onUserPress}
          />
        );
      case 'monthly':
        return (
          <LeaderboardTab
            type="monthly"
            userId={userId}
            onUserPress={onUserPress}
          />
        );
      case 'regional':
        return (
          <LeaderboardTab
            type="regional"
            userId={userId}
            regionCode={getRegionCode()}
            onUserPress={onUserPress}
          />
        );
      case 'level':
        return (
          <LeaderboardTab
            type="level"
            userId={userId}
            levelGroup={getLevelGroup()}
            onUserPress={onUserPress}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderTabBar()}
      {renderTabDescription()}
      
      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
  },
  closeButton: {
    padding: 8,
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabScrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    minWidth: 80,
  },
  activeTab: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
    marginLeft: 6,
  },
  activeTabTitle: {
    color: '#667eea',
    fontWeight: '600',
  },
  tabDescription: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabDescriptionText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
});