import * as Sharing from "expo-sharing";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "../supabase";

export interface OverlayOptions {
  fontName?: string;
  fontSize?: number;
  color?: string;
  position?: { x: number; y: number };
}

export async function addTextOverlay(
  imageUri: string,
  text: string,
  options: OverlayOptions = {}
): Promise<string> {
  try {
    // Resize image for consistent output
    const manipulated = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1000 } }],
      { format: ImageManipulator.SaveFormat.JPEG }
    );

    // Placeholder: Text overlay would require a canvas or native module.
    // In production, draw the text onto the image using a library like
    // react-native-canvas or a custom native module.
    return manipulated.uri;
  } catch (error) {
    console.error("Failed to add text overlay:", error);
    return imageUri;
  }
}

export async function shareToSocial(
  imageUri: string,
  poemText: string,
  poemId?: string
): Promise<boolean> {
  try {
    const overlayUri = await addTextOverlay(imageUri, poemText);
    const available = await Sharing.isAvailableAsync();

    if (available) {
      await Sharing.shareAsync(overlayUri, {
        mimeType: "image/jpeg",
        dialogTitle: "포엠캠에서 생성된 시 공유하기",
      });
      if (poemId) {
        updateSharedStatus(poemId, true).catch(console.error);
      }
      return true;
    }

    console.log("공유 기능을 사용할 수 없습니다.");
    return false;
  } catch (error) {
    console.error("공유 오류:", error);
    return false;
  }
}

export async function updateSharedStatus(
  poemId: string,
  increment = true
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("poems")
      .select("share_count")
      .eq("id", poemId)
      .single();
    if (!error && data) {
      const newCount = (data.share_count || 0) + (increment ? 1 : 0);
      await supabase.from("poems").update({ share_count: newCount }).eq("id", poemId);
    }
  } catch (err) {
    console.error("Failed to update share status:", err);
  }
}

export function generateShareLink(poemId: string): string {
  return `${"https://your-production-backend.com"}/poem/${poemId}`;
}
