/**
 * PureCode.ai Client
 * Advanced component generation fallback
 */

class PureCodeClient {
    constructor() {
        this.initialized = true;
        console.log('✨ PureCode.ai: Advanced fallback client initialized');
    }

    /**
     * Main entry point for component generation
     */
    async generateComponent(prompt, options = {}) {
        try {
            console.log('PureCode.ai: Generating component for:', prompt);
            
            // Analyze the prompt to determine component type
            const component = await this.generateAdvancedComponent(prompt, options);
            
            if (!component || !component.code) {
                throw new Error('Failed to generate component');
            }
            
            console.log('PureCode.ai: Component generated successfully');
            console.log('   Type:', component.type);
            console.log('   Name:', component.name);
            
            return {
                success: true,
                code: component.code,
                name: component.name,
                explanation: component.explanation,
                metadata: {
                    source: 'PureCode.ai (Advanced Fallback)',
                    componentType: component.type,
                    styling: component.styling,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('PureCode.ai: Generation failed:', error);
            throw error;
        }
    }

    /**
     * Generate advanced component with sophisticated patterns
     */
    async generateAdvancedComponent(prompt, options) {
        const promptLower = prompt.toLowerCase();
        
        // Detect component type
        const componentType = this.detectComponentType(promptLower);
        
        // Generate based on type
        switch (componentType) {
            case 'pricing':
                return this.generatePricingComponent(prompt);
            case 'dashboard':
                return this.generateDashboardComponent(prompt);
            case 'form':
                return this.generateFormComponent(prompt);
            case 'card':
                return this.generateCardComponent(prompt);
            case 'navigation':
                return this.generateNavigationComponent(prompt);
            case 'hero':
                return this.generateHeroComponent(prompt);
            case 'button':
                return this.generateButtonComponent(prompt);
            default:
                return this.generateGenericComponent(prompt);
        }
    }

    detectComponentType(prompt) {
        if (prompt.includes('pricing') || prompt.includes('tiers') || prompt.includes('plans')) {
            return 'pricing';
        }
        if (prompt.includes('dashboard') || prompt.includes('analytics') || prompt.includes('metrics')) {
            return 'dashboard';
        }
        if (prompt.includes('form') || prompt.includes('login') || prompt.includes('signup') || prompt.includes('register')) {
            return 'form';
        }
        if (prompt.includes('card') || prompt.includes('profile') || prompt.includes('product')) {
            return 'card';
        }
        if (prompt.includes('nav') || prompt.includes('menu') || prompt.includes('header')) {
            return 'navigation';
        }
        if (prompt.includes('hero') || prompt.includes('banner') || prompt.includes('landing')) {
            return 'hero';
        }
        if (prompt.includes('button') || prompt.includes('btn') || prompt.includes('click')) {
            return 'button';
        }
        return 'generic';
    }

    generatePricingComponent(prompt) {
        const tiers = prompt.match(/(\d+)\s*tiers?/) ? parseInt(prompt.match(/(\d+)\s*tiers?/)[1]) : 3;
        
        const code = `const PricingComponent = ({ onSelectPlan }) => {
  const [selectedPlan, setSelectedPlan] = React.useState(1);
  const [billingCycle, setBillingCycle] = React.useState('monthly');

  const plans = [
    {
      id: 0,
      name: 'Starter',
      price: { monthly: 9, yearly: 90 },
      features: [
        '✓ 5 Projects',
        '✓ Basic Support',
        '✓ 1 User',
        '✓ 10GB Storage'
      ],
      popular: false
    },
    {
      id: 1,
      name: 'Professional',
      price: { monthly: 29, yearly: 290 },
      features: [
        '✓ Unlimited Projects',
        '✓ Priority Support',
        '✓ 5 Users',
        '✓ 100GB Storage',
        '✓ Advanced Analytics',
        '✓ API Access'
      ],
      popular: true
    },
    {
      id: 2,
      name: 'Enterprise',
      price: { monthly: 99, yearly: 990 },
      features: [
        '✓ Everything in Pro',
        '✓ Dedicated Support',
        '✓ Unlimited Users',
        '✓ Unlimited Storage',
        '✓ Custom Integrations',
        '✓ SLA Guarantee',
        '✓ Advanced Security'
      ],
      popular: false
    }
  ];

  return (
    <div style={{
      padding: '60px 20px',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Choose Your Plan
        </h2>
        
        <p style={{
          textAlign: 'center',
          fontSize: '20px',
          color: '#666',
          marginBottom: '40px'
        }}>
          Start free, upgrade when you need more
        </p>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex',
            background: 'white',
            borderRadius: '30px',
            padding: '5px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '10px 30px',
                borderRadius: '25px',
                border: 'none',
                background: billingCycle === 'monthly' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                color: billingCycle === 'monthly' ? 'white' : '#666',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              style={{
                padding: '10px 30px',
                borderRadius: '25px',
                border: 'none',
                background: billingCycle === 'yearly' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                color: billingCycle === 'yearly' ? 'white' : '#666',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              Yearly (Save 20%)
            </button>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: \`repeat(auto-fit, minmax(300px, 1fr))\`,
          gap: '30px'
        }}>
          {plans.map((plan) => {
            return (
            <div
              key={plan.id}
              style={{
                background: 'white',
                borderRadius: '20px',
                padding: '30px',
                position: 'relative',
                transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                boxShadow: plan.popular 
                  ? '0 20px 40px rgba(0,0,0,0.2)' 
                  : '0 10px 20px rgba(0,0,0,0.1)',
                transition: 'transform 0.3s, box-shadow 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05) translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = plan.popular ? 'scale(1.05)' : 'scale(1)';
                e.currentTarget.style.boxShadow = plan.popular 
                  ? '0 20px 40px rgba(0,0,0,0.2)' 
                  : '0 10px 20px rgba(0,0,0,0.1)';
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-15px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  padding: '6px 20px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}>
                  Most Popular
                </div>
              )}

              <h3 style={{ fontSize: '24px', marginBottom: '10px', color: '#333' }}>
                {plan.name}
              </h3>
              
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '48px', fontWeight: 'bold', color: '#667eea' }}>
                  \${plan.price[billingCycle]}
                </span>
                <span style={{ color: '#666', marginLeft: '8px' }}>
                  /\${billingCycle === 'monthly' ? 'mo' : 'yr'}
                </span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '30px' }}>
                {plan.features.map((feature, idx) => (
                  <li key={idx} style={{ 
                    padding: '10px 0', 
                    color: '#555',
                    borderBottom: '1px solid #f0f0f0'
                  }}>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  setSelectedPlan(plan.id);
                  onSelectPlan && onSelectPlan(plan);
                }}
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '10px',
                  border: 'none',
                  background: selectedPlan === plan.id 
                    ? 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)'
                    : plan.popular 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : '#f0f0f0',
                  color: selectedPlan === plan.id || plan.popular ? 'white' : '#333',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  if (selectedPlan !== plan.id) {
                    e.target.style.background = '#e0e0e0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedPlan !== plan.id) {
                    e.target.style.background = '#f0f0f0';
                  }
                }}
              >
                {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
              </button>
            </div>
          )})}
        </div>
      </div>
    </div>
  );
};

//export default PricingComponent;`;

        return {
            code,
            name: 'PricingComponent',
            type: 'pricing',
            styling: 'modern-gradient',
            explanation: 'Advanced pricing component with billing cycle toggle and hover effects'
        };
    }

    generateDashboardComponent(prompt) {
        const code = `// React component (no imports needed for preview)

const DashboardComponent = ({ data = {} }) => {
  const [stats, setStats] = React.useState({
    revenue: 45231,
    users: 2453,
    growth: 12.5,
    activeNow: 423
  });

  const [chartData, setChartData] = React.useState([65, 45, 78, 89, 45, 67, 72]);

  React.useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        activeNow: Math.floor(Math.random() * 100) + 380
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ title, value, change, icon, color }) => (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      transition: 'transform 0.3s, box-shadow 0.3s',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.12)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '8px' }}>{title}</p>
          <h3 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {value}
          </h3>
          {change && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginTop: '8px',
              color: change > 0 ? '#10b981' : '#ef4444'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
              </span>
            </div>
          )}
        </div>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: \`linear-gradient(135deg, \${color}22 0%, \${color}44 100%)\`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      padding: '32px'
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '32px' }}>
          Dashboard Overview
        </h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          <StatCard 
            title="Total Revenue"
            value={\`$\${stats.revenue.toLocaleString()}\`}
            change={12.5}
            icon="💰"
            color="#667eea"
          />
          <StatCard 
            title="Total Users"
            value={stats.users.toLocaleString()}
            change={8.3}
            icon="👥"
            color="#f093fb"
          />
          <StatCard 
            title="Growth Rate"
            value={\`\${stats.growth}%\`}
            change={-2.4}
            icon="📈"
            color="#00b894"
          />
          <StatCard 
            title="Active Now"
            value={stats.activeNow}
            change={5.2}
            icon="⚡"
            color="#ff6b6b"
          />
        </div>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginBottom: '24px' }}>
            Weekly Activity
          </h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '16px' }}>
            {chartData.map((value, index) => (
              <div
                key={index}
                style={{
                  flex: 1,
                  height: \`\${value}%\`,
                  background: \`linear-gradient(135deg, #667eea \${100 - value}%, #764ba2 100%)\`,
                  borderRadius: '8px 8px 0 0',
                  transition: 'all 0.3s',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scaleY(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scaleY(1)';
                }}
                title={\`Day \${index + 1}: \${value}%\`}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
              <span key={index} style={{ fontSize: '12px', color: '#9ca3af', flex: 1, textAlign: 'center' }}>
                {day}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

//export default DashboardComponent;`;

        return {
            code,
            name: 'DashboardComponent',
            type: 'dashboard',
            styling: 'modern-cards',
            explanation: 'Interactive dashboard with stats cards and activity chart'
        };
    }

    generateFormComponent(prompt) {
        const isLogin = prompt.includes('login');
        const isSignup = prompt.includes('signup') || prompt.includes('register');
        
        if (isLogin) {
            return this.generateLoginForm();
        } else if (isSignup) {
            return this.generateSignupForm();
        } else {
            return this.generateGenericForm();
        }
    }

    generateLoginForm() {
        const code = `const LoginComponent = ({ onSubmit }) => {
  const [formData, setFormData] = React.useState({
    email: '',
    password: ''
  });
  
  const [errors, setErrors] = React.useState({});
  const [isLoading, setIsLoading] = React.useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\\S+@\\S+\\.\\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      onSubmit && onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: '#333'
        }}>
          Welcome Back
        </h2>
        <p style={{
          color: '#666',
          marginBottom: '32px'
        }}>
          Sign in to continue
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: errors.email ? '2px solid #ef4444' : '2px solid #e5e7eb',
                fontSize: '16px',
                transition: 'border 0.3s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = errors.email ? '#ef4444' : '#e5e7eb'}
            />
            {errors.email && (
              <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>
                {errors.email}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: errors.password ? '2px solid #ef4444' : '2px solid #e5e7eb',
                fontSize: '16px',
                transition: 'border 0.3s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = errors.password ? '#ef4444' : '#e5e7eb'}
            />
            {errors.password && (
              <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              background: isLoading 
                ? '#e5e7eb'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: isLoading ? '#666' : 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              transform: 'scale(1)'
            }}
            onMouseEnter={(e) => !isLoading && (e.target.style.transform = 'scale(1.02)')}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            {isLoading ? 'Processing...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          Don't have an account?
          <a href="#" style={{
            color: '#667eea',
            marginLeft: '4px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}>
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
};

//export default LoginComponent;`;

        return {
            code,
            name: 'LoginComponent',
            type: 'form',
            styling: 'modern-gradient',
            explanation: 'Login component with validation and loading states'
        };
    }

    generateSignupForm() {
        const code = `const SignupComponent = ({ onSubmit }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = React.useState({});
  const [isLoading, setIsLoading] = React.useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name) newErrors.name = 'Name is required';
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\\S+@\\S+\\.\\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      onSubmit && onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: '#333'
        }}>
          Create Account
        </h2>
        <p style={{
          color: '#666',
          marginBottom: '32px'
        }}>
          Sign up for a new account
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: errors.name ? '2px solid #ef4444' : '2px solid #e5e7eb',
                fontSize: '16px',
                transition: 'border 0.3s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = errors.name ? '#ef4444' : '#e5e7eb'}
            />
            {errors.name && (
              <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>
                {errors.name}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: errors.email ? '2px solid #ef4444' : '2px solid #e5e7eb',
                fontSize: '16px',
                transition: 'border 0.3s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = errors.email ? '#ef4444' : '#e5e7eb'}
            />
            {errors.email && (
              <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>
                {errors.email}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: errors.password ? '2px solid #ef4444' : '2px solid #e5e7eb',
                fontSize: '16px',
                transition: 'border 0.3s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = errors.password ? '#ef4444' : '#e5e7eb'}
            />
            {errors.password && (
              <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>
                {errors.password}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: errors.confirmPassword ? '2px solid #ef4444' : '2px solid #e5e7eb',
                fontSize: '16px',
                transition: 'border 0.3s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : '#e5e7eb'}
            />
            {errors.confirmPassword && (
              <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              background: isLoading 
                ? '#e5e7eb'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: isLoading ? '#666' : 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              transform: 'scale(1)'
            }}
            onMouseEnter={(e) => !isLoading && (e.target.style.transform = 'scale(1.02)')}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            {isLoading ? 'Processing...' : 'Create Account'}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          Already have an account?
          <a href="#" style={{
            color: '#667eea',
            marginLeft: '4px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}>
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
};

//export default SignupComponent;`;

        return {
            code,
            name: 'SignupComponent',
            type: 'form',
            styling: 'modern-gradient',
            explanation: 'Signup component with validation and loading states'
        };
    }

    generateGenericForm() {
        const code = `const FormComponent = ({ onSubmit }) => {
  const [formData, setFormData] = React.useState({
    email: '',
    password: ''
  });
  
  const [errors, setErrors] = React.useState({});
  const [isLoading, setIsLoading] = React.useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\\S+@\\S+\\.\\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      onSubmit && onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: '#333'
        }}>
          Get Started
        </h2>
        <p style={{
          color: '#666',
          marginBottom: '32px'
        }}>
          Fill in the form below
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: errors.email ? '2px solid #ef4444' : '2px solid #e5e7eb',
                fontSize: '16px',
                transition: 'border 0.3s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = errors.email ? '#ef4444' : '#e5e7eb'}
            />
            {errors.email && (
              <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>
                {errors.email}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: errors.password ? '2px solid #ef4444' : '2px solid #e5e7eb',
                fontSize: '16px',
                transition: 'border 0.3s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = errors.password ? '#ef4444' : '#e5e7eb'}
            />
            {errors.password && (
              <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              background: isLoading 
                ? '#e5e7eb'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: isLoading ? '#666' : 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              transform: 'scale(1)'
            }}
            onMouseEnter={(e) => !isLoading && (e.target.style.transform = 'scale(1.02)')}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            {isLoading ? 'Processing...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
};

//export default FormComponent;`;

        return {
            code,
            name: 'FormComponent',
            type: 'form',
            styling: 'modern-gradient',
            explanation: 'Form component with validation and loading states'
        };
    }

    generateCardComponent(prompt) {
        const code = `// React component (no imports needed for preview)

const CardComponent = ({ 
  title = "Card Title",
  subtitle = "Card subtitle goes here",
  image = "https://via.placeholder.com/400x200/667eea/ffffff?text=Card+Image",
  description = "This is a beautiful card component with hover effects and modern styling. It can be used for various purposes.",
  actions = true,
  avatar = "https://via.placeholder.com/40/667eea/ffffff?text=U"
}) => {
  const [liked, setLiked] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  return (
    <div style={{
      maxWidth: '400px',
      background: 'white',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
      transition: 'transform 0.3s, box-shadow 0.3s',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-10px)';
      e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
    }}>
      <div style={{
        height: '200px',
        background: \`url(\${image}) center/cover\`,
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSaved(!saved);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}>
          <span style={{ fontSize: '20px' }}>{saved ? '💾' : '📌'}</span>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <img 
            src={avatar} 
            alt="Avatar"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              marginRight: '12px'
            }}
          />
          <div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: '#333',
              margin: 0
            }}>
              {title}
            </h3>
            <p style={{ 
              fontSize: '14px', 
              color: '#999',
              margin: 0
            }}>
              {subtitle}
            </p>
          </div>
        </div>

        <p style={{
          color: '#666',
          lineHeight: '1.6',
          marginBottom: '20px'
        }}>
          {description}
        </p>

        {actions && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #f0f0f0',
            paddingTop: '16px'
          }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLiked(!liked);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: liked ? '#ef4444' : '#999',
                  transition: 'color 0.3s'
                }}
              >
                <span style={{ fontSize: '20px' }}>{liked ? '❤️' : '🤍'}</span>
                <span style={{ fontSize: '14px' }}>23</span>
              </button>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#999'
                }}
              >
                <span style={{ fontSize: '20px' }}>💬</span>
                <span style={{ fontSize: '14px' }}>12</span>
              </button>
            </div>
            <button
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 20px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'transform 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              View More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

//export default CardComponent;`;

        return {
            code,
            name: 'CardComponent',
            type: 'card',
            styling: 'modern-interactive',
            explanation: 'Interactive card component with image, actions, and hover effects'
        };
    }

    generateNavigationComponent(prompt) {
        const code = `// React component (no imports needed for preview)

const NavigationComponent = ({ 
  brand = "YourBrand",
  links = [
    { label: 'Home', href: '#home' },
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' }
  ],
  onLinkClick
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [activeLink, setActiveLink] = React.useState(0);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = (link, index) => {
    setActiveLink(index);
    setMobileMenuOpen(false);
    onLinkClick && onLinkClick(link);
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'white',
      backdropFilter: scrolled ? 'blur(10px)' : 'none',
      boxShadow: scrolled ? '0 4px 20px rgba(0, 0, 0, 0.1)' : '0 2px 10px rgba(0, 0, 0, 0.05)',
      transition: 'all 0.3s ease',
      padding: '16px 0'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Brand */}
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          cursor: 'pointer'
        }}>
          {brand}
        </div>

        {/* Desktop Menu */}
        <div className="desktop-menu" style={{
          display: 'flex',
          gap: '32px',
          alignItems: 'center'
        }}>
          {links.map((link, index) => (
            <a
              key={index}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick(link, index);
              }}
              style={{
                color: activeLink === index ? '#667eea' : '#333',
                textDecoration: 'none',
                fontWeight: activeLink === index ? 'bold' : '500',
                position: 'relative',
                transition: 'color 0.3s',
                padding: '5px 0'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#667eea';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = activeLink === index ? '#667eea' : '#333';
              }}
            >
              {link.label}
              {activeLink === index && (
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '2px'
                }} />
              )}
            </a>
          ))}
          
          <button style={{
            padding: '10px 24px',
            borderRadius: '25px',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'transform 0.3s, box-shadow 0.3s'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 10px 20px rgba(102, 126, 234, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}>
            Get Started
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '5px'
          }}
          className="mobile-menu-button"
        >
          <div style={{
            width: '25px',
            height: '2px',
            background: '#333',
            margin: '5px 0',
            transition: 'all 0.3s',
            transform: mobileMenuOpen ? 'rotate(45deg) translateY(7px)' : 'none'
          }} />
          <div style={{
            width: '25px',
            height: '2px',
            background: '#333',
            margin: '5px 0',
            transition: 'all 0.3s',
            opacity: mobileMenuOpen ? 0 : 1
          }} />
          <div style={{
            width: '25px',
            height: '2px',
            background: '#333',
            margin: '5px 0',
            transition: 'all 0.3s',
            transform: mobileMenuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none'
          }} />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div style={{
          position: 'absolute',
          top: '70px',
          left: 0,
          right: 0,
          background: 'white',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
          padding: '20px',
          animation: 'slideDown 0.3s ease'
        }}>
          {links.map((link, index) => (
            <a
              key={index}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick(link, index);
              }}
              style={{
                display: 'block',
                padding: '12px 0',
                color: activeLink === index ? '#667eea' : '#333',
                textDecoration: 'none',
                fontWeight: activeLink === index ? 'bold' : '500',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              {link.label}
            </a>
          ))}
          
          <button style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px',
            borderRadius: '25px',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>
            Get Started
          </button>
        </div>
      )}

      <style>{\`
        @media (max-width: 768px) {
          .desktop-menu { display: none !important; }
          .mobile-menu-button { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu-button { display: none !important; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      \`}</style>
    </nav>
  );
};

//export default NavigationComponent;`;

        return {
            code,
            name: 'NavigationComponent',
            type: 'navigation',
            styling: 'modern-sticky',
            explanation: 'Responsive navigation bar with mobile menu and active states'
        };
    }

    generateHeroComponent(prompt) {
        const code = `// React component (no imports needed for preview)

const HeroComponent = ({ 
  title = "Build Something Amazing",
  subtitle = "Transform your ideas into reality with our powerful platform",
  ctaText = "Get Started",
  secondaryCtaText = "Learn More",
  onCtaClick,
  onSecondaryClick,
  showAnimation = true
}) => {
  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      {/* Animated Background */}
      {showAnimation && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1
        }}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: \`\${200 + i * 100}px\`,
                height: \`\${200 + i * 100}px\`,
                border: '2px solid white',
                borderRadius: '50%',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                animation: \`pulse \${3 + i}s infinite\`
              }}
            />
          ))}
        </div>
      )}

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        position: 'relative',
        zIndex: 1,
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: 'clamp(2.5rem, 5vw, 4rem)',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '24px',
          animation: showAnimation ? 'fadeInUp 0.8s ease' : 'none'
        }}>
          {title}
        </h1>
        
        <p style={{
          fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
          color: 'rgba(255, 255, 255, 0.95)',
          marginBottom: '48px',
          maxWidth: '600px',
          margin: '0 auto 48px',
          lineHeight: '1.6',
          animation: showAnimation ? 'fadeInUp 1s ease' : 'none'
        }}>
          {subtitle}
        </p>

        <div style={{
          display: 'flex',
          gap: '20px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          animation: showAnimation ? 'fadeInUp 1.2s ease' : 'none'
        }}>
          <button
            onClick={onCtaClick}
            style={{
              padding: '16px 40px',
              fontSize: '18px',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '30px',
              background: 'white',
              color: '#667eea',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-3px)';
              e.target.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
            }}
          >
            {ctaText}
          </button>

          <button
            onClick={onSecondaryClick}
            style={{
              padding: '16px 40px',
              fontSize: '18px',
              fontWeight: 'bold',
              border: '2px solid white',
              borderRadius: '30px',
              background: 'transparent',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {secondaryCtaText}
          </button>
        </div>
      </div>

      <style>{\`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.2;
          }
        }
      \`}</style>
    </section>
  );
};

//export default HeroComponent;`;

        return {
            code,
            name: 'HeroComponent',
            type: 'hero',
            styling: 'gradient-animated',
            explanation: 'Animated hero section with gradient background and CTAs'
        };
    }

    generateButtonComponent(prompt) {
        const hasGlow = prompt.includes('glow');
        const hasGradient = prompt.includes('gradient');
        const isFloating = prompt.includes('float');
        
        if (hasGlow) {
            return this.generateGlowButton();
        } else if (hasGradient) {
            return this.generateGradientButton();
        } else if (isFloating) {
            return this.generateFloatingButton();
        } else {
            return this.generateStandardButton();
        }
    }

    generateStandardButton() {
        const code = `const ButtonComponent = ({ 
  children = "Click Me",
  onClick,
  variant = "default",
  size = "medium",
  disabled = false,
  loading = false,
  icon,
  className = ""
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const sizes = {
    small: { padding: '8px 16px', fontSize: '14px' },
    medium: { padding: '12px 24px', fontSize: '16px' },
    large: { padding: '16px 32px', fontSize: '18px' }
  };

  const variants = {
    default: {
      background: '#667eea',
      color: 'white',
      border: 'none',
      boxShadow: '0 4px 6px rgba(102, 126, 234, 0.2)'
    },
    outline: {
      background: 'transparent',
      color: '#667eea',
      border: '2px solid #667eea',
      boxShadow: 'none'
    }
  };

  const baseStyle = {
    ...sizes[size],
    ...variants[variant],
    borderRadius: '12px',
    fontWeight: 'bold',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    position: 'relative',
    transform: \`\${isPressed ? 'scale(0.95)' : isHovered ? 'scale(1.05) translateY(-2px)' : 'scale(1)'}\`,
    filter: disabled ? 'grayscale(1)' : 'none'
  };

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <>
      <button
        style={baseStyle}
        className={className}
        disabled={disabled || loading}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
      >
        {loading && (
          <span style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite'
          }} />
        )}
        {icon && !loading && <span>{icon}</span>}
        {children}
      </button>

      <style>{\`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      \`}</style>
    </>
  );
};

//export default ButtonComponent;`;

        return {
            code,
            name: 'ButtonComponent',
            type: 'button',
            styling: 'modern',
            explanation: 'Advanced button component with modern design'
        };
    }

    generateGradientButton() {
        const code = `const GradientButtonComponent = ({ 
  children = "Click Me",
  onClick,
  variant = "gradient",
  size = "medium",
  disabled = false,
  loading = false,
  icon,
  className = ""
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const sizes = {
    small: { padding: '8px 16px', fontSize: '14px' },
    medium: { padding: '12px 24px', fontSize: '16px' },
    large: { padding: '16px 32px', fontSize: '18px' }
  };

  const variants = {
    gradient: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
    },
    outline: {
      background: 'transparent',
      color: '#667eea',
      border: '2px solid #667eea',
      boxShadow: 'none'
    }
  };

  const baseStyle = {
    ...sizes[size],
    ...variants[variant],
    borderRadius: '12px',
    fontWeight: 'bold',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    position: 'relative',
    transform: \`\${isPressed ? 'scale(0.95)' : isHovered ? 'scale(1.05) translateY(-2px)' : 'scale(1)'}\`,
    filter: disabled ? 'grayscale(1)' : 'none'
  };

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <>
      <button
        style={baseStyle}
        className={className}
        disabled={disabled || loading}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
      >
        {loading && (
          <span style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite'
          }} />
        )}
        {icon && !loading && <span>{icon}</span>}
        {children}
      </button>

      <style>{\`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      \`}</style>
    </>
  );
};

//export default GradientButtonComponent;`;

        return {
            code,
            name: 'GradientButtonComponent',
            type: 'button',
            styling: 'gradient',
            explanation: 'Advanced button component with gradient styling'
        };
    }

    generateGlowButton() {
        const code = `const GlowButtonComponent = ({ 
  children = "Click Me",
  onClick,
  variant = "glow",
  size = "medium",
  disabled = false,
  loading = false,
  icon,
  className = ""
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const sizes = {
    small: { padding: '8px 16px', fontSize: '14px' },
    medium: { padding: '12px 24px', fontSize: '16px' },
    large: { padding: '16px 32px', fontSize: '18px' }
  };

  const variants = {
    glow: {
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: 'white',
      border: 'none',
      boxShadow: '0 0 20px rgba(240, 147, 251, 0.5)',
      animation: 'glow 2s ease-in-out infinite'
    },
    outline: {
      background: 'transparent',
      color: '#f093fb',
      border: '2px solid #f093fb',
      boxShadow: 'none'
    }
  };

  const baseStyle = {
    ...sizes[size],
    ...variants[variant],
    borderRadius: '12px',
    fontWeight: 'bold',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    position: 'relative',
    transform: \`\${isPressed ? 'scale(0.95)' : isHovered ? 'scale(1.05) translateY(-2px)' : 'scale(1)'}\`,
    filter: disabled ? 'grayscale(1)' : 'none'
  };

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <>
      <button
        style={baseStyle}
        className={className}
        disabled={disabled || loading}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
      >
        {loading && (
          <span style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite'
          }} />
        )}
        {icon && !loading && <span>{icon}</span>}
        {children}
      </button>

      <style>{\`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(240, 147, 251, 0.5);
          }
          50% {
            box-shadow: 0 0 30px rgba(240, 147, 251, 0.8), 0 0 60px rgba(240, 147, 251, 0.4);
          }
        }
      \`}</style>
    </>
  );
};

//export default GlowButtonComponent;`;

        return {
            code,
            name: 'GlowButtonComponent',
            type: 'button',
            styling: 'glow-effect',
            explanation: 'Advanced button component with glow effect'
        };
    }

    generateFloatingButton() {
        const code = `const FloatingButtonComponent = ({ 
  children = "✨",
  onClick,
  variant = "floating",
  disabled = false,
  loading = false,
  icon,
  className = ""
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const baseStyle = {
    padding: '16px',
    fontSize: '18px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    fontWeight: 'bold',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    width: '60px',
    height: '60px',
    zIndex: 1000,
    transform: \`\${isPressed ? 'scale(0.95)' : isHovered ? 'scale(1.1) translateY(-3px)' : 'scale(1)'}\`,
    filter: disabled ? 'grayscale(1)' : 'none',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
  };

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <>
      <button
        style={baseStyle}
        className={className}
        disabled={disabled || loading}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        title="Floating Action Button"
      >
        {loading && (
          <span style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite'
          }} />
        )}
        {!loading && (icon || children)}
      </button>

      <style>{\`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      \`}</style>
    </>
  );
};

//export default FloatingButtonComponent;`;

        return {
            code,
            name: 'FloatingButtonComponent',
            type: 'button',
            styling: 'floating',
            explanation: 'Advanced button component with floating animation'
        };
    }

    generateGenericComponent(prompt) {
        const componentName = this.generateComponentName(prompt);
        
        const code = `// React component (no imports needed for preview)

const ${componentName} = ({ 
  title = "${prompt}",
  children,
  className = ""
}) => {
  return (
    <div 
      className={className}
      style={{
        padding: '32px',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <h2 style={{
        fontSize: '28px',
        fontWeight: 'bold',
        marginBottom: '16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        {title}
      </h2>
      
      <div style={{
        textAlign: 'center',
        color: '#666',
        fontSize: '16px',
        lineHeight: '1.6'
      }}>
        {children || \`This is a custom ${componentName} component. Add your content here.\`}
      </div>
    </div>
  );
};

//export default ${componentName};`;

        return {
            code,
            name: componentName,
            type: 'generic',
            styling: 'modern-gradient',
            explanation: 'Custom component based on your requirements'
        };
    }

    generateComponentName(prompt) {
        // Extract meaningful words from prompt
        const words = prompt
            .replace(/[^a-zA-Z\s]/g, '')
            .split(' ')
            .filter(word => word.length > 2)
            .slice(0, 3);
        
        // Capitalize first letter of each word
        const name = words
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
        
        return name + 'Component' || 'CustomComponent';
    }
}

// Export singleton instance
const pureCodeClient = new PureCodeClient();

module.exports = {
    getPureCodeClient: () => pureCodeClient
};