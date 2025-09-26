import { v4 as uuidv4 } from 'uuid';

interface UserMemoryTrial {
  userId: string;
  registrationDate: Date;
  trialStartDate: Date;
  trialEndDate: Date;
  isPaidUser: boolean;
  isTrialActive: boolean;
  memoryData: any;
  notificationsSent: {
    day5Warning: boolean;
    day6Warning: boolean;
    day7Final: boolean;
    trialExpired: boolean;
  };
}

export class MemoryTrialService {
  private static instance: MemoryTrialService;
  private users: Map<string, UserMemoryTrial> = new Map();
  private readonly TRIAL_DAYS = 7;

  private constructor() {}

  public static getInstance(): MemoryTrialService {
    if (!MemoryTrialService.instance) {
      MemoryTrialService.instance = new MemoryTrialService();
    }
    return MemoryTrialService.instance;
  }

  /**
   * Register a new user for memory trial
   */
  public registerUser(email?: string): string {
    const userId = uuidv4();
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(now.getDate() + this.TRIAL_DAYS);

    const userTrial: UserMemoryTrial = {
      userId,
      registrationDate: now,
      trialStartDate: now,
      trialEndDate,
      isPaidUser: false,
      isTrialActive: true,
      memoryData: {},
      notificationsSent: {
        day5Warning: false,
        day6Warning: false,
        day7Final: false,
        trialExpired: false
      }
    };

    this.users.set(userId, userTrial);
    
    // Store in localStorage for persistence across sessions
    if (typeof window !== 'undefined') {
      localStorage.setItem(`coder1_trial_${userId}`, JSON.stringify({
        userId,
        registrationDate: now.toISOString(),
        trialEndDate: trialEndDate.toISOString(),
        isPaidUser: false
      }));
      localStorage.setItem('coder1_current_user', userId);
    }

    return userId;
  }

  /**
   * Get user trial information
   */
  public getUserTrial(userId: string): UserMemoryTrial | null {
    let userTrial = this.users.get(userId);
    
    // Try to load from localStorage if not in memory
    if (!userTrial && typeof window !== 'undefined') {
      const storedTrial = localStorage.getItem(`coder1_trial_${userId}`);
      if (storedTrial) {
        const parsed = JSON.parse(storedTrial);
        userTrial = {
          ...parsed,
          registrationDate: new Date(parsed.registrationDate),
          trialStartDate: new Date(parsed.registrationDate),
          trialEndDate: new Date(parsed.trialEndDate),
          isTrialActive: !parsed.isPaidUser && new Date() < new Date(parsed.trialEndDate),
          memoryData: {},
          notificationsSent: {
            day5Warning: false,
            day6Warning: false,
            day7Final: false,
            trialExpired: false
          }
        };
        this.users.set(userId, userTrial);
      }
    }

    return userTrial || null;
  }

  /**
   * Check if user can store memory
   */
  public canStoreMemory(userId: string): boolean {
    const userTrial = this.getUserTrial(userId);
    if (!userTrial) return false;

    // Paid users can always store memory
    if (userTrial.isPaidUser) return true;

    // Trial users can store memory if trial is still active
    const now = new Date();
    return now < userTrial.trialEndDate;
  }

  /**
   * Store memory data for user
   */
  public storeMemory(userId: string, sessionId: string, memoryData: any): boolean {
    if (!this.canStoreMemory(userId)) {
      return false;
    }

    const userTrial = this.getUserTrial(userId);
    if (!userTrial) return false;

    if (!userTrial.memoryData) {
      userTrial.memoryData = {};
    }
    userTrial.memoryData[sessionId] = {
      data: memoryData,
      timestamp: new Date(),
      sessionId
    };

    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      const memoryKey = `coder1_memory_${userId}`;
      localStorage.setItem(memoryKey, JSON.stringify(userTrial.memoryData));
    }

    return true;
  }

  /**
   * Retrieve memory data for user
   */
  public getMemory(userId: string, sessionId?: string): any {
    const userTrial = this.getUserTrial(userId);
    if (!userTrial) return null;

    // If trial has expired and user is not paid, return null
    if (!userTrial.isPaidUser && new Date() > userTrial.trialEndDate) {
      return null;
    }

    // Load memory from localStorage if not in memory
    if (!userTrial.memoryData && typeof window !== 'undefined') {
      const memoryKey = `coder1_memory_${userId}`;
      const storedMemory = localStorage.getItem(memoryKey);
      if (storedMemory) {
        userTrial.memoryData = JSON.parse(storedMemory);
      }
    }

    if (sessionId) {
      return userTrial.memoryData?.[sessionId] || null;
    }
    return userTrial.memoryData || {};
  }

  /**
   * Clear memory data (when trial expires)
   */
  public clearMemory(userId: string): void {
    const userTrial = this.getUserTrial(userId);
    if (userTrial) {
      userTrial.memoryData = {};
      
      // Clear from localStorage
      if (typeof window !== 'undefined') {
        const memoryKey = `coder1_memory_${userId}`;
        localStorage.removeItem(memoryKey);
      }
    }
  }

  /**
   * Upgrade user to paid
   */
  public upgradeToPaid(userId: string): boolean {
    const userTrial = this.getUserTrial(userId);
    if (!userTrial) return false;

    userTrial.isPaidUser = true;
    userTrial.isTrialActive = false; // No longer need trial

    // Update localStorage
    if (typeof window !== 'undefined') {
      const trialKey = `coder1_trial_${userId}`;
      const storedTrial = localStorage.getItem(trialKey);
      if (storedTrial) {
        const parsed = JSON.parse(storedTrial);
        parsed.isPaidUser = true;
        localStorage.setItem(trialKey, JSON.stringify(parsed));
      }
    }

    return true;
  }

  /**
   * Get trial status and remaining days
   */
  public getTrialStatus(userId: string): {
    isTrialUser: boolean;
    isPaidUser: boolean;
    daysRemaining: number;
    trialExpired: boolean;
    shouldShowUpgrade: boolean;
  } {
    const userTrial = this.getUserTrial(userId);
    
    if (!userTrial) {
      return {
        isTrialUser: false,
        isPaidUser: false,
        daysRemaining: 0,
        trialExpired: false,
        shouldShowUpgrade: false
      };
    }

    const now = new Date();
    const msRemaining = userTrial.trialEndDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    const trialExpired = now > userTrial.trialEndDate;

    return {
      isTrialUser: !userTrial.isPaidUser,
      isPaidUser: userTrial.isPaidUser,
      daysRemaining,
      trialExpired,
      shouldShowUpgrade: (!userTrial.isPaidUser && (daysRemaining <= 2 || trialExpired))
    };
  }

  /**
   * Get current user ID from localStorage
   */
  public getCurrentUserId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('coder1_current_user');
  }

  /**
   * Initialize user session (create if doesn't exist)
   */
  public initializeUser(): string {
    const existingUserId = this.getCurrentUserId();
    if (existingUserId && this.getUserTrial(existingUserId)) {
      return existingUserId;
    }
    return this.registerUser();
  }
}

export const memoryTrialService = MemoryTrialService.getInstance();