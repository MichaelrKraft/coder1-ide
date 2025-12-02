/**
 * Permission Analyzer Service
 * Analyzes and reports on config permissions and security risks
 */

import { Permission, PermissionAnalysis } from './types';

export class PermissionAnalyzer {
  private static instance: PermissionAnalyzer;

  private constructor() {}

  public static getInstance(): PermissionAnalyzer {
    if (!PermissionAnalyzer.instance) {
      PermissionAnalyzer.instance = new PermissionAnalyzer();
    }
    return PermissionAnalyzer.instance;
  }

  /**
   * Analyze permissions and identify risks
   */
  public analyzePermissions(permissions: Permission[]): PermissionAnalysis {
    const risks = this.identifyRisks(permissions);
    const recommendations = this.generateRecommendations(permissions, risks);

    return {
      permissions,
      risks,
      recommendations
    };
  }

  /**
   * Identify security risks from permissions
   */
  private identifyRisks(permissions: Permission[]): Array<{
    level: 'low' | 'medium' | 'high';
    description: string;
  }> {
    const risks: Array<{ level: 'low' | 'medium' | 'high'; description: string }> = [];

    const hasWrite = permissions.includes('write');
    const hasExecute = permissions.includes('execute');
    const hasFilesystem = permissions.includes('filesystem');
    const hasNetwork = permissions.includes('network');

    if (hasWrite && hasExecute && hasFilesystem) {
      risks.push({
        level: 'high',
        description: 'Config can write files and execute commands, allowing potential system modifications'
      });
    }

    if (hasExecute) {
      risks.push({
        level: 'medium',
        description: 'Config can execute system commands, which could potentially run malicious code'
      });
    }

    if (hasWrite && hasFilesystem) {
      risks.push({
        level: 'medium',
        description: 'Config has filesystem write access, could modify or delete files'
      });
    }

    if (hasNetwork && (hasWrite || hasExecute)) {
      risks.push({
        level: 'medium',
        description: 'Config can make network requests and modify system, potential for data exfiltration'
      });
    }

    if (hasNetwork) {
      risks.push({
        level: 'low',
        description: 'Config makes network requests, ensure you trust the destination endpoints'
      });
    }

    if (permissions.length === 1 && permissions[0] === 'read') {
      risks.push({
        level: 'low',
        description: 'Config has read-only access, minimal security risk'
      });
    }

    if (permissions.length === 0) {
      risks.push({
        level: 'low',
        description: 'No explicit permissions declared, behavior may be unpredictable'
      });
    }

    return risks;
  }

  /**
   * Generate recommendations based on permissions and risks
   */
  private generateRecommendations(
    permissions: Permission[],
    risks: Array<{ level: 'low' | 'medium' | 'high'; description: string }>
  ): string[] {
    const recommendations: string[] = [];

    const highRisks = risks.filter(r => r.level === 'high');
    const mediumRisks = risks.filter(r => r.level === 'medium');

    if (highRisks.length > 0) {
      recommendations.push('Review the config source code carefully before installing');
      recommendations.push('Consider running in a sandboxed environment first');
      recommendations.push('Install to local directory to limit scope');
    }

    if (mediumRisks.length > 0) {
      recommendations.push('Verify the config comes from a trusted source');
      recommendations.push('Review what files and commands will be affected');
    }

    if (permissions.includes('execute')) {
      recommendations.push('Check which commands the config will execute');
      recommendations.push('Ensure no destructive commands are present');
    }

    if (permissions.includes('network')) {
      recommendations.push('Review which network endpoints will be accessed');
      recommendations.push('Ensure API keys and credentials are properly secured');
    }

    if (permissions.includes('write')) {
      recommendations.push('Backup your files before installing');
      recommendations.push('Review which files will be modified');
    }

    if (recommendations.length === 0) {
      recommendations.push('Config appears safe to use');
      recommendations.push('No significant security concerns identified');
    }

    return recommendations;
  }

  /**
   * Get permission descriptions
   */
  public getPermissionDescriptions(permissions: Permission[]): Record<Permission, string> {
    const descriptions: Partial<Record<Permission, string>> = {};

    const allDescriptions: Record<Permission, string> = {
      read: 'Can read files and access information',
      write: 'Can create, modify, and delete files',
      execute: 'Can run system commands and scripts',
      network: 'Can make HTTP requests and access external APIs',
      filesystem: 'Can access and navigate the file system'
    };

    permissions.forEach(permission => {
      descriptions[permission] = allDescriptions[permission];
    });

    return descriptions as Record<Permission, string>;
  }

  /**
   * Calculate overall risk score (0-100)
   */
  public calculateRiskScore(permissions: Permission[]): number {
    let score = 0;

    const weights: Record<Permission, number> = {
      read: 5,
      write: 20,
      execute: 30,
      network: 15,
      filesystem: 10
    };

    permissions.forEach(permission => {
      score += weights[permission] || 0;
    });

    const combinations = [
      { perms: ['write', 'execute'], bonus: 20 },
      { perms: ['write', 'filesystem'], bonus: 15 },
      { perms: ['execute', 'network'], bonus: 15 },
      { perms: ['write', 'execute', 'filesystem'], bonus: 30 }
    ];

    combinations.forEach(({ perms, bonus }) => {
      if (perms.every(p => permissions.includes(p as Permission))) {
        score += bonus;
      }
    });

    return Math.min(score, 100);
  }

  /**
   * Get risk level from score
   */
  public getRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score < 30) return 'low';
    if (score < 60) return 'medium';
    return 'high';
  }

  /**
   * Get risk color for UI
   */
  public getRiskColor(level: 'low' | 'medium' | 'high'): string {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444'
    };
    return colors[level];
  }

  /**
   * Format permissions for display
   */
  public formatPermissionsDisplay(permissions: Permission[]): string {
    if (permissions.length === 0) {
      return 'No permissions';
    }

    if (permissions.length === 1) {
      return permissions[0].charAt(0).toUpperCase() + permissions[0].slice(1);
    }

    if (permissions.length === 2) {
      return permissions
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' and ');
    }

    const last = permissions[permissions.length - 1];
    const rest = permissions.slice(0, -1);

    return rest
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(', ') + ', and ' + last.charAt(0).toUpperCase() + last.slice(1);
  }

  /**
   * Compare two permission sets
   */
  public comparePermissions(
    current: Permission[],
    proposed: Permission[]
  ): {
    added: Permission[];
    removed: Permission[];
    unchanged: Permission[];
    moreRestrictive: boolean;
  } {
    const currentSet = new Set(current);
    const proposedSet = new Set(proposed);

    const added = proposed.filter(p => !currentSet.has(p));
    const removed = current.filter(p => !proposedSet.has(p));
    const unchanged = current.filter(p => proposedSet.has(p));

    const currentScore = this.calculateRiskScore(current);
    const proposedScore = this.calculateRiskScore(proposed);

    return {
      added,
      removed,
      unchanged,
      moreRestrictive: proposedScore < currentScore
    };
  }

  /**
   * Check if permissions are minimal for task
   */
  public arePermissionsMinimal(
    permissions: Permission[],
    configType: 'agent' | 'hook' | 'skill' | 'command'
  ): {
    minimal: boolean;
    excess: Permission[];
    suggestions: string[];
  } {
    const excess: Permission[] = [];
    const suggestions: string[] = [];

    const typicalPermissions: Record<string, Permission[]> = {
      agent: ['read', 'write'],
      hook: ['read', 'write', 'execute'],
      skill: ['read'],
      command: ['read', 'write']
    };

    const typical = typicalPermissions[configType] || [];
    const excessPerms = permissions.filter(p => !typical.includes(p));

    excessPerms.forEach(perm => {
      excess.push(perm);
      
      if (perm === 'network') {
        suggestions.push('Consider if network access is truly necessary');
      }
      if (perm === 'execute') {
        suggestions.push('Verify that command execution is required');
      }
      if (perm === 'filesystem' && configType === 'skill') {
        suggestions.push('Skills typically only need read access');
      }
    });

    return {
      minimal: excess.length === 0,
      excess,
      suggestions
    };
  }
}

export const permissionAnalyzer = PermissionAnalyzer.getInstance();

export function analyzePermissions(permissions: Permission[]): PermissionAnalysis {
  return permissionAnalyzer.analyzePermissions(permissions);
}

export function calculateRiskScore(permissions: Permission[]): number {
  return permissionAnalyzer.calculateRiskScore(permissions);
}
