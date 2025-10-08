const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ReferralManager {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.referralDb = path.join(this.dataDir, 'referrals.json');
    
    this.rewardTiers = [
      { referrals: 1, reward: '1 month Pro free', value: 29 },
      { referrals: 5, reward: '3 months Pro free', value: 87 },
      { referrals: 10, reward: '6 months Pro free', value: 174 },
      { referrals: 25, reward: '1 year Pro free', value: 348 },
      { referrals: 50, reward: 'Lifetime Pro', value: 999 }
    ];
  }

  async initialize() {
    await fs.mkdir(this.dataDir, { recursive: true });
    
    try {
      const data = await fs.readFile(this.referralDb, 'utf8');
      this.referrals = JSON.parse(data);
    } catch (error) {
      this.referrals = {
        users: {},
        referrals: [],
        conversions: [],
        total_users: 0,
        total_referrals: 0,
        total_conversions: 0
      };
    }
  }

  generateReferralCode(userId) {
    const hash = crypto.createHash('sha256')
      .update(userId + Date.now())
      .digest('hex');
    return hash.substring(0, 8).toUpperCase();
  }

  async createUserReferralCode(userId, userEmail) {
    await this.initialize();

    if (this.referrals.users[userId]) {
      return this.referrals.users[userId];
    }

    const code = this.generateReferralCode(userId);
    
    const userReferral = {
      user_id: userId,
      email: userEmail,
      referral_code: code,
      created_at: new Date().toISOString(),
      referrals_made: 0,
      conversions: 0,
      total_value: 0,
      current_tier: null,
      rewards_earned: []
    };

    this.referrals.users[userId] = userReferral;
    this.referrals.total_users++;
    
    await this.saveDatabase();

    return userReferral;
  }

  async trackReferral(referralCode, newUserId, newUserEmail) {
    await this.initialize();

    const referrer = Object.values(this.referrals.users).find(
      u => u.referral_code === referralCode
    );

    if (!referrer) {
      return { success: false, error: 'Invalid referral code' };
    }

    const referral = {
      id: `ref-${Date.now()}`,
      referrer_id: referrer.user_id,
      referred_user_id: newUserId,
      referred_user_email: newUserEmail,
      referral_code: referralCode,
      created_at: new Date().toISOString(),
      converted: false,
      conversion_date: null
    };

    this.referrals.referrals.push(referral);
    referrer.referrals_made++;
    this.referrals.total_referrals++;

    await this.saveDatabase();

    return { success: true, referral };
  }

  async trackConversion(referredUserId, planType = 'pro', value = 29) {
    await this.initialize();

    const referral = this.referrals.referrals.find(
      r => r.referred_user_id === referredUserId && !r.converted
    );

    if (!referral) {
      return { success: false, error: 'No pending referral found' };
    }

    referral.converted = true;
    referral.conversion_date = new Date().toISOString();
    referral.plan_type = planType;
    referral.value = value;

    const referrer = this.referrals.users[referral.referrer_id];
    referrer.conversions++;
    referrer.total_value += value;

    this.referrals.conversions.push({
      ...referral,
      processed_at: new Date().toISOString()
    });
    this.referrals.total_conversions++;

    const reward = this.checkForReward(referrer);
    if (reward) {
      referrer.rewards_earned.push({
        tier: reward.tier,
        reward: reward.reward,
        value: reward.value,
        earned_at: new Date().toISOString()
      });
      referrer.current_tier = reward.tier;
    }

    await this.saveDatabase();

    return { 
      success: true, 
      conversion: referral,
      reward
    };
  }

  checkForReward(referrer) {
    const conversions = referrer.conversions;
    
    for (let i = this.rewardTiers.length - 1; i >= 0; i--) {
      const tier = this.rewardTiers[i];
      if (conversions >= tier.referrals) {
        const alreadyEarned = referrer.rewards_earned.some(
          r => r.tier === i
        );
        
        if (!alreadyEarned) {
          return {
            tier: i,
            ...tier
          };
        }
        break;
      }
    }
    
    return null;
  }

  async getReferralStats(userId) {
    await this.initialize();

    const user = this.referrals.users[userId];
    if (!user) {
      return { error: 'User not found' };
    }

    const userReferrals = this.referrals.referrals.filter(
      r => r.referrer_id === userId
    );

    const pending = userReferrals.filter(r => !r.converted).length;
    const converted = userReferrals.filter(r => r.converted).length;

    const nextTier = this.getNextTier(user.conversions);

    return {
      user_id: userId,
      referral_code: user.referral_code,
      total_referrals: user.referrals_made,
      pending_conversions: pending,
      successful_conversions: converted,
      total_value_generated: user.total_value,
      current_tier: user.current_tier,
      rewards_earned: user.rewards_earned,
      next_tier: nextTier,
      referrals_to_next_tier: nextTier ? nextTier.referrals - user.conversions : 0
    };
  }

  getNextTier(currentConversions) {
    for (const tier of this.rewardTiers) {
      if (currentConversions < tier.referrals) {
        return tier;
      }
    }
    return null;
  }

  async getLeaderboard(limit = 10) {
    await this.initialize();

    const sorted = Object.values(this.referrals.users)
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, limit);

    return sorted.map((user, index) => ({
      rank: index + 1,
      user_id: user.user_id,
      email: this.maskEmail(user.email),
      conversions: user.conversions,
      total_value: user.total_value,
      current_tier: user.current_tier,
      latest_reward: user.rewards_earned[user.rewards_earned.length - 1]
    }));
  }

  maskEmail(email) {
    const [local, domain] = email.split('@');
    const masked = local.substring(0, 2) + '***' + local.substring(local.length - 1);
    return `${masked}@${domain}`;
  }

  async getOverallStats() {
    await this.initialize();

    const conversionRate = this.referrals.total_referrals > 0 ?
      ((this.referrals.total_conversions / this.referrals.total_referrals) * 100).toFixed(2) :
      0;

    const totalValue = this.referrals.conversions.reduce((sum, c) => sum + (c.value || 0), 0);

    return {
      total_users_with_codes: this.referrals.total_users,
      total_referrals_made: this.referrals.total_referrals,
      total_conversions: this.referrals.total_conversions,
      conversion_rate: `${conversionRate}%`,
      total_revenue_from_referrals: totalValue,
      average_value_per_conversion: this.referrals.total_conversions > 0 ?
        (totalValue / this.referrals.total_conversions).toFixed(2) : 0
    };
  }

  async saveDatabase() {
    await fs.writeFile(
      this.referralDb,
      JSON.stringify(this.referrals, null, 2)
    );
  }
}

async function main() {
  const manager = new ReferralManager();
  
  try {
    console.log('🎁 Referral Manager Demo\n');
    
    console.log('Creating referral code for user...');
    const user = await manager.createUserReferralCode('user-123', 'user@example.com');
    console.log(`✅ Referral code created: ${user.referral_code}\n`);
    
    console.log('Simulating referral...');
    const referralResult = await manager.trackReferral(
      user.referral_code,
      'user-456',
      'newuser@example.com'
    );
    console.log(`✅ Referral tracked: ${referralResult.success}\n`);
    
    console.log('Simulating conversion to Pro...');
    const conversionResult = await manager.trackConversion('user-456', 'pro', 29);
    console.log(`✅ Conversion tracked: ${conversionResult.success}`);
    if (conversionResult.reward) {
      console.log(`🎉 Reward earned: ${conversionResult.reward.reward}\n`);
    } else {
      console.log(`ℹ️  No new reward (need more conversions)\n`);
    }
    
    console.log('Getting user stats...');
    const stats = await manager.getReferralStats('user-123');
    console.log('\n📊 USER STATISTICS');
    console.log('='.repeat(60));
    console.log(`Referral Code: ${stats.referral_code}`);
    console.log(`Total Referrals: ${stats.total_referrals}`);
    console.log(`Successful Conversions: ${stats.successful_conversions}`);
    console.log(`Total Value Generated: $${stats.total_value_generated}`);
    console.log(`Rewards Earned: ${stats.rewards_earned.length}`);
    if (stats.next_tier) {
      console.log(`Next Reward: ${stats.next_tier.reward} (${stats.referrals_to_next_tier} more conversions)`);
    }
    console.log('='.repeat(60));
    
    console.log('\nGetting overall stats...');
    const overall = await manager.getOverallStats();
    console.log('\n📈 OVERALL STATISTICS');
    console.log('='.repeat(60));
    console.log(`Users with Referral Codes: ${overall.total_users_with_codes}`);
    console.log(`Total Referrals: ${overall.total_referrals_made}`);
    console.log(`Total Conversions: ${overall.total_conversions}`);
    console.log(`Conversion Rate: ${overall.conversion_rate}`);
    console.log(`Total Revenue from Referrals: $${overall.total_revenue_from_referrals}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ReferralManager;
