import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

// Get git commit hash for deployment verification
const getGitCommit = (): string => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    // Fallback for Vercel deployments
    return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown';
  }
};

export async function GET(request: NextRequest) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'coder1-ide',
    version: process.env.npm_package_version || '1.0.0',
    commit: getGitCommit(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      bridge: process.env.ENABLE_BRIDGE === 'true',
      sessionSummary: process.env.ENABLE_SESSION_SUMMARY === 'true',
      errorDoctor: process.env.ENABLE_ERROR_DOCTOR === 'true',
      aiSupervision: process.env.ENABLE_AI_SUPERVISION === 'true'
    },
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    }
  };

  return NextResponse.json(health);
}