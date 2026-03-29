type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  source?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL: LogLevel = 
  process.env.NODE_ENV === 'production' ? 'warn' : 'debug';

function formatLog(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  const source = entry.source ? ` [${entry.source}]` : '';
  const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  return `${prefix}${source} ${entry.message}${context}`;
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  source?: string
): LogEntry {
  if (LOG_LEVELS[level] < LOG_LEVELS[CURRENT_LEVEL]) {
    return null as any;
  }

  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    source,
  };
}

export const logger = {
  debug(message: string, context?: LogContext, source?: string): void {
    const entry = createLogEntry('debug', message, context, source);
    if (entry) {
      console.debug(formatLog(entry));
    }
  },

  info(message: string, context?: LogContext, source?: string): void {
    const entry = createLogEntry('info', message, context, source);
    if (entry) {
      console.info(formatLog(entry));
    }
  },

  warn(message: string, context?: LogContext, source?: string): void {
    const entry = createLogEntry('warn', message, context, source);
    if (entry) {
      console.warn(formatLog(entry));
    }
  },

  error(message: string, context?: LogContext, source?: string): void {
    const entry = createLogEntry('error', message, context, source);
    if (entry) {
      console.error(formatLog(entry));
    }
  },

  group(label: string): void {
    if (LOG_LEVELS['debug'] >= LOG_LEVELS[CURRENT_LEVEL]) {
      console.group(`[${label}]`);
    }
  },

  groupEnd(): void {
    if (LOG_LEVELS['debug'] >= LOG_LEVELS[CURRENT_LEVEL]) {
      console.groupEnd();
    }
  },

  time(label: string): void {
    if (LOG_LEVELS['debug'] >= LOG_LEVELS[CURRENT_LEVEL]) {
      console.time(label);
    }
  },

  timeEnd(label: string): void {
    if (LOG_LEVELS['debug'] >= LOG_LEVELS[CURRENT_LEVEL]) {
      console.timeEnd(label);
    }
  },

  table(data: unknown): void {
    if (LOG_LEVELS['debug'] >= LOG_LEVELS[CURRENT_LEVEL]) {
      console.table(data);
    }
  },
};

export function createModuleLogger(source: string) {
  return {
    debug: (message: string, context?: LogContext) => logger.debug(message, context, source),
    info: (message: string, context?: LogContext) => logger.info(message, context, source),
    warn: (message: string, context?: LogContext) => logger.warn(message, context, source),
    error: (message: string, context?: LogContext) => logger.error(message, context, source),
    time: (label: string) => logger.time(`${source}:${label}`),
    timeEnd: (label: string) => logger.timeEnd(`${source}:${label}`),
  };
}
