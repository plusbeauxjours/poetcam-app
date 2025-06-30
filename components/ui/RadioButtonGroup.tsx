import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

interface RadioOption {
  label: string;
  value: string;
}

interface RadioButtonGroupProps {
  options: RadioOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}

export function RadioButtonGroup({ options, selectedValue, onValueChange }: RadioButtonGroupProps) {
  const colorScheme = useColorScheme() ?? "light";
  const iconColor = colorScheme === "dark" ? Colors.grey[200] : Colors.grey[800];
  const selectedIconColor = Colors.primary;

  return (
    <View style={styles.container}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={styles.optionContainer}
          onPress={() => onValueChange(option.value)}>
          <Ionicons
            name={selectedValue === option.value ? "radio-button-on" : "radio-button-off"}
            size={24}
            color={selectedValue === option.value ? selectedIconColor : iconColor}
          />
          <ThemedText style={styles.label}>{option.label}</ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  optionContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  label: {
    marginLeft: 12,
    fontSize: 16,
  },
});
