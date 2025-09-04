/**
 * Debug Logger Utility
 * Allows controlling console output from specific components
 */

interface DebugConfig {
    schwabTestRunner: boolean;
    schwabValidator: boolean;
    wheelDetection: boolean;
    apiCalls: boolean;
}

// Default debug configuration - set to false to disable logging
const DEBUG_CONFIG: DebugConfig = {
    schwabTestRunner: false, // Disabled by default
    schwabValidator: false,  // Disabled by default
    wheelDetection: false,   // Disabled to reduce console noise
    apiCalls: false         // Disabled to reduce console noise
};

class DebugLogger {
    private config: DebugConfig;

    constructor() {
        this.config = { ...DEBUG_CONFIG };
    }

    // Enable/disable specific loggers
    setEnabled(component: keyof DebugConfig, enabled: boolean) {
        this.config[component] = enabled;
    }

    // Check if a component should log
    isEnabled(component: keyof DebugConfig): boolean {
        return this.config[component];
    }

    // Conditional console.log
    log(component: keyof DebugConfig, ...args: any[]) {
        if (this.config[component]) {
            console.log(...args);
        }
    }

    // Conditional console.error
    error(component: keyof DebugConfig, ...args: any[]) {
        if (this.config[component]) {
            console.error(...args);
        }
    }

    // Conditional console.warn
    warn(component: keyof DebugConfig, ...args: any[]) {
        if (this.config[component]) {
            console.warn(...args);
        }
    }

    // Get current configuration
    getConfig(): DebugConfig {
        return { ...this.config };
    }
}

// Export singleton instance
export const debugLogger = new DebugLogger();

// Convenience functions for common components
export const schwabTestLog = (...args: any[]) => debugLogger.log('schwabTestRunner', ...args);
export const schwabValidatorLog = (...args: any[]) => debugLogger.log('schwabValidator', ...args);
export const wheelDetectionLog = (...args: any[]) => debugLogger.log('wheelDetection', ...args);
export const apiCallLog = (...args: any[]) => debugLogger.log('apiCalls', ...args);

export default debugLogger;
