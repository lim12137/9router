import initializeCloudSync from "@/shared/services/initializeCloudSync";

// Initialize cloud sync when this module is imported
let initialized = false;
let initPromise = null;

export async function ensureCloudSyncInitialized() {
  // Prevent multiple concurrent initialization attempts
  if (initPromise) {
    return initPromise;
  }

  if (!initialized) {
    initPromise = (async () => {
      try {
        await initializeCloudSync();
        initialized = true;
        return true;
      } catch (error) {
        console.error("[ServerInit] Error initializing cloud sync:", error);
        return false;
      } finally {
        initPromise = null;
      }
    })();
    return initPromise;
  }
  return initialized;
}

// Only auto-initialize in production runtime, not during build
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PHASE) {
  ensureCloudSyncInitialized().catch(console.log);
}

export default ensureCloudSyncInitialized;

