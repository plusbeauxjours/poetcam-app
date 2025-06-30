import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { RadioButtonGroup } from "@/components/ui/RadioButtonGroup";
import { useState } from "react";
import { StyleSheet } from "react-native";

const languageOptions = [
  { label: "English", value: "en" },
  { label: "Korean", value: "ko" },
  { label: "Spanish", value: "es" },
];

export default function LanguageScreen() {
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Language</ThemedText>
      <ThemedView style={styles.separator} />
      <RadioButtonGroup
        options={languageOptions}
        selectedValue={selectedLanguage}
        onValueChange={setSelectedLanguage}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  separator: {
    height: 1,
    width: "100%",
    backgroundColor: "#ccc",
    marginVertical: 16,
  },
});
