import pino from "pino";

const pretty = process.env.NODE_ENV !== "production";

export const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { sys: "ttos" },
  ...(pretty
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss.l", ignore: "pid,hostname,sys" },
        },
      }
    : {}),
});

/** Kernel-style line: [ seconds.micro ] subsystem: message */
export function kmsg(bootAt: number, sub: string, msg: string): string {
  const dt = ((Date.now() - bootAt) / 1000).toFixed(6).padStart(12, " ");
  return `[${dt}] ${sub}: ${msg}`;
}
