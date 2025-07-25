import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { useGeneratePoem } from "@/hooks/useGeneratePoem";
import { useTextStyle } from "@/hooks/useTextStyle";
import { StyleSelector } from "@/components/StyleSelector";
import { ImagePreviewEnhanced } from "@/components/ImagePreviewEnhanced";
import { AVAILABLE_FONTS } from "@/constants/fonts";
import {
  convertToProgressUpdate,
  convertToUserFriendlyError,
  createErrorState,
  createLoadingState,
  createSuccessState,
  FeedbackState,
} from "@/services/errorHandler";
import { usePoetHistoryStore } from "@/store/usePoetHistoryStore";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  Bookmark,
  CheckCircle,
  ChevronLeft,
  Copy,
  RefreshCw,
  Share2,
  Sparkles,
  Palette,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  Vibration,
} from "react-native";
import { shareToSocial } from "@/services/socialShareService";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const isTablet = width > 768;
const imageSize = isTablet ? width * 0.6 : width - 40;

export default function ResultScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const params = useLocalSearchParams<{ imageUri: string }>();
  const router = useRouter();
  const { location } = useCurrentLocation();
  const { addPoet } = usePoetHistoryStore();
  const { textStyle, saveTextStyle } = useTextStyle();

  const generatePoemMutation = useGeneratePoem();
  const [displayedText, setDisplayedText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>({
    isLoading: false,
    error: null,
    progress: null,
    success: false,
    retryCount: 0,
    canRetry: false,
  });
  const [savedToHistory, setSavedToHistory] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const typewriterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation values
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);
  const poemFadeAnim = useSharedValue(0);
  const actionButtonsScale = useSharedValue(0);
  const progressAnim = useSharedValue(0);
  const successAnim = useSharedValue(0);
  const sparkleAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    if (params.imageUri) {
      // Initialize feedback state
      setFeedbackState(createLoadingState("starting", "시를 만들어드리고 있어요..."));

      // Start poem generation
      generatePoemMutation.mutate({
        imageUri: params.imageUri,
        poemOptions: {
          style: "modern",
          language: "ko",
          preset: "BALANCED",
          enableFormatting: true,
          onProgress: (update: any) => {
            const progressUpdate = convertToProgressUpdate(update.stage, update.details);
            setFeedbackState((prev) => ({ ...prev, progress: progressUpdate }));
            progressAnim.value = withTiming((update.progress || 0) / 100, { duration: 300 });
          },
        },
      });

      // Start fade in animation
      fadeAnim.value = withTiming(1, { duration: 500 });
      slideAnim.value = withTiming(0, { duration: 500 });
    }
  }, [params.imageUri]);

  useEffect(() => {
    if (generatePoemMutation.isPending) {
      setFeedbackState(createLoadingState("processing", "AI가 이미지를 분석하고 있어요..."));
      // Start pulse animation for loading
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else if (generatePoemMutation.isError) {
      const userError = convertToUserFriendlyError(generatePoemMutation.error);
      setFeedbackState(createErrorState(userError, feedbackState.retryCount));
      pulseAnim.value = withTiming(1, { duration: 300 });
    } else if (generatePoemMutation.data && !isAnimating) {
      setFeedbackState(createSuccessState());
      pulseAnim.value = withTiming(1, { duration: 300 });
      startTypewriterAnimation(generatePoemMutation.data.poem);
    }
  }, [
    generatePoemMutation.isPending,
    generatePoemMutation.isError,
    generatePoemMutation.data,
    isAnimating,
  ]);

  const startTypewriterAnimation = (fullText: string) => {
    setIsAnimating(true);
    setDisplayedText("");
    poemFadeAnim.value = withTiming(1, { duration: 500 });

    // Show sparkles animation
    setShowSparkles(true);
    sparkleAnim.value = withRepeat(
      withSequence(withTiming(1, { duration: 300 }), withTiming(0.7, { duration: 300 })),
      3,
      false
    );

    let currentIndex = 0;
    const animateText = () => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.substring(0, currentIndex));
        currentIndex++;
        typewriterTimeoutRef.current = setTimeout(animateText, 30); // Faster animation
      } else {
        setIsAnimating(false);
        setShowSparkles(false);
        actionButtonsScale.value = withSpring(1, {
          damping: 15,
          stiffness: 200,
        });

        // Save poem to history if location is available
        if (location && !savedToHistory) {
          saveToHistory(fullText);
        }
      }
    };

    animateText();
  };

  const saveToHistory = (poemText: string) => {
    if (location) {
      addPoet({
        id: Date.now().toString(),
        text: poemText,
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        createdAt: new Date().toISOString(),
      });
      setSavedToHistory(true);

      // Success animation
      successAnim.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 300 })
      );
    }
  };

  const handleShare = () => {
    if (params.imageUri && generatePoemMutation.data?.poem) {
      setShowImagePreview(true);
    }
  };

  const handleCopy = async () => {
    if (generatePoemMutation.data?.poem) {
      try {
        await Clipboard.setStringAsync(generatePoemMutation.data.poem);
        Alert.alert("복사 완료", "시가 클립보드에 복사되었습니다.");

        // Haptic feedback
        if (Platform.OS === "ios") {
          Vibration.vibrate([10]);
        }
      } catch (error) {
        console.error("Failed to copy:", error);
        Alert.alert("복사 실패", "복사 중 문제가 발생했습니다. 다시 시도해주세요.");
      }
    }
  };

  const handleSave = async () => {
    if (generatePoemMutation.data?.poem && location && !savedToHistory) {
      saveToHistory(generatePoemMutation.data.poem);
      Alert.alert("저장 완료", "시가 히스토리에 저장되었습니다.");
    } else if (savedToHistory) {
      Alert.alert("이미 저장됨", "이 시는 이미 히스토리에 저장되어 있습니다.");
    } else if (!location) {
      Alert.alert("위치 필요", "시를 저장하려면 위치 권한이 필요합니다.");
    }
  };

  const handleRetry = () => {
    if (params.imageUri) {
      setDisplayedText("");
      setIsAnimating(false);
      setSavedToHistory(false);
      setShowSparkles(false);
      setFeedbackState({
        isLoading: false,
        error: null,
        progress: null,
        success: false,
        retryCount: feedbackState.retryCount + 1,
        canRetry: false,
      });

      // Reset animations
      poemFadeAnim.value = 0;
      actionButtonsScale.value = 0;
      progressAnim.value = 0;
      sparkleAnim.value = 0;

      generatePoemMutation.mutate({
        imageUri: params.imageUri,
        poemOptions: {
          style: "modern",
          language: "ko",
          preset: "BALANCED",
          enableFormatting: true,
          onProgress: (update: any) => {
            const progressUpdate = convertToProgressUpdate(update.stage, update.details);
            setFeedbackState((prev) => ({ ...prev, progress: progressUpdate }));
            progressAnim.value = withTiming((update.progress || 0) / 100, { duration: 300 });
          },
        },
      });
    }
  };

  useEffect(() => {
    return () => {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
    };
  }, []);

  // Animated styles
  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  const animatedPoemStyle = useAnimatedStyle(() => ({
    opacity: poemFadeAnim.value,
  }));

  const animatedActionButtonsStyle = useAnimatedStyle(() => ({
    opacity: actionButtonsScale.value,
    transform: [{ scale: actionButtonsScale.value }],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progressAnim.value, [0, 1], [0, 100])}%`,
  }));

  const animatedSuccessStyle = useAnimatedStyle(() => ({
    opacity: successAnim.value,
    transform: [{ scale: interpolate(successAnim.value, [0, 1], [0.8, 1.2]) }],
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const animatedSparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkleAnim.value,
    transform: [
      { scale: interpolate(sparkleAnim.value, [0, 1], [0.5, 1]) },
      { rotate: `${interpolate(sparkleAnim.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  // Dynamic styles based on color scheme
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    poemCard: {
      backgroundColor: colors.card,
      padding: 24,
      borderRadius: 20,
      marginBottom: 16,
      minHeight: 120,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        ios: {
          shadowColor: colorScheme === "dark" ? "#000" : "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: colorScheme === "dark" ? 0.3 : 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: colorScheme === "dark" ? 4 : 2,
        },
      }),
    },
    poemText: {
      fontFamily: AVAILABLE_FONTS.find((f) => f.id === textStyle.fontId)?.fontFamily || 'System',
      fontSize: textStyle.fontSize,
      lineHeight: textStyle.fontSize * textStyle.lineHeight,
      letterSpacing: textStyle.letterSpacing,
      color: textStyle.color,
      fontWeight: textStyle.fontWeight,
      textAlign: textStyle.textAlign,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      gap: 8,
      minHeight: 52,
      ...Platform.select({
        ios: {
          shadowColor: colorScheme === "dark" ? "#000" : colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    secondaryButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    savedButton: {
      backgroundColor: colorScheme === "dark" ? "#065f46" : "#f0f9ff",
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#047857" : "#bfdbfe",
    },
    errorContainer: {
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
      backgroundColor: colors.background,
    },
  });

  if (!params.imageUri) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <StatusBar
          barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />
        <ThemedView style={dynamicStyles.errorContainer}>
          <AlertCircle color={colors.error} size={48} />
          <ThemedText style={[styles.errorTitle, { color: colors.text }]}>
            이미지를 찾을 수 없어요
          </ThemedText>
          <ThemedText style={[styles.errorText, { color: colors.secondaryText }]}>
            다시 시도해주세요.
          </ThemedText>
          <TouchableOpacity
            onPress={() => router.back()}
            style={dynamicStyles.primaryButton}
            accessibilityLabel="뒤로 가기"
            accessibilityHint="이전 화면으로 돌아갑니다">
            <ThemedText style={styles.primaryButtonText}>뒤로 가기</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.header}
          accessibilityLabel="뒤로 가기"
          accessibilityHint="이전 화면으로 돌아갑니다">
          <ChevronLeft color={colors.text} size={24} />
          <ThemedText style={[styles.headerText, { color: colors.text }]}>뒤로</ThemedText>
        </TouchableOpacity>

        {/* Image */}
        <Animated.View style={[styles.imageContainer, animatedContainerStyle]}>
          <Animated.View style={[animatedPulseStyle]}>
            <Image
              source={{ uri: params.imageUri }}
              style={styles.image}
              accessibilityLabel="선택한 사진"
              accessibilityHint="시를 생성하기 위해 선택한 이미지입니다"
            />
          </Animated.View>
          {/* Sparkles effect */}
          {showSparkles && (
            <Animated.View style={[styles.sparkleContainer, animatedSparkleStyle]}>
              <Sparkles color={colors.accent} size={32} />
            </Animated.View>
          )}
        </Animated.View>

        {/* Progress Indicator */}
        {generatePoemMutation.isPending && feedbackState.progress && (
          <ThemedView style={styles.progressContainer}>
            <ThemedView style={[styles.progressBar, { backgroundColor: colors.grey[200] }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary },
                  animatedProgressStyle,
                ]}
              />
            </ThemedView>
            <ThemedText style={[styles.progressText, { color: colors.text }]}>
              {feedbackState.progress.title}
            </ThemedText>
            <ThemedText style={[styles.progressSubtext, { color: colors.secondaryText }]}>
              {feedbackState.progress.message}
            </ThemedText>
          </ThemedView>
        )}

        {/* Loading State */}
        {generatePoemMutation.isPending && !feedbackState.progress && (
          <ThemedView style={dynamicStyles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={[styles.loadingText, { color: colors.secondaryText }]}>
              AI가 시를 만들고 있어요...
            </ThemedText>
          </ThemedView>
        )}

        {/* Error State */}
        {generatePoemMutation.isError && feedbackState.error && (
          <ThemedView style={dynamicStyles.errorContainer}>
            <AlertCircle color={colors.error} size={48} />
            <ThemedText style={[styles.errorTitle, { color: colors.text }]}>
              {feedbackState.error.title}
            </ThemedText>
            <ThemedText style={[styles.errorText, { color: colors.secondaryText }]}>
              {feedbackState.error.message}
            </ThemedText>

            {feedbackState.error.suggestions && feedbackState.error.suggestions.length > 0 && (
              <ThemedView
                style={[
                  styles.suggestionsContainer,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}>
                <ThemedText style={[styles.suggestionsTitle, { color: colors.text }]}>
                  해결 방법:
                </ThemedText>
                {feedbackState.error.suggestions.map((suggestion, index) => (
                  <ThemedText
                    key={index}
                    style={[styles.suggestionText, { color: colors.secondaryText }]}>
                    • {suggestion}
                  </ThemedText>
                ))}
              </ThemedView>
            )}

            <TouchableOpacity
              onPress={handleRetry}
              style={dynamicStyles.primaryButton}
              accessibilityLabel={feedbackState.error.action}>
              <RefreshCw color="white" size={16} />
              <ThemedText style={styles.primaryButtonText}>{feedbackState.error.action}</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}

        {/* Poem Display */}
        {displayedText && (
          <Animated.View style={[styles.poemContainer, animatedPoemStyle]}>
            <ThemedView style={[dynamicStyles.poemCard, { position: 'relative', overflow: 'hidden' }]}>
              {/* Background overlay for text */}
              <View 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: textStyle.backgroundColor || 'rgba(0, 0, 0, 0.5)',
                  opacity: textStyle.opacity,
                }}
              />
              <ThemedText
                style={[dynamicStyles.poemText, { position: 'relative', zIndex: 1 }]}
                accessibilityLabel="생성된 시"
                accessibilityHint="AI가 이미지를 보고 만든 시입니다">
                {displayedText}
              </ThemedText>
              {isAnimating && (
                <Animated.Text
                  style={[
                    styles.cursor,
                    {
                      color: textStyle.color,
                      opacity: withRepeat(withTiming(0, { duration: 500 }), -1, true),
                      position: 'relative',
                      zIndex: 1,
                    },
                  ]}>
                  |
                </Animated.Text>
              )}
            </ThemedView>

            {/* Poem Metadata */}
            {generatePoemMutation.data?.formattedPoem && (
              <ThemedView style={styles.metadataContainer}>
                <ThemedText style={[styles.metadataText, { color: colors.secondaryText }]}>
                  {generatePoemMutation.data.formattedPoem.lines.length}줄 •
                  {generatePoemMutation.data.formattedPoem.metadata.wordCount}단어 • 읽기 시간{" "}
                  {generatePoemMutation.data.formattedPoem.metadata.estimatedReadingTime}초
                </ThemedText>
                {generatePoemMutation.data.formattedPoem.metadata.detectedStyle && (
                  <ThemedText style={[styles.styleText, { color: colors.secondaryText }]}>
                    스타일: {generatePoemMutation.data.formattedPoem.metadata.detectedStyle}
                  </ThemedText>
                )}
              </ThemedView>
            )}
          </Animated.View>
        )}

        {/* Action Buttons */}
        {generatePoemMutation.data?.poem && !isAnimating && (
          <Animated.View style={[styles.actionsContainer, animatedActionButtonsStyle]}>
            <TouchableOpacity
              onPress={() => setShowStyleSelector(true)}
              style={[styles.actionButton, dynamicStyles.secondaryButton]}
              accessibilityLabel="스타일 변경"
              accessibilityHint="폰트와 색상을 변경합니다">
              <Palette color={colors.icon} size={20} />
              <ThemedText style={[styles.secondaryButtonText, { color: colors.text }]}>
                스타일
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCopy}
              style={[styles.actionButton, dynamicStyles.secondaryButton]}
              accessibilityLabel="시 복사하기"
              accessibilityHint="시를 클립보드에 복사합니다">
              <Copy color={colors.icon} size={20} />
              <ThemedText style={[styles.secondaryButtonText, { color: colors.text }]}>
                복사
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.actionButton,
                savedToHistory ? dynamicStyles.savedButton : dynamicStyles.secondaryButton,
              ]}
              accessibilityLabel={savedToHistory ? "저장됨" : "시 저장하기"}
              accessibilityHint={
                savedToHistory ? "이미 히스토리에 저장되었습니다" : "시를 히스토리에 저장합니다"
              }
              disabled={savedToHistory}>
              {savedToHistory ? (
                <CheckCircle color={colors.success} size={20} />
              ) : (
                <Bookmark color={colors.icon} size={20} />
              )}
              <ThemedText
                style={[
                  styles.secondaryButtonText,
                  { color: savedToHistory ? colors.success : colors.text },
                ]}>
                {savedToHistory ? "저장됨" : "저장"}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              style={[styles.actionButton, dynamicStyles.primaryButton]}
              accessibilityLabel="시 공유하기"
              accessibilityHint="시를 다른 앱으로 공유합니다">
              <Share2 color="white" size={20} />
              <ThemedText style={styles.primaryButtonText}>공유</ThemedText>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Retry Button */}
        {generatePoemMutation.data?.poem && !isAnimating && (
          <Animated.View style={[styles.retryContainer, animatedActionButtonsStyle]}>
            <TouchableOpacity
              onPress={handleRetry}
              style={styles.retryButton}
              accessibilityLabel="새로운 시 만들기"
              accessibilityHint="같은 이미지로 다른 스타일의 시를 생성합니다">
              <RefreshCw color={colors.secondaryText} size={16} />
              <ThemedText style={[styles.retryButtonText, { color: colors.secondaryText }]}>
                다른 시 만들기
              </ThemedText>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>

      {/* Success Overlay */}
      <Animated.View
        style={[styles.successOverlay, { backgroundColor: colors.overlay }, animatedSuccessStyle]}
        pointerEvents="none">
        <CheckCircle color={colors.success} size={64} />
        <ThemedText style={[styles.successText, { color: colors.success }]}>저장완료!</ThemedText>
      </Animated.View>

      {/* Style Selector Modal */}
      <StyleSelector
        visible={showStyleSelector}
        onClose={() => setShowStyleSelector(false)}
        currentStyle={textStyle}
        onStyleChange={saveTextStyle}
        previewText={displayedText || '봄바람에 흩날리는\n벚꽃잎처럼\n우리의 마음도\n설레이네'}
      />

      {/* Image Preview Modal */}
      {params.imageUri && generatePoemMutation.data?.poem && (
        <ImagePreviewEnhanced
          visible={showImagePreview}
          onClose={() => setShowImagePreview(false)}
          imageUri={params.imageUri}
          poemText={generatePoemMutation.data.poem}
          textStyle={textStyle}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 10,
  },
  headerText: {
    fontSize: 16,
    marginLeft: 8,
    fontWeight: "500",
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  image: {
    width: imageSize,
    height: imageSize,
    borderRadius: 20,
    resizeMode: "cover",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  sparkleContainer: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 1,
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  progressSubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  suggestionsContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    alignSelf: "stretch",
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  poemContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  cursor: {
    fontSize: 18,
    textAlign: "center",
  },
  metadataContainer: {
    alignItems: "center",
  },
  metadataText: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 4,
  },
  styleText: {
    fontSize: 12,
    textAlign: "center",
  },
  actionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    minWidth: "48%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    minHeight: 48,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  retryContainer: {
    paddingHorizontal: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: "transparent",
    gap: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  successOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  successText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
});
