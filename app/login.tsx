import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { Text, View } from "react-native";

export default function LoginScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "bold", marginBottom: 16 }}>PoetCam</Text>
      <GoogleLoginButton
        onSuccess={() => {
          // 로그인 성공 후 라우팅 등 처리
        }}
        onError={(error) => {
          // 에러 메시지 표시 등 처리
        }}
      />
    </View>
  );
}
