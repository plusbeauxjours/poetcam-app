import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // 조건에 따라 특정 페이지로
    const timer = setTimeout(() => {
      router.replace("/camera"); // 또는 /login 등
    }, 100); // 빠르게 이동

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text>Hello</Text>
    </View>
  ); // 아무것도 렌더링하지 않음
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "red",
  },
  camera: {
    flex: 1,
  },
});
