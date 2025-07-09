import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { usePoetHistoryStore } from "@/store/usePoetHistoryStore";
import { FlatList, StyleSheet } from "react-native";

export default function HistoryScreen() {
  const { history } = usePoetHistoryStore();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        시 작품 기록
      </ThemedText>
      {history.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>아직 작성된 시가 없습니다.</ThemedText>
          <ThemedText style={styles.emptySubText}>
            카메라로 사진을 찍어 첫 번째 시를 만들어보세요!
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ThemedView style={styles.poemCard}>
              <ThemedText style={styles.poemText}>{item.text}</ThemedText>
              <ThemedText style={styles.dateText}>
                {new Date(item.createdAt).toLocaleDateString("ko-KR")}
              </ThemedText>
            </ThemedView>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 24,
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 20,
  },
  poemCard: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  poemText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: "right",
  },
});
