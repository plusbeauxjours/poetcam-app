import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { useGeneratePoem } from "@/hooks/useGeneratePoem";
import { usePoetHistoryStore } from "@/store/usePoetHistoryStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Heart, Share2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// TODO(minjaelee): 1:1의 비율 + 시 streaming
// TODO(minjaelee): 공유하기 버튼 추가
// TODO(minjaelee): 에이전트의 얼굴 보이기
// TODO(minjaelee): 유료이거나 무료이지만 3번이내의 공유 일때만 이미지 공유

export default function ResultScreen() {
  const params = useLocalSearchParams<{ imageUri: string }>();
  const router = useRouter();
  const { location } = useCurrentLocation();
  const { addPoet } = usePoetHistoryStore();

  const generatePoemMutation = useGeneratePoem();
  const [displayedText, setDisplayedText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const typewriterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation values
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);

  useEffect(() => {
    if (params.imageUri) {
      // Start poem generation
      generatePoemMutation.mutate({ imageUri: params.imageUri });

      // Start fade in animation
      fadeAnim.value = withTiming(1, { duration: 500 });
      slideAnim.value = withTiming(0, { duration: 500 });
    }
  }, [params.imageUri]);

  useEffect(() => {
    if (generatePoemMutation.data?.poem && !isAnimating) {
      startTypewriterAnimation(generatePoemMutation.data.poem);
    }
  }, [generatePoemMutation.data?.poem, isAnimating]);

  const startTypewriterAnimation = (fullText: string) => {
    setIsAnimating(true);
    setDisplayedText("");

    let currentIndex = 0;
    const animateText = () => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.substring(0, currentIndex));
        currentIndex++;
        typewriterTimeoutRef.current = setTimeout(animateText, 50);
      } else {
        setIsAnimating(false);
        // Save poem to history
        if (location) {
          addPoet({
            id: Date.now().toString(),
            text: fullText,
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            createdAt: new Date().toISOString(),
          });
        }
      }
    };

    animateText();
  };

  useEffect(() => {
    return () => {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
    };
  }, []);

  const handleShare = async () => {
    if (generatePoemMutation.data?.poem) {
      try {
        // You can implement share functionality here
        Alert.alert("Share", "Sharing functionality will be implemented");
      } catch (error) {
        console.error("Failed to share:", error);
      }
    }
  };

  const handleRetry = () => {
    if (params.imageUri) {
      setDisplayedText("");
      setIsAnimating(false);
      generatePoemMutation.mutate({ imageUri: params.imageUri });
    }
  };

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [{ translateY: slideAnim.value }],
    };
  });

  if (!params.imageUri) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Image not found. Please try again.</ThemedText>
          <TouchableOpacity onPress={() => router.back()} style={styles.button}>
            <ThemedText style={styles.buttonText}>Go Back</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={styles.header}>
          <ChevronLeft color={Colors.grey[900]} size={24} />
          <ThemedText style={styles.headerText}>Back</ThemedText>
        </TouchableOpacity>

        {/* Image */}
        <Animated.View style={[styles.imageContainer, animatedContainerStyle]}>
          <Image source={{ uri: params.imageUri }} style={styles.image} />
        </Animated.View>

        {/* Poem Section */}
        <ThemedView style={styles.poemContainer}>
          {generatePoemMutation.isPending && (
            <ThemedView style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.grey[600]} />
              <ThemedText style={styles.loadingText}>Creating your poem...</ThemedText>
            </ThemedView>
          )}

          {generatePoemMutation.isError && (
            <ThemedView style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>
                {generatePoemMutation.error?.message || "Failed to generate poem"}
              </ThemedText>
              <TouchableOpacity onPress={handleRetry} style={styles.button}>
                <ThemedText style={styles.buttonText}>Try Again</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}

          {displayedText && (
            <Animated.View style={[styles.poemTextContainer, animatedContainerStyle]}>
              <ThemedText style={styles.poemText}>{displayedText}</ThemedText>
              {isAnimating && <ThemedText style={styles.cursor}>|</ThemedText>}
            </Animated.View>
          )}

          {/* Action Buttons */}
          {generatePoemMutation.data?.poem && !isAnimating && (
            <Animated.View style={[styles.actionsContainer, animatedContainerStyle]}>
              <TouchableOpacity
                onPress={handleShare}
                style={[styles.actionButton, styles.shareButton]}>
                <Share2 color="white" size={20} />
                <ThemedText style={styles.actionButtonText}>Share</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRetry}
                style={[styles.actionButton, styles.retryButton]}>
                <Heart color={Colors.grey[600]} size={20} />
                <ThemedText style={[styles.actionButtonText, { color: Colors.grey[600] }]}>
                  New Poem
                </ThemedText>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 10,
  },
  headerText: {
    color: Colors.grey[900],
    fontSize: 16,
    marginLeft: 8,
    fontWeight: "500",
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  image: {
    width: width - 40,
    height: width - 40,
    borderRadius: 20,
    resizeMode: "cover",
  },
  poemContainer: {
    padding: 20,
    paddingTop: 0,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.grey[600],
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.grey[200],
    borderRadius: 8,
  },
  buttonText: {
    color: Colors.grey[900],
    fontSize: 16,
    fontWeight: "500",
  },
  poemTextContainer: {
    backgroundColor: Colors.grey[100],
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    minHeight: 120,
  },
  poemText: {
    fontSize: 18,
    lineHeight: 28,
    color: Colors.grey[800],
    fontStyle: "italic",
  },
  cursor: {
    fontSize: 18,
    color: Colors.grey[800],
    opacity: 0.7,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButton: {
    backgroundColor: Colors.grey[800],
  },
  retryButton: {
    backgroundColor: Colors.grey[100],
    borderWidth: 1,
    borderColor: Colors.grey[300],
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});
