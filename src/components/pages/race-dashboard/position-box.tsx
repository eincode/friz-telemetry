import { Box } from "@/components/pages/race-dashboard/box";
import { BigValue } from "@/components/pages/race-dashboard/big-value";

export function PositionBox({
  currentPos,
  totalPlayers,
}: {
  currentPos: number;
  totalPlayers: number;
}) {
  return (
    <Box hue="position" label="POSITION" style={{ flex: 1 }}>
      <BigValue value={String(currentPos)} of={String(totalPlayers)} />
    </Box>
  );
}
