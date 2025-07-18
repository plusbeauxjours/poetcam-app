import { User } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { DbUser, UpdateUser } from "../types/database";

export interface ProfileData {
  name?: string;
  avatar_url?: string;
  preferences?: {
    language?: string;
    theme?: "light" | "dark" | "system";
    notifications?: {
      email?: boolean;
      push?: boolean;
      locationReminders?: boolean;
    };
    privacy?: {
      profileVisible?: boolean;
      poemsPublic?: boolean;
      showLocation?: boolean;
    };
    poetrySettings?: {
      defaultStyle?: string;
      defaultLanguage?: string;
      autoSave?: boolean;
    };
  };
}

export interface ProfileServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProfileStats {
  totalPoems: number;
  favoritePoems: number;
  publicPoems: number;
  totalLikes: number;
  totalShares: number;
  joinDate: string;
  lastActive: string;
}

class ProfileService {
  private static instance: ProfileService | null = null;

  private constructor() {}

  public static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  /**
   * 현재 사용자의 프로필 정보 가져오기
   */
  public async getProfile(): Promise<ProfileServiceResult<DbUser>> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: "사용자 인증 정보를 찾을 수 없습니다.",
        };
      }

      const { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        // 프로필이 없는 경우 생성
        if (error.code === "PGRST116") {
          const createResult = await this.createProfile(user);
          return createResult;
        }

        return {
          success: false,
          error: this.getErrorMessage(error.message),
        };
      }

      return {
        success: true,
        data: profile,
      };
    } catch (error) {
      console.error("Get profile error:", error);
      return {
        success: false,
        error: "프로필 정보를 가져오는 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 프로필 정보 업데이트
   */
  public async updateProfile(profileData: ProfileData): Promise<ProfileServiceResult<DbUser>> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: "사용자 인증 정보를 찾을 수 없습니다.",
        };
      }

      // 현재 프로필 정보 가져오기
      const currentProfile = await this.getProfile();
      if (!currentProfile.success || !currentProfile.data) {
        return {
          success: false,
          error: "현재 프로필 정보를 가져올 수 없습니다.",
        };
      }

      // preferences 병합
      const updatedPreferences = {
        ...currentProfile.data.preferences,
        ...profileData.preferences,
      };

      const updateData: UpdateUser = {
        name: profileData.name,
        avatar_url: profileData.avatar_url,
        preferences: updatedPreferences,
        updated_at: new Date().toISOString(),
      };

      // undefined 값 제거
      Object.keys(updateData).forEach(
        (key) =>
          updateData[key as keyof UpdateUser] === undefined &&
          delete updateData[key as keyof UpdateUser]
      );

      const { data: updatedProfile, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error.message),
        };
      }

      return {
        success: true,
        data: updatedProfile,
      };
    } catch (error) {
      console.error("Update profile error:", error);
      return {
        success: false,
        error: "프로필 업데이트 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 프로필 통계 정보 가져오기
   */
  public async getProfileStats(): Promise<ProfileServiceResult<ProfileStats>> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: "사용자 인증 정보를 찾을 수 없습니다.",
        };
      }

      // 프로필 기본 정보
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("created_at, total_poems_generated")
        .eq("id", user.id)
        .single();

      if (profileError) {
        return {
          success: false,
          error: this.getErrorMessage(profileError.message),
        };
      }

      // 시 통계 정보
      const { data: poemStats, error: poemError } = await supabase
        .from("poems")
        .select("is_favorite, is_public, like_count, share_count")
        .eq("user_id", user.id);

      if (poemError) {
        console.error("Poem stats error:", poemError);
      }

      const stats: ProfileStats = {
        totalPoems: profile.total_poems_generated || 0,
        favoritePoems: poemStats?.filter((poem) => poem.is_favorite).length || 0,
        publicPoems: poemStats?.filter((poem) => poem.is_public).length || 0,
        totalLikes: poemStats?.reduce((sum, poem) => sum + (poem.like_count || 0), 0) || 0,
        totalShares: poemStats?.reduce((sum, poem) => sum + (poem.share_count || 0), 0) || 0,
        joinDate: profile.created_at,
        lastActive: new Date().toISOString(), // 실제로는 마지막 활동 시간 추적 필요
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error("Get profile stats error:", error);
      return {
        success: false,
        error: "프로필 통계 정보를 가져오는 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 아바타 이미지 업로드
   */
  public async uploadAvatar(
    imageUri: string,
    userId: string
  ): Promise<ProfileServiceResult<string>> {
    try {
      // 이미지를 Blob으로 변환
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // 파일 이름 생성
      const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;

      // Supabase Storage에 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, {
          contentType: blob.type,
          upsert: true,
        });

      if (uploadError) {
        return {
          success: false,
          error: this.getErrorMessage(uploadError.message),
        };
      }

      // 공개 URL 가져오기
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);

      if (!urlData.publicUrl) {
        return {
          success: false,
          error: "업로드된 이미지 URL을 가져올 수 없습니다.",
        };
      }

      return {
        success: true,
        data: urlData.publicUrl,
      };
    } catch (error) {
      console.error("Avatar upload error:", error);
      return {
        success: false,
        error: "아바타 이미지 업로드 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 기존 아바타 이미지 삭제
   */
  public async deleteAvatar(avatarUrl: string): Promise<ProfileServiceResult<void>> {
    try {
      // URL에서 파일 경로 추출
      const url = new URL(avatarUrl);
      const pathParts = url.pathname.split("/");
      const fileName = pathParts[pathParts.length - 1];

      if (!fileName) {
        return {
          success: false,
          error: "유효하지 않은 아바타 URL입니다.",
        };
      }

      const { error } = await supabase.storage.from("avatars").remove([fileName]);

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error.message),
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error("Avatar delete error:", error);
      return {
        success: false,
        error: "아바타 이미지 삭제 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 새로운 프로필 생성 (사용자 등록 시)
   */
  private async createProfile(user: User): Promise<ProfileServiceResult<DbUser>> {
    try {
      const newProfile = {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        preferences: {
          language: "ko",
          theme: "system" as const,
          notifications: {
            email: true,
            push: true,
            locationReminders: true,
          },
          privacy: {
            profileVisible: true,
            poemsPublic: false,
            showLocation: true,
          },
          poetrySettings: {
            defaultStyle: "modern",
            defaultLanguage: "ko",
            autoSave: true,
          },
        },
        subscription_type: "free" as const,
        total_poems_generated: 0,
      };

      const { data: profile, error } = await supabase
        .from("users")
        .insert(newProfile)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error.message),
        };
      }

      return {
        success: true,
        data: profile,
      };
    } catch (error) {
      console.error("Create profile error:", error);
      return {
        success: false,
        error: "프로필 생성 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 프로필 유효성 검사
   */
  public validateProfile(profileData: ProfileData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (profileData.name !== undefined) {
      if (profileData.name.trim().length === 0) {
        errors.push("이름을 입력해주세요.");
      } else if (profileData.name.trim().length > 50) {
        errors.push("이름은 50자 이하로 입력해주세요.");
      }
    }

    if (profileData.avatar_url !== undefined && profileData.avatar_url) {
      try {
        new URL(profileData.avatar_url);
      } catch {
        errors.push("올바른 아바타 URL 형식이 아닙니다.");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 에러 메시지 변환
   */
  private getErrorMessage(error: string): string {
    const errorMessages: { [key: string]: string } = {
      "duplicate key value violates unique constraint": "이미 사용 중인 정보입니다.",
      "value too long": "입력한 값이 너무 깁니다.",
      "invalid input syntax": "올바르지 않은 형식입니다.",
      "permission denied": "권한이 없습니다.",
      "row not found": "정보를 찾을 수 없습니다.",
    };

    for (const [key, message] of Object.entries(errorMessages)) {
      if (error.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }

    return error || "알 수 없는 오류가 발생했습니다.";
  }
}

export default ProfileService.getInstance();
