import { useAuthStore } from "@/store/useAuthStore";
import { Redirect } from "expo-router";

export default function Index() {
  const user = useAuthStore((s) => s.user);

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
