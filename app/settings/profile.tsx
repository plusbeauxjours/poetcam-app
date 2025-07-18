import { AvatarSelector } from "@/components/profile/AvatarSelector";
import { ProfileEditModal } from "@/components/profile/ProfileEditModal";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import ProfileService, { ProfileStats } from "@/services/profileService";
import { useAuthStore } from "@/store/useAuthStore";
import { DbUser } from "@/types/database";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<DbUser | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const { user } = useAuthStore();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);

      // 프로필 정보 로드
      const profileResult = await ProfileService.getProfile();
      if (profileResult.success && profileResult.data) {
        setProfile(profileResult.data);
      } else {
        throw new Error(profileResult.error || "프로필 로드 실패");
      }

      // 통계 정보 로드
      const statsResult = await ProfileService.getProfileStats();
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error("Profile load error:", error);
      Alert.alert("오류", "프로필 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProfile();
    setIsRefreshing(false);
  };

  const handleProfileUpdate = (updatedProfile: DbUser) => {
    setProfile(updatedProfile);
    // 통계 정보도 다시 로드
    loadProfile();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("ko-KR");
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={[styles.loadingText, { color: colors.secondaryText }]}>
          프로필 정보를 불러오는 중...
        </ThemedText>
      </ThemedView>
    );
  }

  if (!profile) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="person-circle-outline" size={80} color={colors.secondaryText} />
        <ThemedText style={[styles.errorText, { color: colors.secondaryText }]}>
          프로필 정보를 불러올 수 없습니다.
        </ThemedText>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.tint }]}
          onPress={loadProfile}>
          <ThemedText style={styles.retryButtonText}>다시 시도</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
          />
        }>
        {/* 프로필 헤더 */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {profile.avatar_url ? (
                <AvatarSelector
                  currentAvatarUrl={profile.avatar_url}
                  onAvatarUpdate={() => loadProfile()}
                  userId={profile.id}
                  size={100}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                  <Ionicons name="person" size={50} color={colors.secondaryText} />
                </View>
              )}
            </View>

            <View style={styles.profileInfo}>
              <ThemedText style={styles.profileName}>{profile.name || "이름 없음"}</ThemedText>
              <ThemedText style={[styles.profileEmail, { color: colors.secondaryText }]}>
                {profile.email}
              </ThemedText>
              <View
                style={[
                  styles.subscriptionBadge,
                  {
                    backgroundColor:
                      profile.subscription_type === "premium" ? colors.success : colors.grey[200],
                  },
                ]}>
                <ThemedText
                  style={[
                    styles.subscriptionText,
                    {
                      color: profile.subscription_type === "premium" ? "white" : colors.text,
                    },
                  ]}>
                  {profile.subscription_type === "premium" ? "프리미엄" : "무료"}
                </ThemedText>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.tint }]}
            onPress={() => setEditModalVisible(true)}>
            <Ionicons name="pencil" size={20} color="white" />
            <ThemedText style={styles.editButtonText}>편집</ThemedText>
          </TouchableOpacity>
        </View>

        {/* 통계 섹션 */}
        {stats && (
          <View style={[styles.statsSection, { backgroundColor: colors.card }]}>
            <ThemedText style={styles.sectionTitle}>활동 통계</ThemedText>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons name="document-text" size={24} color={colors.tint} />
                <ThemedText style={styles.statNumber}>{formatNumber(stats.totalPoems)}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.secondaryText }]}>
                  총 시
                </ThemedText>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="heart" size={24} color={colors.error} />
                <ThemedText style={styles.statNumber}>
                  {formatNumber(stats.favoritePoems)}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.secondaryText }]}>
                  즐겨찾기
                </ThemedText>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="globe" size={24} color={colors.success} />
                <ThemedText style={styles.statNumber}>{formatNumber(stats.publicPoems)}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.secondaryText }]}>
                  공개 시
                </ThemedText>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="thumbs-up" size={24} color={colors.warning} />
                <ThemedText style={styles.statNumber}>{formatNumber(stats.totalLikes)}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.secondaryText }]}>
                  좋아요
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* 계정 정보 섹션 */}
        <View style={[styles.infoSection, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.sectionTitle}>계정 정보</ThemedText>

          <View style={styles.infoItem}>
            <Ionicons name="calendar" size={20} color={colors.secondaryText} />
            <View style={styles.infoContent}>
              <ThemedText style={[styles.infoLabel, { color: colors.secondaryText }]}>
                가입일
              </ThemedText>
              <ThemedText style={styles.infoValue}>{formatDate(profile.created_at)}</ThemedText>
            </View>
          </View>

          {stats && (
            <View style={styles.infoItem}>
              <Ionicons name="time" size={20} color={colors.secondaryText} />
              <View style={styles.infoContent}>
                <ThemedText style={[styles.infoLabel, { color: colors.secondaryText }]}>
                  마지막 활동
                </ThemedText>
                <ThemedText style={styles.infoValue}>{formatDate(stats.lastActive)}</ThemedText>
              </View>
            </View>
          )}

          <View style={styles.infoItem}>
            <Ionicons name="settings" size={20} color={colors.secondaryText} />
            <View style={styles.infoContent}>
              <ThemedText style={[styles.infoLabel, { color: colors.secondaryText }]}>
                알림 설정
              </ThemedText>
              <ThemedText style={styles.infoValue}>
                {profile.preferences?.notifications?.push ? "켜짐" : "꺼짐"}
              </ThemedText>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="eye" size={20} color={colors.secondaryText} />
            <View style={styles.infoContent}>
              <ThemedText style={[styles.infoLabel, { color: colors.secondaryText }]}>
                프로필 공개
              </ThemedText>
              <ThemedText style={styles.infoValue}>
                {profile.preferences?.privacy?.profileVisible ? "공개" : "비공개"}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* 하단 여백 */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* 프로필 편집 모달 */}
      <ProfileEditModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        currentProfile={profile}
        onProfileUpdate={handleProfileUpdate}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    marginBottom: 8,
  },
  subscriptionBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  subscriptionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  statsSection: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 14,
  },
  infoSection: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  bottomSpacer: {
    height: 40,
  },
});
