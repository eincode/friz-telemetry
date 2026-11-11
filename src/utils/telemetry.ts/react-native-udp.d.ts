declare module "react-native-udp" {
  export interface Socket {
    bind(port: number, address?: string, callback?: () => void): void;
    send(
      buffer: Buffer | Uint8Array,
      offset: number,
      length: number,
      port: number,
      address: string,
      callback?: (err?: Error) => void,
    ): void;
    close(callback?: () => void): void;
    setBroadcast(flag: boolean): void;
    on(
      event: "message",
      listener: (
        msg: Buffer,
        rinfo: {
          address: string;
          port: number;
          family: string;
          size: number;
          /** When the native side received the packet, ms since the epoch. */
          ts?: number;
        },
      ) => void,
    ): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "listening", listener: () => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
  }

  interface CreateSocketOptions {
    type: "udp4" | "udp6";
    reusePort?: boolean;
    reuseAddress?: boolean;
  }

  const dgram: {
    createSocket(options: CreateSocketOptions): Socket;
  };

  export default dgram;
}
