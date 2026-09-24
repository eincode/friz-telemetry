import { type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";

export function SecondaryButton({
  text,
  onPress,
  subtitle,
  children,
  containerStyle,
}: {
  text: string;
  onPress: () => void;
  subtitle?: string;
  children?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondary,
        containerStyle,
        pressed && { borderColor: Colors.borderPressed },
      ]}
    >
      {children}
      <ThemedText type="label" style={styles.secondaryLabel}>
        {text}
      </ThemedText>
      {subtitle ? (
        <ThemedText type="data" style={styles.secondaryMeta}>
          {subtitle}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  secondaryLabel: {
    fontSize: 15,
    letterSpacing: 2.4,
    color: Colors.textSecondary,
  },
  secondaryMeta: {
    fontSize: 11,
    letterSpacing: 1.1,
    color: Colors.textFaint,
  },
});
