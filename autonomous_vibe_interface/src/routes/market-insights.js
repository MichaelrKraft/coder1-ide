const express = require('express');
const router = express.Router();

// Generate market insights for a project
router.get('/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        
        // Mock market insights data
        const marketInsights = {
            projectId,
            analysis: {
                marketSize: {
                    total: '$2.4B',
                    growth: '12.5% annually',
                    segment: 'B2B SaaS'
                },
                competitors: [
                    {
                        name: 'Market Leader A',
                        marketShare: '35%',
                        strengths: ['Brand recognition', 'Enterprise sales'],
                        weaknesses: ['High pricing', 'Complex onboarding']
                    },
                    {
                        name: 'Emerging Player B', 
                        marketShare: '15%',
                        strengths: ['User-friendly', 'Competitive pricing'],
                        weaknesses: ['Limited features', 'Small team']
                    }
                ],
                opportunities: [
                    'Mobile-first approach underserved',
                    'AI integration demand growing',
                    'Small business segment expansion'
                ],
                threats: [
                    'Established players with deep pockets',
                    'Economic uncertainty affecting budgets', 
                    'Rapid technology changes'
                ],
                trends: [
                    {
                        trend: 'AI-Powered Automation',
                        impact: 'High',
                        timeline: '6-12 months'
                    },
                    {
                        trend: 'Remote Work Tools',
                        impact: 'Medium', 
                        timeline: 'Ongoing'
                    },
                    {
                        trend: 'Privacy-First Solutions',
                        impact: 'Medium',
                        timeline: '12-18 months'
                    }
                ]
            },
            recommendations: [
                'Focus on mobile-first user experience',
                'Integrate AI features for competitive advantage',
                'Target small-medium businesses initially', 
                'Emphasize privacy and security features'
            ],
            confidence: 85,
            timestamp: new Date().toISOString()
        };

        res.json(marketInsights);
    } catch (error) {
        console.error('Market insights error:', error);
        res.status(500).json({
            error: 'Failed to generate market insights',
            message: error.message
        });
    }
});

module.exports = router;