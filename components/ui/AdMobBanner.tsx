import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { AdMobBanner } from "expo-ads-admob";
import { View, ViewStyle } from "react-native";

interface Props {
  adUnitID: string;
  style?: ViewStyle;
}

export function AdMobBannerComponent({ adUnitID, style }: Props) {
  const hasAdFree = useSubscriptionStore((s) => s.hasFeature("adFree"));
  if (hasAdFree) return null;
  return (
    <View style={style}>
      <AdMobBanner
        bannerSize="smartBannerPortrait"
        adUnitID={adUnitID}
        servePersonalizedAds
        onDidFailToReceiveAdWithError={(err: any) => {
          console.warn("AdMob banner error", err);
        }}
      />
    </View>
  );
}
