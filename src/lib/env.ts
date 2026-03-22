const requiredEnvNames = [
  "DATABASE_URL",
  "SIGNALWIRE_SPACE_URL",
  "SIGNALWIRE_PROJECT_ID",
  "SIGNALWIRE_API_TOKEN",
  "SIGNALWIRE_SIGNING_KEY"
] as const;

export function getRequiredEnv(name: (typeof requiredEnvNames)[number]): string;
export function getRequiredEnv(name: string): string;
export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not set.`);
  }

  return value;
}

export function validateRuntimeEnv(): void {
  for (const name of requiredEnvNames) {
    getRequiredEnv(name);
  }
}
