import { Client } from "@heroiclabs/nakama-js";

const serverKey = process.env.NEXT_PUBLIC_NAKAMA_SERVER_KEY ?? "defaultkey";
const host = process.env.NEXT_PUBLIC_NAKAMA_HOST ?? "127.0.0.1";
const port = process.env.NEXT_PUBLIC_NAKAMA_PORT ?? "7350";
const useSSL = process.env.NEXT_PUBLIC_NAKAMA_USE_SSL === "true";

export const nakamaConfig = {
  serverKey,
  host,
  port,
  useSSL,
};

export function createNakamaClient() {
  return new Client(serverKey, host, port, useSSL);
}
