import { useState, useEffect, useCallback } from 'react';

interface DashboardMetrics {
  codingTime: {
    today: number; // minutes
    week: number;
    total: number;
  };
  favoriteCommand: {
    command: string;
    count: number;
  };
  gitPushes: {
    count: number;
    trend: 'up' | 'down' | 'stable';
    thisWeek: number;
  };
  nextSteps: {
    suggestions: Array<{
      id: string;
      title: string;
      description?: string;
      priority: 'high' | 'medium' | 'low';
      timeEstimate?: string;
    }>;
  };
  projectProgress: {
    percentage: number;
    currentPhase: string;
    completedMilestones: number;
    totalMilestones: number;
  };
  tokenUsage: {
    used: number;
    limit: number;
    thisMonth: number;
  };
}

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHelpEnabled, setIsHelpEnabled] = useState(() => {
    // Get from localStorage
    return localStorage.getItem('dashboard-help-enabled') === 'true';
  });

  // Fetch metrics from API
  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      } else {
        // Fallback to mock data if API fails
        setMetrics(getMockMetrics());
      }
    } catch (error) {
      console.log('Dashboard API unavailable, using mock data');
      setMetrics(getMockMetrics());
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle help system
  const toggleHelp = useCallback(() => {
    const newState = !isHelpEnabled;
    setIsHelpEnabled(newState);
    localStorage.setItem('dashboard-help-enabled', newState.toString());
  }, [isHelpEnabled]);

  // Load metrics on mount
  useEffect(() => {
    fetchMetrics();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    isHelpEnabled,
    toggleHelp,
    refresh: fetchMetrics
  };
};

// Mock data for development/fallback
const getMockMetrics = (): DashboardMetrics => {
  // Simulate realistic development data
  const now = new Date();
  const todayCodingTime = Math.floor(Math.random() * 300) + 60; // 1-6 hours
  const pushCount = Math.floor(Math.random() * 25) + 1;
  
  const commands = ['npm run dev', 'git push', 'git add .', 'git commit', 'cd', 'ls', 'code .'];
  const favoriteCommand = commands[Math.floor(Math.random() * commands.length)];
  
  return {
    codingTime: {
      today: todayCodingTime,
      week: todayCodingTime * 4,
      total: todayCodingTime * 20
    },
    favoriteCommand: {
      command: favoriteCommand,
      count: Math.floor(Math.random() * 50) + 10
    },
    gitPushes: {
      count: pushCount,
      trend: pushCount > 15 ? 'up' : pushCount < 5 ? 'down' : 'stable',
      thisWeek: Math.floor(pushCount / 3)
    },
    nextSteps: {
      suggestions: [
        {
          id: '1',
          title: 'Add error handling to login function',
          description: 'Wrap the authentication logic in try-catch blocks',
          priority: 'high',
          timeEstimate: '15 min'
        },
        {
          id: '2',
          title: 'Write unit tests for user service',
          description: 'Create test cases for the new authentication endpoints',
          priority: 'medium',
          timeEstimate: '30 min'
        },
        {
          id: '3',
          title: 'Update README documentation',
          description: 'Document the new authentication flow and API endpoints',
          priority: 'low',
          timeEstimate: '20 min'
        }
      ]
    },
    projectProgress: {
      percentage: Math.floor(Math.random() * 80) + 20, // 20-100%
      currentPhase: 'Phase 2: Core Development',
      completedMilestones: 3,
      totalMilestones: 8
    },
    tokenUsage: {
      used: Math.floor(Math.random() * 5000) + 1000,
      limit: 10000,
      thisMonth: Math.floor(Math.random() * 3000) + 500
    }
  };
};

export default useDashboardMetrics;