/**
 * Configuration management with hot-reload support
 */

import fs from 'fs/promises';
import path from 'path';
import { ConfigFile } from '../types/index.js';

const DEFAULT_CONFIG: ConfigFile = {
  wcagLevel: 'AA',
  wcagVersion: '2.2',
  strictMode: true,
  ldsEnforcement: {
    enabled: true,
    storybookUrl: 'https://storybook.lilly.internal',
    requireApprovedComponents: true,
    allowedExceptions: ['src/legacy/**'],
    cacheComponents: true,
    cacheTTL: 3600
  },
  rules: {
    'aria-required': {
      enabled: true,
      severity: 'error'
    },
    'keyboard-nav': {
      enabled: true,
      severity: 'error',
      checkTabIndex: true,
      requireFocusStyles: true
    },
    'semantic-html': {
      enabled: true,
      severity: 'error'
    },
    'alt-text': {
      enabled: true,
      severity: 'error'
    },
    'lds-components': {
      enabled: true,
      severity: 'warning',
      suggestAlternatives: true
    },
    'heading-hierarchy': {
      enabled: true,
      severity: 'warning'
    },
    'form-labels': {
      enabled: true,
      severity: 'error'
    },
    'skip-links': {
      enabled: true,
      severity: 'warning'
    },
    'focus-visible': {
      enabled: true,
      severity: 'warning'
    }
  },
  excludedRules: [
    'color-contrast' // Handled by design system
  ],
  failureThresholds: {
    error: 0,
    warning: 10
  },
  ignore: [
    'src/**/*.test.tsx',
    'src/**/*.stories.tsx',
    'node_modules/**',
    'dist/**',
    'build/**'
  ]
};

export class ConfigManager {
  private config: ConfigFile = DEFAULT_CONFIG;
  private configPath: string;
  private watchers: Set<(config: ConfigFile) => void> = new Set();
  private lastModified: number = 0;

  constructor(configDir?: string) {
    this.configPath = path.join(
      configDir || process.cwd(),
      '.a11y',
      'config.json'
    );
  }

  async initialize(): Promise<void> {
    await this.loadConfig();
    this.setupWatcher();
  }

  getConfig(): ConfigFile {
    return { ...this.config };
  }

  async loadConfig(): Promise<void> {
    try {
      const configDir = path.dirname(this.configPath);
      const stats = await fs.stat(configDir).catch(() => null);

      if (!stats) {
        // Create default config directory and file
        await fs.mkdir(configDir, { recursive: true });
        await this.saveConfig(DEFAULT_CONFIG);
        this.config = DEFAULT_CONFIG;
        return;
      }

      const stats = await fs.stat(this.configPath).catch(() => null);
      if (!stats) {
        // Create default config file
        await this.saveConfig(DEFAULT_CONFIG);
        this.config = DEFAULT_CONFIG;
        return;
      }

      // Check if file has been modified since last load
      if (stats.mtimeMs === this.lastModified) {
        return;
      }

      this.lastModified = stats.mtimeMs;

      const content = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(content);

      // Merge with defaults to ensure all required properties exist
      this.config = this.mergeWithDefaults(config, DEFAULT_CONFIG);

      // Notify all watchers
      this.watchers.forEach(watcher => watcher(this.getConfig()));

    } catch (error) {
      console.warn(`Failed to load config from ${this.configPath}:`, error);
      console.warn('Using default configuration');
      this.config = DEFAULT_CONFIG;
    }
  }

  async saveConfig(config: ConfigFile): Promise<void> {
    const configDir = path.dirname(this.configPath);
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(
      this.configPath,
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }

  private setupWatcher(): void {
    // Use fs.watch for hot-reload (in a real implementation, use chokidar)
    fs.watch(this.configPath, { persistent: true }).on('change', () => {
      this.loadConfig().catch(console.error);
    });
  }

  subscribe(watcher: (config: ConfigFile) => void): () => void {
    this.watchers.add(watcher);
    return () => this.watchers.delete(watcher);
  }

  private mergeWithDefaults(config: Partial<ConfigFile>, defaults: ConfigFile): ConfigFile {
    return {
      ...defaults,
      ...config,
      ldsEnforcement: {
        ...defaults.ldsEnforcement,
        ...config.ldsEnforcement
      },
      rules: {
        ...defaults.rules,
        ...(config.rules || {})
      },
      failureThresholds: {
        ...defaults.failureThresholds,
        ...(config.failureThresholds || {})
      },
      ignore: [
        ...defaults.ignore,
        ...(config.ignore || [])
      ]
    };
  }

  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate wcagLevel
    if (!['A', 'AA', 'AAA'].includes(this.config.wcagLevel)) {
      errors.push('Invalid wcagLevel. Must be A, AA, or AAA');
    }

    // Validate wcagVersion
    if (!this.config.wcagVersion.startsWith('2.')) {
      errors.push('Invalid wcagVersion. Must start with 2.');
    }

    // Validate ldsEnforcement configuration
    if (this.config.ldsEnforcement.storybookUrl) {
      try {
        new URL(this.config.ldsEnforcement.storybookUrl);
      } catch {
        errors.push('Invalid ldsEnforcement.storybookUrl');
      }
    }

    // Validate failureThresholds
    const thresholds = this.config.failureThresholds;
    if (thresholds.error < 0 || thresholds.warning < 0) {
      errors.push('Failure thresholds must be non-negative numbers');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}