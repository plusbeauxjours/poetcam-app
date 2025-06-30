import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text } from "react-native";

interface HistoryItem {
  id: string;
  image: string;
  text: string;
  lat: number;
  lng: number;
  resentCount: number;
  like: boolean;
  likeCount: number;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

const fetchHistory = async ({
  pageParam = 1,
}): Promise<{ data: HistoryItem[]; nextPage: number | null }> => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const items: HistoryItem[] = Array.from({ length: 10 }, (_, i) => {
    const id = (pageParam - 1) * 10 + i + 1;
    return {
      id: id.toString(),
      image: `https://picsum.photos/seed/${id}/200/300`,
      text: `This is a poem number ${id}. It talks about misty mountains and flowing rivers.`,
      lat: 34.0522,
      lng: -118.2437,
      resentCount: id % 5,
      like: id % 2 === 0,
      likeCount: id * 3,
      read: id % 3 === 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  return {
    data: items,
    nextPage: pageParam < 5 ? pageParam + 1 : null, // Stop after 5 pages for demo
  };
};

export default function HistoryScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteQuery({
      queryKey: ["history"],
      queryFn: fetchHistory,
      getNextPageParam: (lastPage) => lastPage.nextPage,
      initialPageParam: 1,
    });

  if (isLoading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (isError) {
    return (
      <ThemedView style={styles.centerContainer}>
        <Text>Error fetching data</Text>
      </ThemedView>
    );
  }

  const allItems = data?.pages.flatMap((page) => page.data) ?? [];
  const themedStyles = {
    itemContainer: {
      backgroundColor: colorScheme === "dark" ? Colors.black : Colors.grey[100],
    },
    text: {
      color: colorScheme === "dark" ? Colors.grey[100] : Colors.black,
    },
  };

  return (
    <FlatList
      data={allItems}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ThemedView style={[styles.itemContainer, themedStyles.itemContainer]}>
          <Image source={{ uri: item.image }} style={styles.image} />
          <Text style={[styles.text, themedStyles.text]}>{item.text}</Text>
        </ThemedView>
      )}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 20 }} /> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  itemContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
});
