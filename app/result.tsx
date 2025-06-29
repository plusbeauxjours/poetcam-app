import { Colors } from "@/constants/Colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Image, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResultScreen() {
  const params = useLocalSearchParams<{ imageUri: string }>();
  const router = useRouter();

  if (!params.imageUri) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Image not found. Please try again.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.header}>
        <ChevronLeft color={Colors.grey[900]} size={30} />
        <Text style={styles.headerText}>Back</Text>
      </TouchableOpacity>
      <Image source={{ uri: params.imageUri }} style={styles.image} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  image: {
    flex: 1,
    width: "100%",
    resizeMode: "contain",
  },
  header: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 20,
  },
  headerText: {
    color: Colors.grey[900],
    fontSize: 16,
    marginLeft: 5,
  },
  errorText: {
    color: "red",
    fontSize: 18,
    textAlign: "center",
    marginTop: "50%",
  },
  backButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: Colors.grey[200],
    borderRadius: 5,
    alignSelf: "center",
  },
  buttonText: {
    color: Colors.grey[900],
  },
});
