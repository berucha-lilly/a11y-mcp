/**
 * Configuration management with hot-reload support
 */
import { ConfigFile } from '../types/index.js';
export declare class ConfigManager {
    private config;
    private configPath;
    private watchers;
    private lastModified;
    constructor(configDir?: string);
    initialize(): Promise<void>;
    getConfig(): ConfigFile;
    loadConfig(): Promise<void>;
    saveConfig(config: ConfigFile): Promise<void>;
    private setupWatcher;
    subscribe(watcher: (config: ConfigFile) => void): () => void;
    private mergeWithDefaults;
    validateConfig(): Promise<{
        valid: boolean;
        errors: string[];
    }>;
}
