import { ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Driver, DriverCard } from "@/components/ui/driver-card";
import { Colors } from "@/constants/theme";

export function DriverSelection({
  drivers,
  selectedId,
  onSelect,
  total,
  disabled = false,
}: {
  drivers: Driver[];
  selectedId: string | null;
  onSelect: (driver: Driver) => void;
  total: number;
  disabled?: boolean;
}) {
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollGrid}
        /* Landscape gives width, not height: page through cards sideways. */
      >
        {drivers.map((d, index) => (
          <View key={d.id} style={styles.scrollCell}>
            <DriverCard
              fullName={d.fullName}
              gamerId={d.gamerId}
              hasJoinedSession={d.hasJoinedSession}
              index={index}
              selected={selectedId === d.id}
              disabled={disabled}
              onPress={() => onSelect(d)}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.pagerRow}>
        <ThemedText style={styles.microLabel}>
          SWIPE FOR MORE · {total} REGISTERED DRIVERS
        </ThemedText>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollGrid: { gap: 14, paddingRight: 2 },
  scrollCell: { width: 196 },
  pagerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  microLabel: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 10,
    letterSpacing: 1.8,
    color: Colors.textFaint,
  },
  row5: { flexDirection: "row", gap: 5 },
});
