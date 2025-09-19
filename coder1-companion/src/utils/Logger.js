const chalk = require('chalk');

class Logger {
  constructor(namespace = 'Coder1') {
    this.namespace = namespace;
    this.level = process.env.LOG_LEVEL || 'info';
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      success: 1
    };
  }

  createChild(childNamespace) {
    return new Logger(`${this.namespace}:${childNamespace}`);
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.level];
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.namespace}]`;
    
    const colors = {
      debug: chalk.gray,
      info: chalk.blue,
      warn: chalk.yellow,
      error: chalk.red,
      success: chalk.green
    };
    
    const color = colors[level] || chalk.white;
    return color(`${prefix} ${message}`) + (args.length ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ') : '');
  }

  debug(message, ...args) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, ...args));
    }
  }

  info(message, ...args) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, ...args));
    }
  }

  warn(message, ...args) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, ...args));
    }
  }

  error(message, ...args) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, ...args));
    }
  }

  success(message, ...args) {
    if (this.shouldLog('success')) {
      console.log(this.formatMessage('success', message, ...args));
    }
  }
}

module.exports = { Logger };