// Configuration Management
// Reference: sub2api backend/internal/config/config.go
// Centralized configuration with environment variable support and validation

import path from "node:path";
import os from "node:os";

/**
 * Application configuration structure
 * Based on sub2api's Config struct design
 */
export const AppConfig = {
  // Server configuration
  server: {
    host: getEnvString("SERVER_HOST", "0.0.0.0"),
    port: getEnvInt("PORT", 20128),
    mode: getEnvString("NODE_ENV", "production")
  },

  // Database configuration (localDb)
  database: {
    dataDir: getEnvString("DATA_DIR", getDefaultDataDir()),
    dbFile: "db.json",
    maxConnections: getEnvInt("DB_MAX_CONNECTIONS", 50)
  },

  // Usage tracking configuration
  usage: {
    enabled: getEnvBool("USAGE_TRACKING_ENABLED", true),
    maxRecords: getEnvInt("USAGE_MAX_RECORDS", 10000),
    flushIntervalMs: getEnvInt("USAGE_FLUSH_INTERVAL_MS", 5000),
    maxJsonSize: getEnvInt("USAGE_MAX_JSON_SIZE", 1024) // KB
  },

  // Authentication configuration
  auth: {
    jwtSecret: getEnvString("JWT_SECRET", ""),
    initialPassword: getEnvString("INITIAL_PASSWORD", "123456"),
    requireApiKey: getEnvBool("REQUIRE_API_KEY", false),
    sessionTtl: getEnvInt("SESSION_TTL", 3600000), // 1 hour in ms
    maxSessions: getEnvInt("SESSION_MAX_CACHE", 1000)
  },

  // Fallback configuration
  fallback: {
    strategy: getEnvString("FALLBACK_STRATEGY", "fill-first"), // "fill-first" | "round-robin"
    stickyRoundRobinLimit: getEnvInt("STICKY_ROUND_ROBIN_LIMIT", 3),
    tempUnscheduleDurationMs: getEnvInt("TEMP_UNSCHEDULE_DURATION_MS", 60000), // 1 minute
    maxRetryAttempts: getEnvInt("MAX_RETRY_ATTEMPTS", 3)
  },

  // Proxy configuration
  proxy: {
    httpProxy: getEnvString("HTTP_PROXY", ""),
    httpsProxy: getEnvString("HTTPS_PROXY", ""),
    allProxy: getEnvString("ALL_PROXY", ""),
    socksProxy: getEnvString("SOCKS_PROXY", ""),
    noProxy: getEnvString("NO_PROXY", ""),
    cacheTtl: getEnvInt("PROXY_CACHE_TTL", 60000), // 1 minute
    testTimeoutMs: getEnvInt("PROXY_TEST_TIMEOUT", 10000)
  },

  // Logging configuration
  logging: {
    level: getEnvString("LOG_LEVEL", "info"), // "debug" | "info" | "warn" | "error"
    enableRequestLogs: getEnvBool("ENABLE_REQUEST_LOGS", false),
    maxLogFiles: getEnvInt("MAX_LOG_FILES", 10)
  },

  // Cloud sync configuration
  cloud: {
    baseUrl: getEnvString("CLOUD_URL", ""),
    enabled: getEnvBool("CLOUD_SYNC_ENABLED", false),
    syncIntervalMs: getEnvInt("CLOUD_SYNC_INTERVAL_MS", 60000), // 1 minute
    maxRetries: getEnvInt("CLOUD_MAX_RETRIES", 3)
  },

  // API Key configuration
  apiKeys: {
    secret: getEnvString("API_KEY_SECRET", ""),
    requireAuth: getEnvBool("REQUIRE_API_KEY", false)
  },

  // Observability configuration
  observability: {
    maxRecords: getEnvInt("OBSERVABILITY_MAX_RECORDS", 1000),
    batchSize: getEnvInt("OBSERVABILITY_BATCH_SIZE", 20),
    flushIntervalMs: getEnvInt("OBSERVABILITY_FLUSH_INTERVAL_MS", 5000),
    maxJsonSize: getEnvInt("OBSERVABILITY_MAX_JSON_SIZE", 1024) // KB
  },

  // Language and locale
  i18n: {
    defaultLanguage: getEnvString("DEFAULT_LANGUAGE", "en"),
    supportedLanguages: ["en", "zh-CN", "zh-TW", "ja", "ko"]
  }
};

/**
 * Get default data directory based on platform
 * Matches sub2api's GetDataDir() logic
 */
function getDefaultDataDir() {
  // Check DATA_DIR environment variable first (highest priority)
  if (process.env.DATA_DIR) {
    return process.env.DATA_DIR;
  }

  // Check Docker data directory
  const dockerDataDir = "/app/data";
  try {
    const fs = require("node:fs");
    if (fs.existsSync(dockerDataDir)) {
      // Test write access
      const testFile = path.join(dockerDataDir, ".write_test");
      try {
        fs.writeFileSync(testFile, "test");
        fs.unlinkSync(testFile);
        return dockerDataDir;
      } catch {
        // Not writable, fall through
      }
    }
  } catch {
    // Fall through
  }

  // Default: user home directory
  const homeDir = os.homedir();
  // Use a stable dot directory on all platforms.
  return path.join(homeDir, ".9router");
}

/**
 * Get string environment variable with default value
 * @param {string} key - Environment variable name
 * @param {string} defaultValue - Default value if not set
 * @returns {string} Environment value or default
 */
export function getEnvString(key, defaultValue = "") {
  const value = process.env[key];
  return value !== undefined && value !== "" ? value : defaultValue;
}

/**
 * Get integer environment variable with default value
 * @param {string} key - Environment variable name
 * @param {number} defaultValue - Default value if not set
 * @returns {number} Parsed integer value or default
 */
export function getEnvInt(key, defaultValue = 0) {
  const value = process.env[key];
  if (value === undefined || value === "") return defaultValue;

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get boolean environment variable with default value
 * @param {string} key - Environment variable name
 * @param {boolean} defaultValue - Default value if not set
 * @returns {boolean} Parsed boolean value or default
 */
export function getEnvBool(key, defaultValue = false) {
  const value = process.env[key];
  if (value === undefined || value === "") return defaultValue;

  // Accept: true, 1, yes, on
  const truthy = ["true", "1", "yes", "on"].includes(value.toLowerCase());
  return truthy;
}

/**
 * Validate configuration
 * Based on sub2api's Validate() method
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateConfig(config = AppConfig) {
  const errors = [];

  // Server configuration validation
  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push("server.port must be between 1 and 65535");
  }

  // Database validation
  if (config.database.maxConnections < 1) {
    errors.push("database.maxConnections must be positive");
  }

  // Auth validation - JWT secret warning
  if (config.auth.jwtSecret === "" && config.server.mode === "production") {
    console.warn("⚠️  JWT_SECRET is not set in production mode. Using auto-generated secret.");
  }

  // Fallback strategy validation
  const validStrategies = ["fill-first", "round-robin"];
  if (!validStrategies.includes(config.fallback.strategy)) {
    errors.push(`fallback.strategy must be one of: ${validStrategies.join(", ")}`);
  }

  // Session TTL validation
  if (config.auth.sessionTtl < 60000) { // Minimum 1 minute
    errors.push("auth.sessionTtl must be at least 60000 (1 minute)");
  }

  // Usage tracking validation
  if (config.usage.maxRecords < 1) {
    errors.push("usage.maxRecords must be positive");
  }

  // Log level validation
  const validLogLevels = ["debug", "info", "warn", "error"];
  if (!validLogLevels.includes(config.logging.level)) {
    errors.push(`logging.level must be one of: ${validLogLevels.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get configuration summary for display
 * @param {object} config - Configuration object
 * @returns {string} Formatted configuration summary
 */
export function getConfigSummary(config = AppConfig) {
  return `
Configuration Summary:
====================
Server: ${config.server.host}:${config.server.port} (${config.server.mode})
Data Directory: ${config.database.dataDir}
Fallback Strategy: ${config.fallback.strategy}
Sticky Round Robin Limit: ${config.fallback.stickyRoundRobinLimit}
Session TTL: ${config.auth.sessionTtl}ms (${Math.round(config.auth.sessionTtl / 60000)} minutes)
Temp Unschedule Duration: ${config.fallback.tempUnscheduleDurationMs}ms
Proxy Cache TTL: ${config.proxy.cacheTtl}ms
Log Level: ${config.logging.level}
Usage Tracking: ${config.usage.enabled ? "Enabled" : "Disabled"}
Cloud Sync: ${config.cloud.enabled ? `Enabled (${config.cloud.baseUrl})` : "Disabled"}
====================
  `.trim();
}

/**
 * Print environment variable help
 */
export function printEnvHelp() {
  console.log(`
Environment Variables:
====================
Server:
  SERVER_HOST          Server host (default: 0.0.0.0)
  PORT                 Server port (default: 20128)
  NODE_ENV             Environment: development/production (default: production)

Database:
  DATA_DIR              Data directory path (auto-detected if not set)
  DB_MAX_CONNECTIONS    Max database connections (default: 50)

Authentication:
  JWT_SECRET            JWT signing secret (auto-generated if not set)
  INITIAL_PASSWORD       Initial admin password (default: 123456)
  REQUIRE_API_KEY        Require API key for /v1 endpoints (default: false)
  SESSION_TTL            Sticky session TTL in ms (default: 3600000 = 1 hour)
  SESSION_MAX_CACHE       Max sessions in cache (default: 1000)

Fallback:
  FALLBACK_STRATEGY      Account selection: fill-first/round-robin (default: fill-first)
  STICKY_ROUND_ROBIN_LIMIT  Max requests before switching (default: 3)
  TEMP_UNSCHEDULE_DURATION_MS  Temp unschedule duration (default: 60000 = 1 min)
  MAX_RETRY_ATTEMPTS     Max retry attempts on same account (default: 3)

Proxy:
  HTTP_PROXY            HTTP proxy URL
  HTTPS_PROXY           HTTPS proxy URL
  ALL_PROXY             Global proxy URL
  SOCKS_PROXY           SOCKS proxy URL (socks4:// or socks5://)
  NO_PROXY              Comma-separated bypass list
  PROXY_CACHE_TTL       Proxy cache TTL in ms (default: 60000 = 1 min)
  PROXY_TEST_TIMEOUT    Proxy test timeout in ms (default: 10000)

Logging:
  LOG_LEVEL             Log level: debug/info/warn/error (default: info)
  ENABLE_REQUEST_LOGS   Enable detailed request logging (default: false)
  MAX_LOG_FILES         Maximum log files to keep (default: 10)

Cloud Sync:
  CLOUD_URL             Cloud sync base URL
  CLOUD_SYNC_ENABLED    Enable cloud sync (default: false)
  CLOUD_SYNC_INTERVAL_MS Sync interval in ms (default: 60000 = 1 min)

Usage:
  USAGE_TRACKING_ENABLED    Enable usage tracking (default: true)
  USAGE_MAX_RECORDS        Max usage records (default: 10000)
  USAGE_FLUSH_INTERVAL_MS    Flush interval in ms (default: 5000)

Observability:
  OBSERVABILITY_MAX_RECORDS     Max observability records (default: 1000)
  OBSERVABILITY_BATCH_SIZE       Batch size for uploads (default: 20)
  OBSERVABILITY_FLUSH_INTERVAL_MS Flush interval in ms (default: 5000)

API Keys:
  API_KEY_SECRET       HMAC secret for generated API keys

Language:
  DEFAULT_LANGUAGE      Default language (default: en)
====================
  `.trim());
}

// Export default config
export default AppConfig;
