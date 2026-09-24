import * as Network from "expo-network";

/**
 * Derives the subnet-directed broadcast address (e.g. 192.168.1.255) from
 * the device's own local IP, assuming a standard /24 home network — this is
 * far more reliably routed by iOS than the limited broadcast 255.255.255.255.
 */
export async function getSubnetBroadcastAddress(): Promise<string | null> {
  const ip = await Network.getIpAddressAsync();
  if (!ip) return null;

  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  return `${parts[0]}.${parts[1]}.${parts[2]}.255`;
}
