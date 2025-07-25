import React, { useState } from 'react';
import { StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ShareStatsDashboard } from '@/components/ShareStatsDashboard';
import { LinkManagement } from '@/components/LinkManagement';
import { ThemedText } from '@/components/ThemedText';
import { Link } from 'lucide-react-native';

export default function StatisticsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [showLinkManagement, setShowLinkManagement] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      {/* Header with Link Management Button */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedText style={styles.headerTitle}>통계</ThemedText>
        <TouchableOpacity
          style={[styles.linkButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowLinkManagement(true)}
        >
          <Link color="#FFF" size={16} />
          <ThemedText style={styles.linkButtonText}>링크 관리</ThemedText>
        </TouchableOpacity>
      </View>

      <ShareStatsDashboard />

      {/* Link Management Modal */}
      <LinkManagement
        visible={showLinkManagement}
        onClose={() => setShowLinkManagement(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  linkButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
});