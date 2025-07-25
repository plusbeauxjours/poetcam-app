import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  View,
  Text,
  SafeAreaView,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  AVAILABLE_FONTS,
  COLOR_PRESETS,
  FONT_SIZES,
  TextStyle,
  DEFAULT_TEXT_STYLE,
} from '@/constants/fonts';
import { X, Check, Type, Palette, AlignCenter } from 'lucide-react-native';
import Slider from '@react-native-community/slider';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

interface StyleSelectorProps {
  visible: boolean;
  onClose: () => void;
  currentStyle: TextStyle;
  onStyleChange: (style: TextStyle) => void;
  previewText?: string;
}

export function StyleSelector({
  visible,
  onClose,
  currentStyle,
  onStyleChange,
  previewText = '봄바람에 흩날리는\n벚꽃잎처럼\n우리의 마음도\n설레이네',
}: StyleSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [activeTab, setActiveTab] = useState<'font' | 'color' | 'size'>('font');
  const [tempStyle, setTempStyle] = useState<TextStyle>(currentStyle);

  useEffect(() => {
    setTempStyle(currentStyle);
  }, [currentStyle]);

  const handleApply = () => {
    onStyleChange(tempStyle);
    onClose();
  };

  const handleReset = () => {
    setTempStyle(DEFAULT_TEXT_STYLE);
  };

  const renderFontTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {AVAILABLE_FONTS.map((font) => (
        <TouchableOpacity
          key={font.id}
          style={[
            styles.fontOption,
            { 
              backgroundColor: colors.surface,
              borderColor: tempStyle.fontId === font.id ? colors.primary : colors.border,
              borderWidth: tempStyle.fontId === font.id ? 2 : 1,
            },
          ]}
          onPress={() => setTempStyle({ ...tempStyle, fontId: font.id })}
        >
          <View style={styles.fontOptionContent}>
            <Text
              style={[
                styles.fontSample,
                {
                  fontFamily: font.fontFamily,
                  color: colors.text,
                },
              ]}
            >
              {font.sample}
            </Text>
            <ThemedText style={styles.fontName}>{font.displayName}</ThemedText>
          </View>
          {tempStyle.fontId === font.id && (
            <Check color={colors.primary} size={20} />
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderColorTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <ThemedText style={styles.sectionTitle}>텍스트 색상</ThemedText>
      <View style={styles.colorGrid}>
        {COLOR_PRESETS.map((color) => (
          <TouchableOpacity
            key={color.id}
            style={[
              styles.colorOption,
              {
                backgroundColor: color.value,
                borderColor: tempStyle.color === color.value ? colors.primary : colors.border,
                borderWidth: tempStyle.color === color.value ? 3 : 1,
              },
            ]}
            onPress={() => setTempStyle({ ...tempStyle, color: color.value })}
          >
            {tempStyle.color === color.value && (
              <Check color={color.value === '#FFFFFF' ? '#000' : '#FFF'} size={16} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ThemedText style={[styles.sectionTitle, { marginTop: 24 }]}>배경 투명도</ThemedText>
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={tempStyle.opacity}
          onValueChange={(value) => setTempStyle({ ...tempStyle, opacity: value })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.grey[300]}
          thumbTintColor={colors.primary}
        />
        <ThemedText style={styles.sliderValue}>
          {Math.round(tempStyle.opacity * 100)}%
        </ThemedText>
      </View>
    </ScrollView>
  );

  const renderSizeTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <ThemedText style={styles.sectionTitle}>글자 크기</ThemedText>
      {FONT_SIZES.map((size) => (
        <TouchableOpacity
          key={size.value}
          style={[
            styles.sizeOption,
            {
              backgroundColor: colors.surface,
              borderColor: tempStyle.fontSize === size.value ? colors.primary : colors.border,
              borderWidth: tempStyle.fontSize === size.value ? 2 : 1,
            },
          ]}
          onPress={() => setTempStyle({ ...tempStyle, fontSize: size.value })}
        >
          <ThemedText style={{ fontSize: size.value }}>{size.label}</ThemedText>
          {tempStyle.fontSize === size.value && (
            <Check color={colors.primary} size={20} />
          )}
        </TouchableOpacity>
      ))}

      <ThemedText style={[styles.sectionTitle, { marginTop: 24 }]}>정렬</ThemedText>
      <View style={styles.alignmentOptions}>
        {(['left', 'center', 'right'] as const).map((align) => (
          <TouchableOpacity
            key={align}
            style={[
              styles.alignOption,
              {
                backgroundColor:
                  tempStyle.textAlign === align ? colors.primary : colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setTempStyle({ ...tempStyle, textAlign: align })}
          >
            <AlignCenter
              color={tempStyle.textAlign === align ? '#FFF' : colors.text}
              size={20}
            />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    previewContainer: {
      padding: 20,
      backgroundColor: colors.surface,
      borderRadius: 12,
      margin: 16,
      minHeight: 120,
      justifyContent: 'center',
      alignItems: tempStyle.textAlign,
    },
    previewText: {
      fontFamily: AVAILABLE_FONTS.find((f) => f.id === tempStyle.fontId)?.fontFamily || 'System',
      fontSize: tempStyle.fontSize,
      color: tempStyle.color,
      lineHeight: tempStyle.fontSize * tempStyle.lineHeight,
      letterSpacing: tempStyle.letterSpacing,
      textAlign: tempStyle.textAlign,
      fontWeight: tempStyle.fontWeight,
    },
    previewBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: tempStyle.backgroundColor || 'rgba(0, 0, 0, 0.5)',
      opacity: tempStyle.opacity,
      borderRadius: 12,
    },
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <X color={colors.text} size={24} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>스타일 설정</ThemedText>
          <TouchableOpacity onPress={handleReset}>
            <ThemedText style={{ color: colors.primary }}>초기화</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={dynamicStyles.previewContainer}>
          <View style={dynamicStyles.previewBackground} />
          <Text style={dynamicStyles.previewText}>{previewText}</Text>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'font' && { borderBottomColor: colors.primary },
            ]}
            onPress={() => setActiveTab('font')}
          >
            <Type color={activeTab === 'font' ? colors.primary : colors.secondaryText} size={20} />
            <ThemedText
              style={[
                styles.tabText,
                { color: activeTab === 'font' ? colors.primary : colors.secondaryText },
              ]}
            >
              폰트
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'color' && { borderBottomColor: colors.primary },
            ]}
            onPress={() => setActiveTab('color')}
          >
            <Palette
              color={activeTab === 'color' ? colors.primary : colors.secondaryText}
              size={20}
            />
            <ThemedText
              style={[
                styles.tabText,
                { color: activeTab === 'color' ? colors.primary : colors.secondaryText },
              ]}
            >
              색상
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'size' && { borderBottomColor: colors.primary },
            ]}
            onPress={() => setActiveTab('size')}
          >
            <Type color={activeTab === 'size' ? colors.primary : colors.secondaryText} size={20} />
            <ThemedText
              style={[
                styles.tabText,
                { color: activeTab === 'size' ? colors.primary : colors.secondaryText },
              ]}
            >
              크기
            </ThemedText>
          </TouchableOpacity>
        </View>

        {activeTab === 'font' && renderFontTab()}
        {activeTab === 'color' && renderColorTab()}
        {activeTab === 'size' && renderSizeTab()}

        <TouchableOpacity
          style={[styles.applyButton, { backgroundColor: colors.primary }]}
          onPress={handleApply}
        >
          <ThemedText style={styles.applyButtonText}>적용하기</ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  fontOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  fontOptionContent: {
    flex: 1,
  },
  fontSample: {
    fontSize: 18,
    marginBottom: 4,
  },
  fontName: {
    fontSize: 14,
    opacity: 0.7,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: isTablet ? 60 : 50,
    height: isTablet ? 60 : 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderContainer: {
    paddingHorizontal: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValue: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: -8,
  },
  sizeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  alignmentOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  alignOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  applyButton: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});