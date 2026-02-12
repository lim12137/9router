/**
 * Resolve the current user's home directory from environment variables.
 * Using env values avoids hard-coding machine-specific absolute paths during build tracing.
 */
export function getUserHomeDir() {
  const windowsHomeKey = `USER${"PROFILE"}`;
  const homeDir = process.env.HOME || process.env[windowsHomeKey];

  if (!homeDir) {
    throw new Error("Unable to resolve user home directory from HOME/USERPROFILE");
  }

  return homeDir;
}
