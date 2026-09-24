import { Box } from "@/components/pages/race-dashboard/box";
import { BigValue } from "@/components/pages/race-dashboard/big-value";

export function LapBox({
  currentLap,
  totalLap,
}: {
  currentLap: number;
  totalLap: number;
}) {
  return (
    <Box hue="lap" label="LAP" style={{ flex: 1 }}>
      <BigValue value={String(currentLap)} of={String(totalLap)} />
    </Box>
  );
}
