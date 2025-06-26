// import { Stack } from "expo-router";
// import { GestureHandlerRootView } from "react-native-gesture-handler";

// export default function RootLayout() {
//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <Stack>
//         <Stack.Screen name="splash" options={{ headerShown: false }} />
//         <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
//         <Stack.Screen name="camera" options={{ presentation: "modal", headerShown: false }} />
//         <Stack.Screen name="result" options={{ presentation: "modal" }} />
//       </Stack>
//     </GestureHandlerRootView>
//   );
// }
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync(); // 자동으로 사라지지 않게

export default function Layout() {
  useEffect(() => {
    const prepare = async () => {
      // 초기화 작업들
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await SplashScreen.hideAsync(); // 완료 후 스플래시 숨김
    };

    prepare();
  }, []);

  return <Slot />; // 각 페이지로 라우팅
}
