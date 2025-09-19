const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const net = require('net');

class PreflightChecker {
  constructor(logger) {
    this.logger = logger;
  }

  async checkClaudeCode() {
    try {
      const { stdout } = await this.execCommand('claude', ['--version']);
      const versionMatch = stdout.match(/claude-code\s+(\d+\.\d+\.\d+)/);
      
      if (versionMatch) {
        return {
          success: true,
          message: `v${versionMatch[1]} found in PATH`
        };
      }
      
      return {
        success: false,
        message: 'Claude Code not found or invalid version',
        critical: true
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Claude Code not installed or not in PATH',
        critical: true
      };
    }
  }

  async checkNodeVersion() {
    try {
      const version = process.version;
      const major = parseInt(version.substring(1).split('.')[0]);
      
      if (major >= 18) {
        return {
          success: true,
          message: `${version} (compatible)`
        };
      }
      
      return {
        success: false,
        message: `${version} - requires Node.js 18+`,
        critical: true
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Unable to determine Node.js version',
        critical: true
      };
    }
  }

  async checkFilePermissions() {
    try {
      const homeDir = require('os').homedir();
      const testDir = path.join(homeDir, '.coder1-companion-test');
      
      // Test directory creation
      await fs.mkdir(testDir, { recursive: true });
      
      // Test file write
      const testFile = path.join(testDir, 'test.txt');
      await fs.writeFile(testFile, 'test');
      
      // Test file read
      const content = await fs.readFile(testFile, 'utf8');
      
      // Cleanup
      await fs.unlink(testFile);
      await fs.rmdir(testDir);
      
      return {
        success: true,
        message: 'Read/write permissions OK'
      };
      
    } catch (error) {
      return {
        success: false,
        message: `File system permissions error: ${error.message}`,
        critical: true
      };
    }
  }

  async checkPorts(ports) {
    const availablePorts = [];
    const unavailablePorts = [];
    
    for (const port of ports) {
      const isAvailable = await this.isPortAvailable(port);
      if (isAvailable) {
        availablePorts.push(port);
      } else {
        unavailablePorts.push(port);
      }
    }
    
    if (availablePorts.length > 0) {
      return {
        success: true,
        message: `Available ports: ${availablePorts.join(', ')}`
      };
    }
    
    return {
      success: false,
      message: `No available ports in range: ${ports.join(', ')}`,
      critical: true
    };
  }

  async checkGit() {
    try {
      const { stdout } = await this.execCommand('git', ['--version']);
      const versionMatch = stdout.match(/git version (\d+\.\d+\.\d+)/);
      
      if (versionMatch) {
        return {
          success: true,
          message: `v${versionMatch[1]} found`
        };
      }
      
      return {
        success: false,
        message: 'Git found but version unknown'
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Git not installed or not in PATH'
      };
    }
  }

  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, '127.0.0.1', () => {
        server.close(() => resolve(true));
      });
      
      server.on('error', () => resolve(false));
    });
  }

  async execCommand(command, args) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { stdio: 'pipe' });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (exitCode) => {
        if (exitCode === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with exit code ${exitCode}: ${stderr}`));
        }
      });
      
      process.on('error', reject);
    });
  }
}

module.exports = { PreflightChecker };