#!/usr/bin/env node
/**
 * Cost Report Generator
 * Shows current usage and costs for GitHub agents
 */

const path = require('path');
const fs = require('fs').promises;

class CostReporter {
  async loadCostTracker() {
    try {
      const trackerPath = path.join(__dirname, '..', 'data', 'cost-tracker.json');
      const data = await fs.readFile(trackerPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {
        monthlyUsage: 0,
        requestCount: 0,
        lastReset: new Date().getMonth(),
        dailyUsage: {}
      };
    }
  }

  async loadSettings() {
    try {
      const settingsPath = path.join(__dirname, '..', '..', 'agent-config', 'settings.json');
      const data = await fs.readFile(settingsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return { ai: { cost_alert_threshold: 10.00 } };
    }
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(amount);
  }

  async generateReport() {
    const costTracker = await this.loadCostTracker();
    const settings = await this.loadSettings();
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    console.log('\n📊 GitHub Agents Cost Report');
    console.log('═'.repeat(50));
    console.log(`📅 Period: ${currentMonth}`);
    console.log(`🎯 Alert Threshold: ${this.formatCurrency(settings.ai?.cost_alert_threshold || 10)}`);
    console.log('');

    // Monthly summary
    console.log('💰 Monthly Usage Summary');
    console.log('─'.repeat(25));
    console.log(`Total Cost: ${this.formatCurrency(costTracker.monthlyUsage)}`);
    console.log(`Requests: ${costTracker.requestCount}`);
    console.log(`Avg Cost/Request: ${this.formatCurrency(costTracker.monthlyUsage / Math.max(1, costTracker.requestCount))}`);
    
    const thresholdPercent = ((costTracker.monthlyUsage / (settings.ai?.cost_alert_threshold || 10)) * 100).toFixed(1);
    console.log(`Threshold Usage: ${thresholdPercent}%`);
    
    if (costTracker.monthlyUsage > (settings.ai?.cost_alert_threshold || 10)) {
      console.log('🚨 ALERT: Threshold exceeded!');
    } else if (thresholdPercent > 75) {
      console.log('⚠️  WARNING: Approaching threshold');
    } else {
      console.log('✅ Within budget');
    }

    // Daily breakdown
    if (Object.keys(costTracker.dailyUsage).length > 0) {
      console.log('\n📈 Daily Usage (Last 7 Days)');
      console.log('─'.repeat(30));
      
      const sortedDays = Object.entries(costTracker.dailyUsage)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 7);

      for (const [date, cost] of sortedDays) {
        const formattedDate = new Date(date).toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        });
        console.log(`${formattedDate}: ${this.formatCurrency(cost)}`);
      }
    }

    // Projections
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const currentDay = new Date().getDate();
    const dailyAverage = costTracker.monthlyUsage / currentDay;
    const projectedMonthly = dailyAverage * daysInMonth;

    console.log('\n🔮 Projections');
    console.log('─'.repeat(15));
    console.log(`Daily Average: ${this.formatCurrency(dailyAverage)}`);
    console.log(`Projected Monthly: ${this.formatCurrency(projectedMonthly)}`);
    
    if (projectedMonthly > (settings.ai?.cost_alert_threshold || 10)) {
      console.log('⚠️  Projected to exceed threshold');
    }

    // Recommendations
    console.log('\n💡 Recommendations');
    console.log('─'.repeat(18));
    
    if (costTracker.monthlyUsage < 1) {
      console.log('• Consider using Claude 3.5 Sonnet for better quality responses');
      console.log('• Current usage is very low - you have room for more features');
    } else if (costTracker.monthlyUsage > 5) {
      console.log('• Consider switching to Claude 3 Haiku for simple issues');
      console.log('• Enable use_economy_for_simple in agent-config/settings.json');
    } else {
      console.log('• Usage is optimal for current configuration');
      console.log('• Monitor daily trends for any unusual spikes');
    }

    console.log('');
  }
}

// Run if called directly
if (require.main === module) {
  const reporter = new CostReporter();
  reporter.generateReport().catch(console.error);
}

module.exports = CostReporter;