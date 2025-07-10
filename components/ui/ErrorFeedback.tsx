import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { USER_ERROR_MESSAGES } from "@/constants/api";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  AlertCircle,
  AlignLeft,
  Brain,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  Clock,
  Edit3,
  FileImage,
  Image,
  LucideIcon,
  PlayCircle,
  RefreshCw,
  Server,
  Settings,
  WifiOff,
  ZoomIn,
  ZoomOut,
} from "lucide-react-native";
import React from "react";
import { Alert, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

const { width } = Dimensions.get("window");

// Icon mapping for different error types
const iconMap: Record<string, LucideIcon> = {
  camera: Camera,
  "refresh-cw": RefreshCw,
  server: Server,
  clock: Clock,
  settings: Settings,
  "wifi-off": WifiOff,
  calendar: Calendar,
  image: Image,
  "zoom-in": ZoomIn,
  "zoom-out": ZoomOut,
  "file-image": FileImage,
  "alert-circle": AlertCircle,
  brain: Brain,
  "check-circle": CheckCircle,
  "play-circle": PlayCircle,
  "edit-3": Edit3,
  "align-left": AlignLeft,
  check: Check,
};

type ErrorType = keyof typeof USER_ERROR_MESSAGES.api | keyof typeof USER_ERROR_MESSAGES.image;

interface ErrorFeedbackProps {
  errorType: ErrorType;
  category: "api" | "image";
  onRetry?: () => void;
  onAlternativeAction?: () => void;
  customMessage?: string;
  showSuggestions?: boolean;
}

export function ErrorFeedback({
  errorType,
  category,
  onRetry,
  onAlternativeAction,
  customMessage,
  showSuggestions = true,
}: ErrorFeedbackProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const errorConfig =
    USER_ERROR_MESSAGES[category][errorType as keyof (typeof USER_ERROR_MESSAGES)[typeof category]];
  const IconComponent = iconMap[errorConfig.icon];

  const handleActionPress = () => {
    if (onAlternativeAction) {
      onAlternativeAction();
    } else if (onRetry) {
      onRetry();
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    Alert.alert("도움말", suggestion, [{ text: "확인" }]);
  };

  const styles = createStyles(isDark);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Error Icon and Title */}
        <View style={styles.headerContainer}>
          <View style={styles.iconContainer}>
            <IconComponent size={48} color={Colors.error} />
          </View>
          <ThemedText type="title" style={styles.title}>
            {errorConfig.title}
          </ThemedText>
          <ThemedText style={styles.message}>{customMessage || errorConfig.message}</ThemedText>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleActionPress}
          activeOpacity={0.8}>
          <ThemedText style={styles.actionButtonText}>{errorConfig.action}</ThemedText>
        </TouchableOpacity>

        {/* Suggestions */}
        {showSuggestions && errorConfig.suggestions && errorConfig.suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <ThemedText type="subtitle" style={styles.suggestionsTitle}>
              💡 해결 방법
            </ThemedText>
            {errorConfig.suggestions.map((suggestion: string, index: number) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(suggestion)}
                activeOpacity={0.7}>
                <View style={styles.suggestionBullet} />
                <ThemedText style={styles.suggestionText}>{suggestion}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Additional Actions */}
        {onRetry && onAlternativeAction && (
          <View style={styles.additionalActionsContainer}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onRetry} activeOpacity={0.8}>
              <RefreshCw size={16} color={isDark ? Colors.grey[300] : Colors.grey[700]} />
              <ThemedText style={styles.secondaryButtonText}>다시 시도</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      maxHeight: "80%",
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingVertical: 20,
      alignItems: "center",
    },
    headerContainer: {
      alignItems: "center",
      marginBottom: 30,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDark ? Colors.error + "20" : Colors.error + "10",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? Colors.error + "40" : Colors.error + "30",
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 12,
      color: isDark ? Colors.grey[100] : Colors.grey[900],
    },
    message: {
      fontSize: 16,
      textAlign: "center",
      lineHeight: 24,
      color: isDark ? Colors.grey[300] : Colors.grey[600],
      maxWidth: width - 80,
    },
    actionButton: {
      backgroundColor: Colors.primary,
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
      minWidth: 200,
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    actionButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
    suggestionsContainer: {
      width: "100%",
      backgroundColor: isDark ? Colors.grey[900] : Colors.grey[100],
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: isDark ? Colors.grey[800] : Colors.grey[200],
    },
    suggestionsTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 16,
      color: isDark ? Colors.grey[100] : Colors.grey[900],
    },
    suggestionItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
      paddingVertical: 4,
    },
    suggestionBullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: Colors.primary,
      marginTop: 7,
      marginRight: 12,
      flexShrink: 0,
    },
    suggestionText: {
      fontSize: 15,
      lineHeight: 22,
      color: isDark ? Colors.grey[300] : Colors.grey[600],
      flex: 1,
    },
    additionalActionsContainer: {
      width: "100%",
      alignItems: "center",
    },
    secondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: isDark ? Colors.grey[600] : Colors.grey[400],
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      gap: 8,
    },
    secondaryButtonText: {
      fontSize: 14,
      fontWeight: "500",
      color: isDark ? Colors.grey[300] : Colors.grey[700],
    },
  });

export default ErrorFeedback;
