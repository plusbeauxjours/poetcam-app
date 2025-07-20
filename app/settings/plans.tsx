import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { StyleSheet, FlatList } from "react-native";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { useEffect } from "react";

export default function PlansScreen() {
  const { availablePlans, refreshSubscriptionData, isLoading } = useSubscriptionStore();

  useEffect(() => {
    refreshSubscriptionData().catch(console.error);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={availablePlans}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        onRefresh={() => refreshSubscriptionData()}
        renderItem={({ item }) => (
          <ThemedView style={styles.item}>
            <ThemedText type="subtitle">{item.title}</ThemedText>
            <ThemedText>{item.price}</ThemedText>
          </ThemedView>
        )}
        ListEmptyComponent={<ThemedText>No plans available</ThemedText>}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
  },
});
