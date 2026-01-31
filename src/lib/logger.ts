/**
 * Structured logging utility
 * Outputs JSON logs that are easy to search/filter in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    userId?: string;
    route?: string;
    action?: string;
    duration_ms?: number;
    [key: string]: unknown;
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: LogContext;
}

function formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...(context && Object.keys(context).length > 0 ? { context } : {})
    };
    return JSON.stringify(entry);
}

export const logger = {
    debug: (message: string, context?: LogContext) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(formatLog('debug', message, context));
        }
    },

    info: (message: string, context?: LogContext) => {
        console.log(formatLog('info', message, context));
    },

    warn: (message: string, context?: LogContext) => {
        console.warn(formatLog('warn', message, context));
    },

    error: (message: string, context?: LogContext) => {
        console.error(formatLog('error', message, context));
    },

    /**
     * Log API request with timing
     */
    apiRequest: (route: string, userId: string | null, status: number, durationMs: number) => {
        console.log(formatLog('info', 'API Request', {
            route,
            userId: userId || 'anonymous',
            status,
            duration_ms: durationMs
        }));
    },

    /**
     * Log an error with stack trace
     */
    exception: (message: string, error: unknown, context?: LogContext) => {
        const errorContext: LogContext = {
            ...context,
            error_name: error instanceof Error ? error.name : 'Unknown',
            error_message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        };
        console.error(formatLog('error', message, errorContext));
    }
};

/**
 * Timer utility for measuring operation duration
 */
export function startTimer(): () => number {
    const start = performance.now();
    return () => Math.round(performance.now() - start);
}
