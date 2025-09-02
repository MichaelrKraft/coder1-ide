// Enhanced React Bits Client - Comprehensive Component Library
class ReactBitsClient {
    constructor() {
        this.components = this.initializeComponents();
        this.categories = this.getCategories();
        this.componentGenerators = this.initializeComponentGenerators();
    }

    getCategories() {
        return {
            buttons: { name: 'Buttons', icon: '🔘', description: 'Interactive button components', count: 0 },
            cards: { name: 'Cards', icon: '🃏', description: 'Card layouts and containers', count: 0 },
            navigation: { name: 'Navigation', icon: '🧭', description: 'Navigation components', count: 0 },
            forms: { name: 'Forms', icon: '📝', description: 'Form inputs and controls', count: 0 },
            animations: { name: 'Animations', icon: '✨', description: 'Animated text and effects', count: 0 },
            layouts: { name: 'Layouts', icon: '📐', description: 'Layout and grid components', count: 0 },
            loaders: { name: 'Loaders', icon: '⏳', description: 'Loading animations', count: 0 },
            modals: { name: 'Modals', icon: '🪟', description: 'Modal and dialog components', count: 0 },
            icons: { name: 'Icons', icon: '🎨', description: 'Icon components and animations', count: 0 },
            data: { name: 'Data Display', icon: '📊', description: 'Tables, lists, and data visualization', count: 0 },
            backgrounds: { name: 'Backgrounds', icon: '🌄', description: 'Background effects and patterns', count: 0 }
        };
    }

    initializeComponents() {
        return {
            // === BUTTON COMPONENTS ===
            'button-animated': {
                name: 'Animated Button',
                category: 'buttons',
                description: 'A button with smooth hover animations and scale effects',
                dependencies: [],
                tags: ['hover', 'scale', 'gradient'],
                variants: {
                    size: ['sm', 'md', 'lg'],
                    variant: ['primary', 'secondary', 'danger', 'success']
                },
                code: `const AnimatedButton = ({ children, onClick, variant = 'primary', size = 'md' }) => {
    const sizeClasses = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg'
    };
    
    const variantStyles = {
        primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        danger: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
        success: 'linear-gradient(135deg, #00b894 0%, #00a085 100%)'
    };
    
    return (
        <button 
            onClick={onClick}
            className={\`\${sizeClasses[size]} rounded-lg font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-white\`}
            style={{ background: variantStyles[variant] }}
        >
            {children}
        </button>
    );
};`
            },

            'button-glow': {
                name: 'Glow Button',
                category: 'buttons',
                description: 'A button with a glowing effect and floating animation',
                dependencies: [],
                tags: ['glow', 'shadow', 'float'],
                variants: {
                    color: ['purple', 'blue', 'green', 'pink'],
                    intensity: ['subtle', 'medium', 'strong']
                },
                code: `const GlowButton = ({ children, onClick, color = 'purple', intensity = 'medium' }) => {
    const colorClasses = {
        purple: 'from-purple-500 to-pink-500 hover:shadow-purple-500/50',
        blue: 'from-blue-500 to-cyan-500 hover:shadow-blue-500/50',
        green: 'from-green-500 to-emerald-500 hover:shadow-green-500/50',
        pink: 'from-pink-500 to-rose-500 hover:shadow-pink-500/50'
    };
    
    const intensityClasses = {
        subtle: 'hover:shadow-lg',
        medium: 'hover:shadow-xl',
        strong: 'hover:shadow-2xl'
    };
    
    return (
        <button 
            onClick={onClick}
            className={\`px-8 py-4 bg-gradient-to-r \${colorClasses[color]} text-white font-bold rounded-full transition-all duration-300 \${intensityClasses[intensity]} transform hover:-translate-y-1\`}
        >
            {children}
        </button>
    );
};`
            },

            'button-ripple': {
                name: 'Ripple Button',
                category: 'buttons',
                description: 'Material Design inspired ripple effect button',
                dependencies: ['react'],
                tags: ['ripple', 'material', 'click'],
                variants: {
                    shape: ['rounded', 'pill', 'square'],
                    color: ['blue', 'red', 'green', 'gray']
                },
                code: `const RippleButton = ({ children, onClick, color = 'blue', shape = 'rounded' }) => {
    const [ripples, setRipples] = useState([]);
    
    const shapeClasses = {
        rounded: 'rounded-lg',
        pill: 'rounded-full',
        square: 'rounded-none'
    };
    
    const colorClasses = {
        blue: 'bg-blue-500 hover:bg-blue-600',
        red: 'bg-red-500 hover:bg-red-600',
        green: 'bg-green-500 hover:bg-green-600',
        gray: 'bg-gray-500 hover:bg-gray-600'
    };
    
    const createRipple = (event) => {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        const newRipple = {
            x, y, size,
            id: Date.now()
        };
        
        setRipples(ripples => [...ripples, newRipple]);
        setTimeout(() => {
            setRipples(ripples => ripples.filter(ripple => ripple.id !== newRipple.id));
        }, 600);
        
        onClick && onClick(event);
    };
    
    return (
        <button 
            className={\`relative overflow-hidden px-6 py-3 \${shapeClasses[shape]} \${colorClasses[color]} text-white font-medium transition-colors duration-200\`}
            onClick={createRipple}
        >
            {children}
            {ripples.map(ripple => (
                <span
                    key={ripple.id}
                    className="absolute bg-white/30 rounded-full animate-ping"
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        width: ripple.size,
                        height: ripple.size
                    }}
                />
            ))}
        </button>
    );
};`
            },

            'button-magnetic': {
                name: 'Magnetic Button',
                category: 'buttons',
                description: 'Button that follows mouse movement with magnetic effect',
                dependencies: ['react'],
                tags: ['magnetic', 'mouse', 'interactive'],
                variants: {
                    strength: ['weak', 'medium', 'strong'],
                    style: ['minimal', 'gradient', 'outlined']
                },
                code: `const MagneticButton = ({ children, onClick, strength = 'medium', style = 'gradient' }) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const buttonRef = useRef(null);
    
    const strengthMultiplier = {
        weak: 0.2,
        medium: 0.4,
        strong: 0.6
    };
    
    const styleClasses = {
        minimal: 'bg-black text-white border-2 border-black',
        gradient: 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white',
        outlined: 'bg-transparent text-black border-2 border-black hover:bg-black hover:text-white'
    };
    
    const handleMouseMove = (e) => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) * strengthMultiplier[strength];
        const y = (e.clientY - rect.top - rect.height / 2) * strengthMultiplier[strength];
        setPosition({ x, y });
    };
    
    const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 });
    };
    
    return (
        <button
            ref={buttonRef}
            className={\`px-8 py-4 rounded-lg font-medium transition-all duration-300 \${styleClasses[style]}\`}
            style={{
                transform: \`translate(\${position.x}px, \${position.y}px)\`
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
        >
            {children}
        </button>
    );
};`
            },

            'button-split': {
                name: 'Split Button',
                category: 'buttons',
                description: 'Button with dropdown action menu',
                dependencies: ['react'],
                tags: ['dropdown', 'split', 'menu'],
                variants: {
                    size: ['sm', 'md', 'lg'],
                    position: ['bottom', 'top', 'left', 'right']
                },
                code: `const SplitButton = ({ children, actions = [], size = 'md', position = 'bottom' }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
    };
    
    const positionClasses = {
        bottom: 'top-full left-0 mt-1',
        top: 'bottom-full left-0 mb-1',
        left: 'right-full top-0 mr-1',
        right: 'left-full top-0 ml-1'
    };
    
    return (
        <div className="relative inline-flex">
            <button className={\`\${sizeClasses[size]} bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-l-lg transition-colors\`}>
                {children}
            </button>
            <button 
                className={\`\${sizeClasses[size]} bg-blue-500 hover:bg-blue-600 text-white border-l border-blue-400 rounded-r-lg transition-colors\`}
                onClick={() => setIsOpen(!isOpen)}
            >
                ▼
            </button>
            {isOpen && (
                <div className={\`absolute \${positionClasses[position]} bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-full\`}>
                    {actions.map((action, index) => (
                        <button
                            key={index}
                            className="block w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                            onClick={() => {
                                action.onClick();
                                setIsOpen(false);
                            }}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};`
            },

            // === CARD COMPONENTS ===
            'card-glass': {
                name: 'Glass Card',
                category: 'cards',
                description: 'Modern glassmorphism card with backdrop blur effect',
                dependencies: [],
                tags: ['glassmorphism', 'blur', 'modern'],
                variants: {
                    blur: ['light', 'medium', 'heavy'],
                    border: ['subtle', 'visible', 'glow']
                },
                code: `const GlassCard = ({ children, title, blur = 'medium', border = 'subtle' }) => {
    const blurClasses = {
        light: 'backdrop-blur-sm',
        medium: 'backdrop-blur-md',
        heavy: 'backdrop-blur-lg'
    };
    
    const borderClasses = {
        subtle: 'border border-white/10',
        visible: 'border border-white/30',
        glow: 'border border-white/20 shadow-lg shadow-white/10'
    };
    
    return (
        <div className={\`\${blurClasses[blur]} bg-white/10 \${borderClasses[border]} rounded-xl p-6\`}>
            {title && <h3 className="text-xl font-semibold mb-4 text-white">{title}</h3>}
            <div className="text-white/90">
                {children}
            </div>
        </div>
    );
};`
            },

            'card-hover-3d': {
                name: '3D Hover Card',
                category: 'cards',
                description: 'Card with 3D tilt effect on hover',
                dependencies: ['react'],
                tags: ['3d', 'tilt', 'perspective'],
                variants: {
                    intensity: ['subtle', 'medium', 'strong'],
                    shadow: ['soft', 'medium', 'dramatic']
                },
                code: `const HoverCard3D = ({ children, title, intensity = 'medium', shadow = 'medium' }) => {
    const [transform, setTransform] = useState('');
    const cardRef = useRef(null);
    
    const intensityMultiplier = {
        subtle: 0.5,
        medium: 1,
        strong: 1.5
    };
    
    const shadowClasses = {
        soft: 'shadow-md',
        medium: 'shadow-lg',
        dramatic: 'shadow-2xl'
    };
    
    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / centerY * -10 * intensityMultiplier[intensity];
        const rotateY = (x - centerX) / centerX * 10 * intensityMultiplier[intensity];
        
        setTransform(\`perspective(1000px) rotateX(\${rotateX}deg) rotateY(\${rotateY}deg) scale3d(1.05, 1.05, 1.05)\`);
    };
    
    const handleMouseLeave = () => {
        setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    };
    
    return (
        <div
            ref={cardRef}
            className={\`bg-white rounded-xl p-6 transition-transform duration-300 \${shadowClasses[shadow]}\`}
            style={{ transform }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {title && <h3 className="text-xl font-semibold mb-4 text-gray-800">{title}</h3>}
            <div className="text-gray-600">
                {children}
            </div>
        </div>
    );
};`
            },

            'card-neon': {
                name: 'Neon Card',
                category: 'cards',
                description: 'Cyberpunk-style neon glowing card',
                dependencies: [],
                tags: ['neon', 'cyberpunk', 'glow'],
                variants: {
                    color: ['cyan', 'pink', 'green', 'purple'],
                    animation: ['static', 'pulse', 'flow']
                },
                code: `const NeonCard = ({ children, title, color = 'cyan', animation = 'pulse' }) => {
    const colorClasses = {
        cyan: 'border-cyan-400 shadow-cyan-400/50 text-cyan-400',
        pink: 'border-pink-400 shadow-pink-400/50 text-pink-400',
        green: 'border-green-400 shadow-green-400/50 text-green-400',
        purple: 'border-purple-400 shadow-purple-400/50 text-purple-400'
    };
    
    const animationClasses = {
        static: '',
        pulse: 'animate-pulse',
        flow: 'animate-bounce'
    };
    
    return (
        <div className={\`bg-black border-2 \${colorClasses[color]} rounded-lg p-6 shadow-lg \${animationClasses[animation]}\`}>
            {title && <h3 className={\`text-xl font-bold mb-4 \${colorClasses[color].split(' ')[2]}\`}>{title}</h3>}
            <div className="text-gray-300">
                {children}
            </div>
        </div>
    );
};`
            },

            'card-pricing': {
                name: 'Pricing Card',
                category: 'cards',
                description: 'Professional pricing card with features list',
                dependencies: [],
                tags: ['pricing', 'features', 'professional'],
                variants: {
                    style: ['basic', 'premium', 'enterprise'],
                    billing: ['monthly', 'yearly']
                },
                code: `const PricingCard = ({ 
    title, 
    price, 
    billing = 'monthly', 
    features = [], 
    highlighted = false, 
    onSelect 
}) => {
    return (
        <div className={\`relative bg-white rounded-2xl p-8 \${highlighted ? 'ring-2 ring-blue-500 shadow-xl' : 'shadow-lg'} transition-all duration-300 hover:shadow-xl\`}>
            {highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                    </span>
                </div>
            )}
            <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
                <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">\${price}</span>
                    <span className="text-gray-500">/{billing}</span>
                </div>
                <ul className="space-y-3 mb-8">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                            <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-gray-700">{feature}</span>
                        </li>
                    ))}
                </ul>
                <button
                    onClick={onSelect}
                    className={\`w-full py-3 px-6 rounded-lg font-medium transition-colors \${
                        highlighted 
                            ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }\`}
                >
                    Get Started
                </button>
            </div>
        </div>
    );
};`
            },

            // === NAVIGATION COMPONENTS ===
            'nav-floating': {
                name: 'Floating Navigation',
                category: 'navigation',
                description: 'Floating navigation bar with smooth transitions',
                dependencies: [],
                tags: ['floating', 'smooth', 'modern'],
                variants: {
                    position: ['top', 'bottom'],
                    style: ['minimal', 'glassmorphism', 'solid']
                },
                code: `const FloatingNav = ({ items, position = 'top', style = 'glassmorphism' }) => {
    const positionClasses = {
        top: 'top-4',
        bottom: 'bottom-4'
    };
    
    const styleClasses = {
        minimal: 'bg-white/90 border border-gray-200',
        glassmorphism: 'bg-white/10 backdrop-blur-lg border border-white/20',
        solid: 'bg-gray-900 border border-gray-700'
    };
    
    const textClasses = {
        minimal: 'text-gray-800 hover:text-blue-600',
        glassmorphism: 'text-white hover:text-blue-300',
        solid: 'text-gray-300 hover:text-white'
    };
    
    return (
        <nav className={\`fixed \${positionClasses[position]} left-1/2 transform -translate-x-1/2 z-50\`}>
            <div className={\`\${styleClasses[style]} rounded-full px-6 py-3 shadow-lg\`}>
                <ul className="flex items-center space-x-6">
                    {items.map((item, index) => (
                        <li key={index}>
                            <a
                                href={item.href}
                                className={\`\${textClasses[style]} transition-colors duration-200 font-medium\`}
                            >
                                {item.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
};`
            },

            'nav-sidebar-animated': {
                name: 'Animated Sidebar',
                category: 'navigation',
                description: 'Collapsible sidebar with smooth animations',
                dependencies: ['react'],
                tags: ['sidebar', 'collapsible', 'animated'],
                variants: {
                    theme: ['light', 'dark', 'gradient'],
                    position: ['left', 'right']
                },
                code: `const AnimatedSidebar = ({ items, isOpen, onToggle, theme = 'dark', position = 'left' }) => {
    const themeClasses = {
        light: 'bg-white text-gray-800 border-gray-200',
        dark: 'bg-gray-900 text-white border-gray-700',
        gradient: 'bg-gradient-to-b from-purple-900 to-blue-900 text-white border-purple-700'
    };
    
    const positionClasses = {
        left: 'left-0',
        right: 'right-0'
    };
    
    return (
        <>
            <div className={\`fixed top-0 \${positionClasses[position]} h-full \${themeClasses[theme]} border-r transition-transform duration-300 z-40 \${isOpen ? 'translate-x-0' : position === 'left' ? '-translate-x-full' : 'translate-x-full'}\`}>
                <div className="w-64 p-4">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold">Menu</h2>
                        <button
                            onClick={onToggle}
                            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                    <nav>
                        <ul className="space-y-2">
                            {items.map((item, index) => (
                                <li key={index}>
                                    <a
                                        href={item.href}
                                        className="flex items-center p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200"
                                    >
                                        {item.icon && <span className="mr-3">{item.icon}</span>}
                                        {item.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>
            </div>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30"
                    onClick={onToggle}
                />
            )}
        </>
    );
};`
            },

            'nav-breadcrumbs': {
                name: 'Animated Breadcrumbs',
                category: 'navigation',
                description: 'Breadcrumb navigation with smooth transitions',
                dependencies: [],
                tags: ['breadcrumbs', 'navigation', 'animated'],
                variants: {
                    separator: ['arrow', 'slash', 'dot'],
                    style: ['simple', 'rounded', 'elevated']
                },
                code: `const AnimatedBreadcrumbs = ({ items, separator = 'arrow', style = 'simple' }) => {
    const separatorIcons = {
        arrow: '→',
        slash: '/',
        dot: '•'
    };
    
    const styleClasses = {
        simple: 'text-gray-600',
        rounded: 'bg-gray-100 px-3 py-1 rounded-full text-gray-600',
        elevated: 'bg-white shadow-sm px-3 py-2 rounded-lg text-gray-600'
    };
    
    return (
        <nav className="flex items-center space-x-2">
            {items.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                    {index > 0 && (
                        <span className="text-gray-400 animate-pulse">
                            {separatorIcons[separator]}
                        </span>
                    )}
                    <span className={\`\${styleClasses[style]} transition-all duration-200 \${item.href ? 'hover:text-blue-600 cursor-pointer' : 'font-medium text-gray-900'}\`}>
                        {item.href ? (
                            <a href={item.href}>{item.label}</a>
                        ) : (
                            item.label
                        )}
                    </span>
                </div>
            ))}
        </nav>
    );
};`
            },

            // === FORM COMPONENTS ===
            'input-floating-label': {
                name: 'Floating Label Input',
                category: 'forms',
                description: 'Input field with animated floating label',
                dependencies: ['react'],
                tags: ['floating', 'label', 'material'],
                variants: {
                    style: ['outlined', 'filled', 'underlined'],
                    color: ['blue', 'purple', 'green', 'red']
                },
                code: `const FloatingLabelInput = ({ label, type = 'text', value, onChange, style = 'outlined', color = 'blue' }) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value && value.length > 0;
    
    const colorClasses = {
        blue: 'border-blue-500 text-blue-600',
        purple: 'border-purple-500 text-purple-600',
        green: 'border-green-500 text-green-600',
        red: 'border-red-500 text-red-600'
    };
    
    const styleClasses = {
        outlined: 'border-2 rounded-lg bg-transparent',
        filled: 'border-b-2 border-t-0 border-l-0 border-r-0 bg-gray-50 rounded-t-lg',
        underlined: 'border-b-2 border-t-0 border-l-0 border-r-0 bg-transparent'
    };
    
    return (
        <div className="relative">
            <input
                type={type}
                value={value}
                onChange={onChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={\`w-full px-4 py-3 border-gray-300 \${styleClasses[style]} focus:outline-none focus:\${colorClasses[color]} transition-colors duration-200\`}
            />
            <label
                className={\`absolute left-4 transition-all duration-200 pointer-events-none \${
                    isFocused || hasValue
                        ? \`-top-2 text-sm \${colorClasses[color].split(' ')[1]} bg-white px-1\`
                        : 'top-3 text-gray-500'
                }\`}
            >
                {label}
            </label>
        </div>
    );
};`
            },

            'checkbox-animated': {
                name: 'Animated Checkbox',
                category: 'forms',
                description: 'Checkbox with smooth check animation',
                dependencies: ['react'],
                tags: ['checkbox', 'animated', 'custom'],
                variants: {
                    style: ['modern', 'classic', 'toggle'],
                    color: ['blue', 'green', 'purple', 'red']
                },
                code: `const AnimatedCheckbox = ({ checked, onChange, label, style = 'modern', color = 'blue' }) => {
    const colorClasses = {
        blue: 'bg-blue-500 border-blue-500',
        green: 'bg-green-500 border-green-500',
        purple: 'bg-purple-500 border-purple-500',
        red: 'bg-red-500 border-red-500'
    };
    
    const handleChange = () => {
        onChange(!checked);
    };
    
    return (
        <label className="flex items-center space-x-3 cursor-pointer">
            <div className="relative">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={handleChange}
                    className="sr-only"
                />
                <div className={\`w-5 h-5 border-2 rounded transition-all duration-200 \${
                    checked ? colorClasses[color] : 'border-gray-300 bg-white'
                }\`}>
                    {checked && (
                        <svg
                            className="w-3 h-3 text-white absolute top-0.5 left-0.5 animate-pulse"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                            />
                        </svg>
                    )}
                </div>
            </div>
            {label && <span className="text-gray-700">{label}</span>}
        </label>
    );
};`
            },

            'select-animated': {
                name: 'Animated Select Dropdown',
                category: 'forms',
                description: 'Custom select dropdown with smooth animations',
                dependencies: ['react'],
                tags: ['select', 'dropdown', 'animated'],
                variants: {
                    style: ['modern', 'minimal', 'rounded'],
                    animation: ['fade', 'slide', 'scale']
                },
                code: `const AnimatedSelect = ({ options, value, onChange, placeholder = "Select option", style = 'modern' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState(value || null);
    
    const styleClasses = {
        modern: 'border-2 border-gray-300 rounded-lg',
        minimal: 'border-b-2 border-gray-300',
        rounded: 'border-2 border-gray-300 rounded-full'
    };
    
    const handleSelect = (option) => {
        setSelectedOption(option);
        onChange(option);
        setIsOpen(false);
    };
    
    return (
        <div className="relative">
            <button
                className={\`w-full px-4 py-3 text-left \${styleClasses[style]} focus:outline-none focus:border-blue-500 transition-colors duration-200 bg-white\`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className={\`float-right transform transition-transform duration-200 \${isOpen ? 'rotate-180' : ''}\`}>
                    ▼
                </span>
            </button>
            
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 animate-fade-in">
                    {options.map((option, index) => (
                        <button
                            key={index}
                            className="w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg"
                            onClick={() => handleSelect(option)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};`
            },

            // === ANIMATION COMPONENTS ===
            'text-typewriter': {
                name: 'Typewriter Text',
                category: 'animations',
                description: 'Typewriter effect with customizable speed and cursor',
                dependencies: ['react'],
                tags: ['typewriter', 'text', 'cursor'],
                variants: {
                    speed: ['slow', 'medium', 'fast'],
                    cursor: ['blink', 'solid', 'none']
                },
                code: `const TypewriterText = ({ text, speed = 'medium', cursor = 'blink', onComplete }) => {
    const [displayText, setDisplayText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    
    const speedMs = {
        slow: 150,
        medium: 100,
        fast: 50
    };
    
    const cursorClasses = {
        blink: 'animate-pulse',
        solid: '',
        none: 'opacity-0'
    };
    
    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayText(text.slice(0, currentIndex + 1));
                setCurrentIndex(currentIndex + 1);
            }, speedMs[speed]);
            return () => clearTimeout(timeout);
        } else if (!isComplete) {
            setIsComplete(true);
            onComplete && onComplete();
        }
    }, [currentIndex, text, speed, isComplete, onComplete]);
    
    return (
        <span className="font-mono">
            {displayText}
            <span className={\`inline-block w-0.5 h-5 bg-current ml-1 \${cursorClasses[cursor]}\`}>|</span>
        </span>
    );
};`
            },

            'text-glitch': {
                name: 'Glitch Text',
                category: 'animations',
                description: 'Cyberpunk-style glitch text effect',
                dependencies: ['react'],
                tags: ['glitch', 'cyberpunk', 'distortion'],
                variants: {
                    intensity: ['subtle', 'medium', 'extreme'],
                    color: ['red', 'cyan', 'green', 'purple']
                },
                code: `const GlitchText = ({ children, intensity = 'medium', color = 'red' }) => {
    const [isGlitching, setIsGlitching] = useState(false);
    
    const intensityClasses = {
        subtle: 'animate-pulse',
        medium: 'animate-bounce',
        extreme: 'animate-ping'
    };
    
    const colorClasses = {
        red: 'text-red-500',
        cyan: 'text-cyan-500',
        green: 'text-green-500',
        purple: 'text-purple-500'
    };
    
    useEffect(() => {
        const interval = setInterval(() => {
            setIsGlitching(true);
            setTimeout(() => setIsGlitching(false), 200);
        }, 2000);
        
        return () => clearInterval(interval);
    }, []);
    
    return (
        <span className={\`relative \${colorClasses[color]}\`}>
            <span className={\`\${isGlitching ? intensityClasses[intensity] : ''}\`}>
                {children}
            </span>
            {isGlitching && (
                <>
                    <span className="absolute top-0 left-0 opacity-80 text-red-500" style={{ transform: 'translate(-2px, 0)' }}>
                        {children}
                    </span>
                    <span className="absolute top-0 left-0 opacity-80 text-cyan-500" style={{ transform: 'translate(2px, 0)' }}>
                        {children}
                    </span>
                </>
            )}
        </span>
    );
};`
            },

            'text-rainbow': {
                name: 'Rainbow Text',
                category: 'animations',
                description: 'Animated rainbow gradient text',
                dependencies: [],
                tags: ['rainbow', 'gradient', 'colorful'],
                variants: {
                    speed: ['slow', 'medium', 'fast'],
                    direction: ['left', 'right']
                },
                code: `const RainbowText = ({ children, speed = 'medium', direction = 'right' }) => {
    const speedClasses = {
        slow: 'animate-pulse',
        medium: 'animate-bounce',
        fast: 'animate-ping'
    };
    
    const gradientDirection = direction === 'right' 
        ? 'bg-gradient-to-r' 
        : 'bg-gradient-to-l';
    
    return (
        <span className={\`\${gradientDirection} from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent font-bold \${speedClasses[speed]}\`}>
            {children}
        </span>
    );
};`
            },

            'text-wave': {
                name: 'Wave Text Animation',
                category: 'animations',
                description: 'Text with wave animation effect',
                dependencies: ['react'],
                tags: ['wave', 'animation', 'bounce'],
                variants: {
                    speed: ['slow', 'medium', 'fast'],
                    amplitude: ['small', 'medium', 'large']
                },
                code: `const WaveText = ({ children, speed = 'medium', amplitude = 'medium' }) => {
    const text = typeof children === 'string' ? children : '';
    
    const speedClasses = {
        slow: 'duration-1000',
        medium: 'duration-700',
        fast: 'duration-500'
    };
    
    const amplitudeClasses = {
        small: '-translate-y-1',
        medium: '-translate-y-2',
        large: '-translate-y-4'
    };
    
    return (
        <span className="inline-flex">
            {text.split('').map((char, index) => (
                <span
                    key={index}
                    className={\`inline-block transition-transform \${speedClasses[speed]} hover:\${amplitudeClasses[amplitude]}\`}
                    style={{
                        animationDelay: \`\${index * 0.1}s\`,
                        animation: \`wave \${speedClasses[speed].replace('duration-', '')}ms infinite \${index * 0.1}s\`
                    }}
                >
                    {char === ' ' ? '\u00A0' : char}
                </span>
            ))}
        </span>
    );
};`
            },

            // === LOADER COMPONENTS ===
            'loader-dots': {
                name: 'Animated Dots Loader',
                category: 'loaders',
                description: 'Three bouncing dots loading animation',
                dependencies: [],
                tags: ['dots', 'bouncing', 'loading'],
                variants: {
                    size: ['sm', 'md', 'lg'],
                    color: ['blue', 'gray', 'purple', 'green']
                },
                code: `const DotsLoader = ({ size = 'md', color = 'blue' }) => {
    const sizeClasses = {
        sm: 'w-2 h-2',
        md: 'w-3 h-3',
        lg: 'w-4 h-4'
    };
    
    const colorClasses = {
        blue: 'bg-blue-500',
        gray: 'bg-gray-500',
        purple: 'bg-purple-500',
        green: 'bg-green-500'
    };
    
    return (
        <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className={\`\${sizeClasses[size]} \${colorClasses[color]} rounded-full animate-bounce\`}
                    style={{
                        animationDelay: \`\${i * 0.1}s\`
                    }}
                />
            ))}
        </div>
    );
};`
            },

            'loader-spinner': {
                name: 'Spinner Loader',
                category: 'loaders',
                description: 'Classic spinning circle loader',
                dependencies: [],
                tags: ['spinner', 'circle', 'rotate'],
                variants: {
                    size: ['sm', 'md', 'lg', 'xl'],
                    thickness: ['thin', 'medium', 'thick']
                },
                code: `const SpinnerLoader = ({ size = 'md', thickness = 'medium' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-12 h-12'
    };
    
    const thicknessClasses = {
        thin: 'border-2',
        medium: 'border-4',
        thick: 'border-8'
    };
    
    return (
        <div className={\`\${sizeClasses[size]} \${thicknessClasses[thickness]} border-gray-200 border-t-blue-500 rounded-full animate-spin\`} />
    );
};`
            },

            'loader-pulse': {
                name: 'Pulse Loader',
                category: 'loaders',
                description: 'Pulsing circle loader with ripple effect',
                dependencies: [],
                tags: ['pulse', 'ripple', 'circle'],
                variants: {
                    size: ['sm', 'md', 'lg'],
                    color: ['blue', 'purple', 'green', 'red']
                },
                code: `const PulseLoader = ({ size = 'md', color = 'blue' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };
    
    const colorClasses = {
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
        green: 'bg-green-500',
        red: 'bg-red-500'
    };
    
    return (
        <div className="relative flex items-center justify-center">
            <div className={\`\${sizeClasses[size]} \${colorClasses[color]} rounded-full animate-ping\`}></div>
            <div className={\`absolute \${sizeClasses[size]} \${colorClasses[color]} rounded-full animate-pulse\`}></div>
        </div>
    );
};`
            },

            'loader-skeleton': {
                name: 'Skeleton Loader',
                category: 'loaders',
                description: 'Shimmer skeleton loading placeholder',
                dependencies: [],
                tags: ['skeleton', 'shimmer', 'placeholder'],
                variants: {
                    variant: ['text', 'avatar', 'card', 'image'],
                    lines: ['1', '2', '3', '4']
                },
                code: `const SkeletonLoader = ({ variant = 'text', lines = 1, width, height }) => {
    const variants = {
        text: 'h-4 bg-gray-300 rounded',
        avatar: 'w-12 h-12 bg-gray-300 rounded-full',
        card: 'h-32 bg-gray-300 rounded-lg',
        image: 'h-48 bg-gray-300 rounded'
    };
    
    const shimmerClass = 'animate-pulse bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-[length:200%_100%]';
    
    if (variant === 'text' && lines > 1) {
        return (
            <div className="space-y-2">
                {Array.from({ length: lines }).map((_, index) => (
                    <div 
                        key={index}
                        className={\`\${variants[variant]} \${shimmerClass}\`}
                        style={{ 
                            width: index === lines - 1 ? '70%' : '100%',
                            ...(width && { width }),
                            ...(height && { height })
                        }}
                    />
                ))}
            </div>
        );
    }
    
    return (
        <div 
            className={\`\${variants[variant]} \${shimmerClass}\`}
            style={{
                ...(width && { width }),
                ...(height && { height })
            }}
        />
    );
};`
            },

            // === MODAL COMPONENTS ===
            'modal-fade': {
                name: 'Fade Modal',
                category: 'modals',
                description: 'Modal with smooth fade in/out transitions',
                dependencies: ['react'],
                tags: ['modal', 'fade', 'overlay'],
                variants: {
                    size: ['sm', 'md', 'lg', 'xl'],
                    backdrop: ['dark', 'light', 'blur']
                },
                code: `const FadeModal = ({ isOpen, onClose, children, title, size = 'md', backdrop = 'dark' }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl'
    };
    
    const backdropClasses = {
        dark: 'bg-black/50',
        light: 'bg-white/30',
        blur: 'bg-black/30 backdrop-blur-sm'
    };
    
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);
    
    if (!isVisible) return null;
    
    return (
        <div className={\`fixed inset-0 z-50 flex items-center justify-center p-4 \${backdropClasses[backdrop]} transition-opacity duration-300 \${isOpen ? 'opacity-100' : 'opacity-0'}\`}>
            <div
                className={\`bg-white rounded-lg shadow-xl \${sizeClasses[size]} w-full transform transition-all duration-300 \${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}\`}
            >
                {title && (
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                )}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};`
            },

            'modal-slide': {
                name: 'Slide Modal',
                category: 'modals',
                description: 'Modal that slides in from different directions',
                dependencies: ['react'],
                tags: ['modal', 'slide', 'direction'],
                variants: {
                    direction: ['top', 'bottom', 'left', 'right'],
                    size: ['sm', 'md', 'lg', 'full']
                },
                code: `const SlideModal = ({ isOpen, onClose, children, title, direction = 'right', size = 'md' }) => {
    const directionClasses = {
        top: {
            container: 'items-start justify-center',
            transform: isOpen ? 'translate-y-0' : '-translate-y-full'
        },
        bottom: {
            container: 'items-end justify-center',
            transform: isOpen ? 'translate-y-0' : 'translate-y-full'
        },
        left: {
            container: 'items-center justify-start',
            transform: isOpen ? 'translate-x-0' : '-translate-x-full'
        },
        right: {
            container: 'items-center justify-end',
            transform: isOpen ? 'translate-x-0' : 'translate-x-full'
        }
    };
    
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        full: 'w-full h-full max-w-none'
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex transition-opacity duration-300">
            <div className={\`flex \${directionClasses[direction].container} w-full h-full\`}>
                <div
                    className={\`bg-white \${direction === 'left' || direction === 'right' ? 'h-full' : 'w-full'} \${sizeClasses[size]} transform transition-transform duration-300 \${directionClasses[direction].transform}\`}
                >
                    {title && (
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    <div className="p-6 overflow-y-auto">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};`
            },

            // === LAYOUT COMPONENTS ===
            'hero-modern': {
                name: 'Modern Hero Section',
                category: 'layouts',
                description: 'Modern hero section with gradient background and call-to-action',
                dependencies: [],
                tags: ['hero', 'landing', 'gradient', 'cta'],
                variants: {
                    style: ['minimal', 'gradient', 'image', 'video'],
                    alignment: ['left', 'center', 'right'],
                    size: ['sm', 'md', 'lg', 'xl']
                },
                code: `const ModernHero = ({ 
    title, 
    subtitle, 
    ctaText = "Get Started", 
    ctaAction, 
    style = 'gradient', 
    alignment = 'center',
    size = 'lg' 
}) => {
    const alignmentClasses = {
        left: 'text-left items-start',
        center: 'text-center items-center',
        right: 'text-right items-end'
    };
    
    const sizeClasses = {
        sm: 'py-16',
        md: 'py-24',
        lg: 'py-32',
        xl: 'py-40'
    };
    
    const styleClasses = {
        minimal: 'bg-white',
        gradient: 'bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800',
        image: 'bg-cover bg-center bg-gray-900',
        video: 'bg-gray-900 relative overflow-hidden'
    };
    
    const textColorClasses = {
        minimal: 'text-gray-900',
        gradient: 'text-white',
        image: 'text-white',
        video: 'text-white'
    };
    
    return (
        <section className={\`relative \${styleClasses[style]} \${sizeClasses[size]}\`}>
            {style === 'gradient' && (
                <div className="absolute inset-0 bg-black/20"></div>
            )}
            
            <div className="relative container mx-auto px-6">
                <div className={\`flex flex-col \${alignmentClasses[alignment]} space-y-8\`}>
                    <div className="space-y-4">
                        <h1 className={\`text-4xl md:text-6xl lg:text-7xl font-bold \${textColorClasses[style]} leading-tight\`}>
                            {title}
                        </h1>
                        {subtitle && (
                            <p className={\`text-xl md:text-2xl \${textColorClasses[style]} opacity-90 max-w-3xl\`}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                    
                    {ctaAction && (
                        <div className="flex space-x-4">
                            <button
                                onClick={ctaAction}
                                className="bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-lg"
                            >
                                {ctaText}
                            </button>
                            <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-gray-900 transition-all duration-200">
                                Learn More
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};`
            },

            'hero-split': {
                name: 'Split Hero Section',
                category: 'layouts',
                description: 'Hero section with split layout - content on one side, visual on the other',
                dependencies: [],
                tags: ['hero', 'split', 'landing', 'two-column'],
                variants: {
                    layout: ['left-content', 'right-content'],
                    visualType: ['image', 'illustration', 'video'],
                    style: ['modern', 'minimal', 'bold']
                },
                code: `const SplitHero = ({ 
    title, 
    subtitle, 
    ctaText = "Get Started", 
    ctaAction,
    visualSrc,
    layout = 'left-content',
    visualType = 'image',
    style = 'modern'
}) => {
    const isContentLeft = layout === 'left-content';
    
    const styleClasses = {
        modern: 'bg-gradient-to-br from-gray-50 to-gray-100',
        minimal: 'bg-white',
        bold: 'bg-gradient-to-r from-purple-600 to-blue-600'
    };
    
    const textColorClasses = {
        modern: 'text-gray-900',
        minimal: 'text-gray-900', 
        bold: 'text-white'
    };
    
    const ContentSection = () => (
        <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-6">
                <h1 className={\`text-4xl md:text-5xl lg:text-6xl font-bold \${textColorClasses[style]} leading-tight\`}>
                    {title}
                </h1>
                {subtitle && (
                    <p className={\`text-xl \${textColorClasses[style]} opacity-90 max-w-lg\`}>
                        {subtitle}
                    </p>
                )}
            </div>
            
            {ctaAction && (
                <div className="flex space-x-4">
                    <button
                        onClick={ctaAction}
                        className={\`px-8 py-4 rounded-lg font-semibold text-lg transform hover:scale-105 transition-all duration-200 shadow-lg \${
                            style === 'bold' 
                                ? 'bg-white text-purple-600 hover:bg-gray-100' 
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }\`}
                    >
                        {ctaText}
                    </button>
                </div>
            )}
        </div>
    );
    
    const VisualSection = () => (
        <div className="flex items-center justify-center">
            {visualType === 'image' && visualSrc && (
                <img 
                    src={visualSrc} 
                    alt="Hero visual" 
                    className="w-full h-auto max-w-lg rounded-lg shadow-2xl"
                />
            )}
            {visualType === 'illustration' && (
                <div className="w-full h-96 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg shadow-2xl flex items-center justify-center">
                    <span className="text-white text-6xl">🚀</span>
                </div>
            )}
            {visualType === 'video' && visualSrc && (
                <video 
                    src={visualSrc} 
                    autoPlay 
                    loop 
                    muted 
                    className="w-full h-auto max-w-lg rounded-lg shadow-2xl"
                />
            )}
        </div>
    );
    
    return (
        <section className={\`\${styleClasses[style]} py-20 lg:py-32\`}>
            <div className="container mx-auto px-6">
                <div className={\`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center \${isContentLeft ? '' : 'lg:grid-flow-col-dense'}\`}>
                    <div className={isContentLeft ? '' : 'lg:col-start-2'}>
                        <ContentSection />
                    </div>
                    <div className={isContentLeft ? '' : 'lg:col-start-1'}>
                        <VisualSection />
                    </div>
                </div>
            </div>
        </section>
    );
};`
            },

            'hero-video-background': {
                name: 'Video Background Hero',
                category: 'layouts',
                description: 'Hero section with full-screen video background',
                dependencies: [],
                tags: ['hero', 'video', 'background', 'fullscreen'],
                variants: {
                    overlay: ['none', 'light', 'dark', 'gradient'],
                    position: ['center', 'top', 'bottom'],
                    size: ['full', 'large', 'medium']
                },
                code: `const VideoBackgroundHero = ({ 
    title, 
    subtitle, 
    ctaText = "Watch Demo", 
    ctaAction,
    videoSrc = "https://example.com/hero-video.mp4",
    overlay = 'dark',
    position = 'center',
    size = 'full'
}) => {
    const overlayClasses = {
        none: '',
        light: 'bg-white/30',
        dark: 'bg-black/50',
        gradient: 'bg-gradient-to-b from-black/30 to-black/70'
    };
    
    const positionClasses = {
        center: 'items-center justify-center',
        top: 'items-start justify-center pt-20',
        bottom: 'items-end justify-center pb-20'
    };
    
    const sizeClasses = {
        full: 'h-screen',
        large: 'h-[80vh]',
        medium: 'h-[60vh]'
    };
    
    return (
        <section className={\`relative overflow-hidden \${sizeClasses[size]}\`}>
            {/* Video Background */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
            >
                <source src={videoSrc} type="video/mp4" />
            </video>
            
            {/* Overlay */}
            {overlay !== 'none' && (
                <div className={\`absolute inset-0 \${overlayClasses[overlay]}\`}></div>
            )}
            
            {/* Content */}
            <div className={\`relative z-10 h-full flex flex-col \${positionClasses[position]} text-center px-6\`}>
                <div className="max-w-4xl space-y-8">
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-xl md:text-2xl text-white opacity-90 max-w-3xl mx-auto">
                            {subtitle}
                        </p>
                    )}
                    
                    {ctaAction && (
                        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
                            <button
                                onClick={ctaAction}
                                className="bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-lg"
                            >
                                {ctaText}
                            </button>
                            <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-gray-900 transition-all duration-200">
                                Learn More
                            </button>
                        </div>
                    )}
                </div>
                
                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                    <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
                        <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
                    </div>
                </div>
            </div>
        </section>
    );
};`
            },

            'grid-masonry': {
                name: 'Masonry Grid',
                category: 'layouts',
                description: 'Pinterest-style masonry grid layout',
                dependencies: ['react'],
                tags: ['masonry', 'grid', 'responsive'],
                variants: {
                    columns: ['2', '3', '4', 'auto'],
                    gap: ['sm', 'md', 'lg']
                },
                code: `const MasonryGrid = ({ children, columns = 'auto', gap = 'md' }) => {
    const gapClasses = {
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6'
    };
    
    const columnClasses = {
        '2': 'columns-2',
        '3': 'columns-3',
        '4': 'columns-4',
        'auto': 'columns-1 sm:columns-2 md:columns-3 lg:columns-4'
    };
    
    return (
        <div className={\`\${columnClasses[columns]} \${gapClasses[gap]}\`}>
            {React.Children.map(children, (child, index) => (
                <div key={index} className="break-inside-avoid mb-4">
                    {child}
                </div>
            ))}
        </div>
    );
};`
            },

            'container-responsive': {
                name: 'Responsive Container',
                category: 'layouts',
                description: 'Responsive container with consistent spacing',
                dependencies: [],
                tags: ['container', 'responsive', 'spacing'],
                variants: {
                    size: ['sm', 'md', 'lg', 'xl', 'full'],
                    padding: ['none', 'sm', 'md', 'lg']
                },
                code: `const ResponsiveContainer = ({ children, size = 'lg', padding = 'md' }) => {
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
        full: 'max-w-full'
    };
    
    const paddingClasses = {
        none: '',
        sm: 'px-4 py-2',
        md: 'px-6 py-4',
        lg: 'px-8 py-6'
    };
    
    return (
        <div className={\`mx-auto \${sizeClasses[size]} \${paddingClasses[padding]}\`}>
            {children}
        </div>
    );
};`
            },

            'flex-layout': {
                name: 'Flexible Layout',
                category: 'layouts',
                description: 'Responsive flexbox layout with customizable alignment',
                dependencies: [],
                tags: ['flex', 'responsive', 'alignment'],
                variants: {
                    direction: ['row', 'column', 'row-reverse', 'column-reverse'],
                    justify: ['start', 'center', 'end', 'between', 'around'],
                    align: ['start', 'center', 'end', 'stretch']
                },
                code: `const FlexLayout = ({ 
    children, 
    direction = 'row', 
    justify = 'start', 
    align = 'start', 
    wrap = false,
    gap = 'md' 
}) => {
    const directionClasses = {
        row: 'flex-row',
        column: 'flex-col',
        'row-reverse': 'flex-row-reverse',
        'column-reverse': 'flex-col-reverse'
    };
    
    const justifyClasses = {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around'
    };
    
    const alignClasses = {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch'
    };
    
    const gapClasses = {
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8'
    };
    
    return (
        <div className={\`flex \${directionClasses[direction]} \${justifyClasses[justify]} \${alignClasses[align]} \${wrap ? 'flex-wrap' : ''} \${gapClasses[gap]}\`}>
            {children}
        </div>
    );
};`
            },

            // === DATA DISPLAY COMPONENTS ===
            'table-responsive': {
                name: 'Responsive Table',
                category: 'data',
                description: 'Mobile-friendly responsive table with sorting',
                dependencies: ['react'],
                tags: ['table', 'responsive', 'sorting'],
                variants: {
                    style: ['minimal', 'striped', 'bordered', 'elevated'],
                    size: ['sm', 'md', 'lg']
                },
                code: `const ResponsiveTable = ({ columns, data, sortable = true, style = 'minimal', size = 'md' }) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    
    const styleClasses = {
        minimal: 'border-collapse',
        striped: 'border-collapse',
        bordered: 'border border-gray-300',
        elevated: 'shadow-lg rounded-lg overflow-hidden'
    };
    
    const sizeClasses = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg'
    };
    
    const handleSort = (key) => {
        if (!sortable) return;
        
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    
    const sortedData = React.useMemo(() => {
        if (!sortConfig.key) return data;
        
        return [...data].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortConfig]);
    
    return (
        <div className="overflow-x-auto">
            <table className={\`w-full \${styleClasses[style]} \${sizeClasses[size]}\`}>
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                className={\`px-4 py-3 text-left font-medium text-gray-900 \${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}\`}
                                onClick={() => handleSort(column.key)}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>{column.label}</span>
                                    {sortable && sortConfig.key === column.key && (
                                        <span className="text-blue-500">
                                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, index) => (
                        <tr 
                            key={index} 
                            className={\`\${style === 'striped' && index % 2 === 1 ? 'bg-gray-50' : ''} hover:bg-gray-100 transition-colors\`}
                        >
                            {columns.map((column) => (
                                <td key={column.key} className="px-4 py-3 text-gray-700">
                                    {row[column.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};`
            },

            'list-animated': {
                name: 'Animated List',
                category: 'data',
                description: 'List with staggered animations and hover effects',
                dependencies: ['react'],
                tags: ['list', 'animated', 'staggered'],
                variants: {
                    animation: ['fade', 'slide', 'scale'],
                    layout: ['vertical', 'horizontal', 'grid']
                },
                code: `const AnimatedList = ({ items, animation = 'fade', layout = 'vertical', delay = 100 }) => {
    const [visibleItems, setVisibleItems] = useState([]);
    
    useEffect(() => {
        items.forEach((_, index) => {
            setTimeout(() => {
                setVisibleItems(prev => [...prev, index]);
            }, index * delay);
        });
    }, [items, delay]);
    
    const animationClasses = {
        fade: 'opacity-0 animate-fade-in',
        slide: 'transform translate-y-4 opacity-0 animate-slide-up',
        scale: 'transform scale-95 opacity-0 animate-scale-in'
    };
    
    const layoutClasses = {
        vertical: 'space-y-4',
        horizontal: 'flex space-x-4 overflow-x-auto',
        grid: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
    };
    
    return (
        <div className={\`\${layoutClasses[layout]}\`}>
            {items.map((item, index) => (
                <div
                    key={index}
                    className={\`transition-all duration-500 \${
                        visibleItems.includes(index) 
                            ? 'opacity-100 transform translate-y-0 scale-100' 
                            : animationClasses[animation]
                    } hover:scale-105 cursor-pointer\`}
                    style={{ transitionDelay: \`\${index * 50}ms\` }}
                >
                    {typeof item === 'string' ? (
                        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                            {item}
                        </div>
                    ) : (
                        item
                    )}
                </div>
            ))}
        </div>
    );
};`
            },

            // === ICON COMPONENTS ===
            'icon-animated': {
                name: 'Animated Icons',
                category: 'icons',
                description: 'Icon component with various animation effects',
                dependencies: [],
                tags: ['icon', 'animation', 'effects'],
                variants: {
                    animation: ['spin', 'pulse', 'bounce', 'shake', 'glow'],
                    size: ['xs', 'sm', 'md', 'lg', 'xl']
                },
                code: `const AnimatedIcon = ({ icon, animation = 'none', size = 'md', color = 'gray' }) => {
    const sizeClasses = {
        xs: 'w-3 h-3',
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-12 h-12'
    };
    
    const colorClasses = {
        gray: 'text-gray-600',
        blue: 'text-blue-600',
        green: 'text-green-600',
        red: 'text-red-600',
        purple: 'text-purple-600'
    };
    
    const animationClasses = {
        none: '',
        spin: 'animate-spin',
        pulse: 'animate-pulse',
        bounce: 'animate-bounce',
        shake: 'animate-shake',
        glow: 'animate-pulse drop-shadow-glow'
    };
    
    return (
        <div className={\`inline-flex items-center justify-center \${sizeClasses[size]} \${colorClasses[color]} \${animationClasses[animation]}\`}>
            {icon}
        </div>
    );
};`
            },

            // === HERO COMPONENTS ===
            'hero-modern': {
                name: 'Modern Hero Section',
                category: 'layouts',
                description: 'Modern hero section with gradient background and animated blobs',
                dependencies: [],
                tags: ['hero', 'landing', 'modern', 'gradient'],
                variants: {
                    color: ['blue', 'purple', 'green', 'red', 'dark', 'primary'],
                    size: ['md', 'lg', 'xl']
                },
                code: `// This component uses the specialized generator`
            },

            'hero-split': {
                name: 'Split Hero Section',
                category: 'layouts', 
                description: 'Two-column hero layout with text and image',
                dependencies: [],
                tags: ['hero', 'split', 'two-column', 'layout'],
                variants: {
                    color: ['blue', 'purple', 'green', 'red', 'dark', 'primary'],
                    layout: ['left-text', 'right-text']
                },
                code: `// This component uses the specialized generator`
            },

            'hero-video-background': {
                name: 'Video Background Hero',
                category: 'layouts',
                description: 'Hero section with fullscreen video background',
                dependencies: [],
                tags: ['hero', 'video', 'background', 'fullscreen'],
                variants: {
                    overlay: ['light', 'medium', 'dark'],
                    style: ['centered', 'bottom-left']
                },
                code: `// This component uses the specialized generator`
            },

            // === BACKGROUND COMPONENTS ===
            'background-gradient-linear': {
                name: 'Linear Gradient Background',
                category: 'backgrounds',
                description: 'Linear gradient background with customizable colors and direction',
                dependencies: [],
                tags: ['gradient', 'linear', 'colors', 'background'],
                variants: {
                    direction: ['to-right', 'to-bottom', 'to-top-right', 'to-bottom-right'],
                    scheme: ['purple-blue', 'pink-orange', 'green-blue', 'red-yellow', 'dark-purple']
                },
                code: `const LinearGradientBackground = ({ direction = 'to-right', scheme = 'purple-blue', children }) => {
    const gradientSchemes = {
        'purple-blue': 'from-purple-400 via-pink-500 to-blue-500',
        'pink-orange': 'from-pink-400 via-red-500 to-orange-500',
        'green-blue': 'from-green-400 via-teal-500 to-blue-500',
        'red-yellow': 'from-red-400 via-pink-500 to-yellow-500',
        'dark-purple': 'from-gray-900 via-purple-800 to-indigo-900'
    };

    return (
        <div className={\`min-h-screen w-full bg-gradient-\${direction} \${gradientSchemes[scheme]}\`}>
            {children}
        </div>
    );
};`
            },

            'background-gradient-radial': {
                name: 'Radial Gradient Background',
                category: 'backgrounds',
                description: 'Radial gradient background with center-focused color spread',
                dependencies: [],
                tags: ['gradient', 'radial', 'center', 'background'],
                variants: {
                    size: ['circle', 'ellipse'],
                    position: ['center', 'top', 'bottom', 'left', 'right'],
                    scheme: ['cosmic', 'sunset', 'ocean', 'forest', 'fire']
                },
                code: `const RadialGradientBackground = ({ size = 'circle', position = 'center', scheme = 'cosmic', children }) => {
    const gradientSchemes = {
        'cosmic': 'from-purple-900 via-blue-900 to-indigo-900',
        'sunset': 'from-orange-400 via-red-500 to-pink-600',
        'ocean': 'from-cyan-400 via-blue-500 to-indigo-600',
        'forest': 'from-green-300 via-emerald-500 to-teal-700',
        'fire': 'from-yellow-400 via-red-500 to-red-800'
    };

    return (
        <div 
            className={\`min-h-screen w-full\`}
            style={{
                background: \`radial-gradient(\${size} at \${position}, \${gradientSchemes[scheme].replace(/from-|via-|to-/g, '').replace(/-\\d+/g, (match) => match)}\`
            }}
        >
            {children}
        </div>
    );
};`
            },

            'background-animated-particles': {
                name: 'Animated Particles Background',
                category: 'backgrounds',
                description: 'Floating animated particles with customizable colors and density',
                dependencies: [],
                tags: ['particles', 'animation', 'floating', 'interactive'],
                variants: {
                    density: ['low', 'medium', 'high'],
                    color: ['blue', 'purple', 'pink', 'green', 'white'],
                    speed: ['slow', 'medium', 'fast']
                },
                code: `// This component uses the specialized generator`
            },

            'background-animated-waves': {
                name: 'Animated Waves Background',
                category: 'backgrounds',
                description: 'Flowing wave animation with smooth gradients',
                dependencies: [],
                tags: ['waves', 'animation', 'flowing', 'ocean'],
                variants: {
                    style: ['gentle', 'dynamic', 'turbulent'],
                    color: ['blue', 'purple', 'green', 'pink', 'orange'],
                    layers: ['single', 'double', 'triple']
                },
                code: `// This component uses the specialized generator`
            },

            'background-pattern-dots': {
                name: 'Dot Pattern Background',
                category: 'backgrounds',
                description: 'Regular dot pattern background with spacing controls',
                dependencies: [],
                tags: ['dots', 'pattern', 'regular', 'geometric'],
                variants: {
                    size: ['small', 'medium', 'large'],
                    spacing: ['tight', 'normal', 'wide'],
                    color: ['light', 'medium', 'dark'],
                    style: ['filled', 'outline', 'glow']
                },
                code: `const DotPatternBackground = ({ size = 'medium', spacing = 'normal', color = 'light', style = 'filled', children }) => {
    const dotSizes = { small: '2px', medium: '4px', large: '6px' };
    const spacings = { tight: '20px', normal: '30px', wide: '50px' };
    const colors = {
        light: 'rgba(255, 255, 255, 0.1)',
        medium: 'rgba(255, 255, 255, 0.3)',
        dark: 'rgba(0, 0, 0, 0.1)'
    };

    const dotStyle = style === 'filled' 
        ? { backgroundColor: colors[color] }
        : style === 'outline'
        ? { border: \`1px solid \${colors[color]}\`, backgroundColor: 'transparent' }
        : { 
            backgroundColor: colors[color], 
            boxShadow: \`0 0 10px \${colors[color]}\` 
        };

    return (
        <div 
            className="min-h-screen w-full relative"
            style={{
                backgroundImage: \`radial-gradient(\${dotSizes[size]} \${dotSizes[size]}, \${colors[color]} 50%, transparent 50%)\`,
                backgroundSize: \`\${spacings[spacing]} \${spacings[spacing]}\`
            }}
        >
            {children}
        </div>
    );
};`
            },

            'background-pattern-grid': {
                name: 'Grid Pattern Background',
                category: 'backgrounds',
                description: 'Grid lines pattern with customizable thickness and spacing',
                dependencies: [],
                tags: ['grid', 'lines', 'pattern', 'geometric'],
                variants: {
                    size: ['small', 'medium', 'large'],
                    thickness: ['thin', 'medium', 'thick'],
                    color: ['light', 'medium', 'dark'],
                    style: ['solid', 'dashed', 'dotted']
                },
                code: `const GridPatternBackground = ({ size = 'medium', thickness = 'thin', color = 'light', style = 'solid', children }) => {
    const gridSizes = { small: '20px', medium: '40px', large: '80px' };
    const thicknesses = { thin: '1px', medium: '2px', thick: '3px' };
    const colors = {
        light: 'rgba(255, 255, 255, 0.1)',
        medium: 'rgba(255, 255, 255, 0.3)',
        dark: 'rgba(0, 0, 0, 0.1)'
    };

    return (
        <div 
            className="min-h-screen w-full relative"
            style={{
                backgroundImage: \`
                    linear-gradient(\${colors[color]} \${thicknesses[thickness]}, transparent \${thicknesses[thickness]}),
                    linear-gradient(90deg, \${colors[color]} \${thicknesses[thickness]}, transparent \${thicknesses[thickness]})
                \`,
                backgroundSize: \`\${gridSizes[size]} \${gridSizes[size]}\`
            }}
        >
            {children}
        </div>
    );
};`
            },

            'background-geometric-animated': {
                name: 'Animated Geometric Background',
                category: 'backgrounds',
                description: 'Moving geometric shapes with rotation and color transitions',
                dependencies: [],
                tags: ['geometric', 'shapes', 'animation', 'rotation'],
                variants: {
                    shapes: ['circles', 'squares', 'triangles', 'mixed'],
                    count: ['few', 'normal', 'many'],
                    speed: ['slow', 'medium', 'fast'],
                    colors: ['monochrome', 'rainbow', 'warm', 'cool']
                },
                code: `// This component uses the specialized generator`
            },

            'background-image-overlay': {
                name: 'Image Overlay Background',
                category: 'backgrounds',
                description: 'Image background with color overlays and blur effects',
                dependencies: [],
                tags: ['image', 'overlay', 'blur', 'tint'],
                variants: {
                    overlay: ['dark', 'light', 'colored'],
                    blur: ['none', 'light', 'medium', 'heavy'],
                    opacity: ['low', 'medium', 'high'],
                    tint: ['none', 'blue', 'purple', 'green', 'red']
                },
                code: `const ImageOverlayBackground = ({ imageUrl, overlay = 'dark', blur = 'light', opacity = 'medium', tint = 'none', children }) => {
    const overlayColors = {
        dark: 'rgba(0, 0, 0, 0.5)',
        light: 'rgba(255, 255, 255, 0.5)',
        colored: 'rgba(99, 102, 241, 0.3)'
    };

    const blurLevels = {
        none: '0px',
        light: '2px',
        medium: '5px',
        heavy: '10px'
    };

    const tintColors = {
        none: 'none',
        blue: 'sepia(0) saturate(1) hue-rotate(200deg)',
        purple: 'sepia(1) saturate(2) hue-rotate(260deg)',
        green: 'sepia(1) saturate(1.5) hue-rotate(90deg)',
        red: 'sepia(1) saturate(2) hue-rotate(320deg)'
    };

    return (
        <div className="min-h-screen w-full relative">
            <div 
                className="absolute inset-0"
                style={{
                    backgroundImage: \`url(\${imageUrl})\`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: \`blur(\${blurLevels[blur]}) \${tintColors[tint]}\`
                }}
            />
            <div 
                className="absolute inset-0"
                style={{ backgroundColor: overlayColors[overlay] }}
            />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};`
            },

            'background-blob-animated': {
                name: 'Animated Blob Background',
                category: 'backgrounds',
                description: 'Organic animated blob shapes with morphing effects',
                dependencies: [],
                tags: ['blob', 'organic', 'morphing', 'animation'],
                variants: {
                    count: ['single', 'double', 'triple'],
                    size: ['small', 'medium', 'large'],
                    speed: ['slow', 'medium', 'fast'],
                    colors: ['purple', 'blue', 'pink', 'green', 'gradient']
                },
                code: `// This component uses the specialized generator`
            },

            'background-circuit-pattern': {
                name: 'Circuit Pattern Background',
                category: 'backgrounds',
                description: 'Tech-inspired circuit board pattern with glowing connections',
                dependencies: [],
                tags: ['circuit', 'tech', 'electronic', 'glow'],
                variants: {
                    density: ['sparse', 'normal', 'dense'],
                    color: ['green', 'blue', 'purple', 'orange', 'white'],
                    glow: ['none', 'subtle', 'bright'],
                    animation: ['static', 'pulse', 'flow']
                },
                code: `// This component uses the specialized generator`
            },

            'background-noise-texture': {
                name: 'Noise Texture Background',
                category: 'backgrounds',
                description: 'Subtle noise texture for depth and visual interest',
                dependencies: [],
                tags: ['noise', 'texture', 'subtle', 'depth'],
                variants: {
                    intensity: ['light', 'medium', 'heavy'],
                    color: ['white', 'black', 'colored'],
                    scale: ['fine', 'medium', 'coarse'],
                    blend: ['multiply', 'overlay', 'soft-light']
                },
                code: `const NoiseTextureBackground = ({ intensity = 'medium', color = 'white', scale = 'medium', blend = 'overlay', children }) => {
    const noiseIntensities = {
        light: 0.1,
        medium: 0.2,
        heavy: 0.4
    };

    const noiseColors = {
        white: '#ffffff',
        black: '#000000',
        colored: '#6366f1'
    };

    const noiseScales = {
        fine: '50px',
        medium: '100px',
        coarse: '200px'
    };

    // Generate noise pattern using CSS
    const noiseStyle = {
        backgroundImage: \`
            radial-gradient(circle at 20% 50%, \${noiseColors[color]}1a \${noiseIntensities[intensity] * 100}%, transparent 70%),
            radial-gradient(circle at 40% 20%, \${noiseColors[color]}1a \${noiseIntensities[intensity] * 100}%, transparent 70%),
            radial-gradient(circle at 90% 30%, \${noiseColors[color]}1a \${noiseIntensities[intensity] * 100}%, transparent 70%),
            radial-gradient(circle at 60% 70%, \${noiseColors[color]}1a \${noiseIntensities[intensity] * 100}%, transparent 70%)
        \`,
        backgroundSize: noiseScales[scale],
        mixBlendMode: blend
    };

    return (
        <div className="min-h-screen w-full relative">
            <div 
                className="absolute inset-0"
                style={noiseStyle}
            />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};`
            },

            'background-video': {
                name: 'Video Background',
                category: 'backgrounds',
                description: 'Fullscreen video background with overlay controls',
                dependencies: [],
                tags: ['video', 'fullscreen', 'overlay', 'media'],
                variants: {
                    overlay: ['none', 'dark', 'light', 'gradient'],
                    controls: ['hidden', 'minimal', 'full'],
                    loop: ['enabled', 'disabled'],
                    autoplay: ['enabled', 'disabled']
                },
                code: `const VideoBackground = ({ videoUrl, overlay = 'dark', controls = 'hidden', loop = true, autoplay = true, children }) => {
    const overlayStyles = {
        none: 'transparent',
        dark: 'rgba(0, 0, 0, 0.4)',
        light: 'rgba(255, 255, 255, 0.4)',
        gradient: 'linear-gradient(45deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.1))'
    };

    return (
        <div className="min-h-screen w-full relative overflow-hidden">
            <video
                className="absolute inset-0 w-full h-full object-cover"
                src={videoUrl}
                autoPlay={autoplay}
                loop={loop}
                muted
                playsInline
                controls={controls !== 'hidden'}
            />
            <div 
                className="absolute inset-0"
                style={{ background: overlayStyles[overlay] }}
            />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};`
            }
        };
    }

    // Initialize specialized component generators for complex components
    initializeComponentGenerators() {
        return {
            'hero-modern': (component, customizations) => this.generateHeroComponent('modern', customizations),
            'hero-split': (component, customizations) => this.generateHeroComponent('split', customizations),
            'hero-video-background': (component, customizations) => this.generateHeroComponent('video-background', customizations),
            'button-glow': (component, customizations) => this.generateGlowButton(customizations),
            'text-typewriter': (component, customizations) => this.generateTypewriterText(customizations),
            'background-animated-particles': (component, customizations) => this.generateParticlesBackground(customizations),
            'background-animated-waves': (component, customizations) => this.generateWavesBackground(customizations),
            'background-geometric-animated': (component, customizations) => this.generateGeometricBackground(customizations),
            'background-blob-animated': (component, customizations) => this.generateBlobBackground(customizations),
            'background-circuit-pattern': (component, customizations) => this.generateCircuitBackground(customizations)
        };
    }

    // Generate dynamic hero components
    generateHeroComponent(variant, customizations) {
        const bgColors = {
            blue: 'from-blue-600 to-blue-800',
            purple: 'from-purple-600 to-purple-800', 
            green: 'from-green-600 to-green-800',
            red: 'from-red-600 to-red-800',
            dark: 'from-gray-800 to-gray-900',
            primary: 'from-indigo-600 to-purple-600'
        };

        const backgroundClass = bgColors[customizations.color] || bgColors.primary;

        if (variant === 'modern') {
            return {
                code: `const ModernHero = ({ title = "Welcome to the Future", subtitle = "Experience the next generation of web applications", buttonText = "Get Started" }) => {
    return (
        <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br ${backgroundClass} overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative z-10 text-center text-white px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                    {title}
                </h1>
                <p className="text-xl sm:text-2xl mb-8 text-gray-200 max-w-3xl mx-auto">
                    {subtitle}
                </p>
                <button className="px-8 py-4 bg-white text-gray-900 rounded-full font-semibold text-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-lg">
                    {buttonText}
                </button>
            </div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 -left-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </section>
    );
};`,
                name: 'Modern Hero Section',
                category: 'layouts',
                description: `Modern hero section with ${customizations.color || 'primary'} gradient background`,
                dependencies: [],
                variants: { color: Object.keys(bgColors), size: ['md', 'lg', 'xl'] },
                tags: ['hero', 'landing', 'modern'],
                appliedCustomizations: customizations
            };
        }

        if (variant === 'split') {
            return {
                code: `const SplitHero = ({ title = "Split Design Hero", subtitle = "Modern two-column layout with stunning visuals", buttonText = "Learn More", imageUrl = "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800" }) => {
    return (
        <section className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
            <div className="flex items-center justify-center p-8 lg:p-16 bg-gradient-to-br ${backgroundClass}">
                <div className="text-white max-w-lg">
                    <h1 className="text-4xl lg:text-6xl font-bold mb-6">
                        {title}
                    </h1>
                    <p className="text-xl mb-8 text-gray-200">
                        {subtitle}
                    </p>
                    <button className="px-8 py-4 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transform hover:scale-105 transition-all duration-300">
                        {buttonText}
                    </button>
                </div>
            </div>
            <div className="relative">
                <img 
                    src={imageUrl} 
                    alt="Hero visual" 
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/10"></div>
            </div>
        </section>
    );
};`,
                name: 'Split Hero Section',
                category: 'layouts',
                description: `Split layout hero with ${customizations.color || 'primary'} gradient`,
                dependencies: [],
                variants: { color: Object.keys(bgColors), layout: ['left-text', 'right-text'] },
                tags: ['hero', 'split', 'two-column'],
                appliedCustomizations: customizations
            };
        }

        if (variant === 'video-background') {
            return {
                code: `const VideoHero = ({ title = "Video Background Hero", subtitle = "Immersive video experience", buttonText = "Watch Demo", videoUrl = "https://www.w3schools.com/html/mov_bbb.mp4" }) => {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            <video 
                autoPlay 
                muted 
                loop 
                className="absolute inset-0 w-full h-full object-cover"
            >
                <source src={videoUrl} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/40"></div>
            <div className="relative z-10 text-center text-white px-4 sm:px-6 lg:px-8">
                <h1 className="text-5xl sm:text-7xl font-bold mb-6">
                    {title}
                </h1>
                <p className="text-xl sm:text-2xl mb-8 max-w-2xl mx-auto">
                    {subtitle}
                </p>
                <button className="px-8 py-4 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-full font-semibold hover:bg-white/30 transition-all duration-300">
                    {buttonText}
                </button>
            </div>
        </section>
    );
};`,
                name: 'Video Background Hero',
                category: 'layouts',
                description: 'Hero section with video background',
                dependencies: [],
                variants: { overlay: ['light', 'medium', 'dark'], style: ['centered', 'bottom-left'] },
                tags: ['hero', 'video', 'background'],
                appliedCustomizations: customizations
            };
        }
    }

    // Generate dynamic glow button with proper variant support
    generateGlowButton(customizations) {
        const colorMap = {
            purple: { from: 'from-purple-500', to: 'to-pink-500', shadow: 'hover:shadow-purple-500/50' },
            blue: { from: 'from-blue-500', to: 'to-cyan-500', shadow: 'hover:shadow-blue-500/50' },
            green: { from: 'from-green-500', to: 'to-emerald-500', shadow: 'hover:shadow-green-500/50' },
            pink: { from: 'from-pink-500', to: 'to-rose-500', shadow: 'hover:shadow-pink-500/50' },
            red: { from: 'from-red-500', to: 'to-orange-500', shadow: 'hover:shadow-red-500/50' }
        };

        const colors = colorMap[customizations.color] || colorMap.purple;
        
        const intensityMap = {
            subtle: 'hover:shadow-lg',
            medium: 'hover:shadow-xl', 
            strong: 'hover:shadow-2xl'
        };

        const intensity = intensityMap[customizations.intensity] || intensityMap.medium;

        const sizeMap = {
            sm: 'px-6 py-3 text-sm',
            md: 'px-8 py-4 text-base',
            lg: 'px-10 py-5 text-lg'
        };

        const size = sizeMap[customizations.size] || sizeMap.md;

        return {
            code: `const GlowButton = ({ children, onClick, className = "" }) => {
    return (
        <button 
            onClick={onClick}
            className={\`${size} bg-gradient-to-r ${colors.from} ${colors.to} text-white font-bold rounded-full transition-all duration-300 ${intensity} ${colors.shadow} transform hover:-translate-y-1 \${className}\`}
        >
            {children}
        </button>
    );
};`,
            name: `${customizations.color || 'Purple'} Glow Button`,
            category: 'buttons',
            description: `${customizations.intensity || 'Medium'} intensity ${customizations.color || 'purple'} glow button`,
            dependencies: [],
            variants: { 
                color: Object.keys(colorMap), 
                intensity: Object.keys(intensityMap),
                size: Object.keys(sizeMap)
            },
            tags: ['button', 'glow', 'gradient'],
            appliedCustomizations: customizations
        };
    }

    // Generate dynamic typewriter text
    generateTypewriterText(customizations) {
        const speedMap = {
            slow: 150,
            medium: 100,
            fast: 50,
            'very-fast': 25
        };

        const speed = speedMap[customizations.speed] || speedMap.medium;

        const sizeMap = {
            sm: 'text-sm',
            md: 'text-base', 
            lg: 'text-lg',
            xl: 'text-xl',
            '2xl': 'text-2xl'
        };

        const textSize = sizeMap[customizations.size] || sizeMap.md;

        return {
            code: `const TypewriterText = ({ text, onComplete, className = "" }) => {
    const [displayText, setDisplayText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    
    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayText(text.slice(0, currentIndex + 1));
                setCurrentIndex(currentIndex + 1);
            }, ${speed});
            return () => clearTimeout(timeout);
        } else if (!isComplete) {
            setIsComplete(true);
            onComplete && onComplete();
        }
    }, [currentIndex, text, isComplete, onComplete]);
    
    return (
        <span className={\`font-mono ${textSize} \${className}\`}>
            {displayText}
            <span className="inline-block w-0.5 h-5 bg-current ml-1 animate-pulse">|</span>
        </span>
    );
};`,
            name: `${customizations.speed || 'Medium'} Typewriter Text`,
            category: 'animations',
            description: `Typewriter animation with ${customizations.speed || 'medium'} speed`,
            dependencies: ['react'],
            variants: { 
                speed: Object.keys(speedMap), 
                size: Object.keys(sizeMap),
                cursor: ['blink', 'solid', 'none']
            },
            tags: ['text', 'typewriter', 'animation'],
            appliedCustomizations: customizations
        };
    }

    // Generate animated particles background
    generateParticlesBackground(customizations) {
        const densityMap = {
            low: 20,
            medium: 50,
            high: 100
        };

        const speedMap = {
            slow: 10,
            medium: 5,
            fast: 2
        };

        const colorMap = {
            blue: '#3b82f6',
            purple: '#8b5cf6',
            pink: '#ec4899',
            green: '#10b981',
            white: '#ffffff'
        };

        const density = densityMap[customizations.density] || densityMap.medium;
        const speed = speedMap[customizations.speed] || speedMap.medium;
        const color = colorMap[customizations.color] || colorMap.blue;

        return {
            code: `const ParticlesBackground = ({ children }) => {
    const particles = Array.from({ length: ${density} }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * ${speed * 2} + ${speed}
    }));

    return (
        <div className="min-h-screen w-full relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)' }}>
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute rounded-full opacity-60"
                    style={{
                        left: \`\${particle.x}%\`,
                        top: \`\${particle.y}%\`,
                        width: \`\${particle.size}px\`,
                        height: \`\${particle.size}px\`,
                        backgroundColor: '${color}',
                        animation: \`float \${particle.duration}s ease-in-out infinite alternate\`
                    }}
                />
            ))}
            <style>{\`
                @keyframes float {
                    0% { transform: translateY(0px) scale(1); opacity: 0.6; }
                    100% { transform: translateY(-20px) scale(1.1); opacity: 0.9; }
                }
            \`}</style>
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};`,
            name: `${customizations.color || 'Blue'} Particles Background`,
            category: 'backgrounds',
            description: `Animated floating particles with ${customizations.density || 'medium'} density`,
            dependencies: ['react'],
            variants: {
                density: Object.keys(densityMap),
                speed: Object.keys(speedMap),
                color: Object.keys(colorMap)
            },
            tags: ['particles', 'animation', 'floating', 'background'],
            appliedCustomizations: customizations
        };
    }

    // Generate animated waves background
    generateWavesBackground(customizations) {
        const colorMap = {
            blue: ['#3b82f6', '#1d4ed8', '#1e40af'],
            purple: ['#8b5cf6', '#7c3aed', '#6d28d9'],
            green: ['#10b981', '#059669', '#047857'],
            pink: ['#ec4899', '#db2777', '#be185d'],
            orange: ['#f97316', '#ea580c', '#dc2626']
        };

        const styleMap = {
            gentle: { amplitude: 15, frequency: 0.02, speed: 8 },
            dynamic: { amplitude: 25, frequency: 0.03, speed: 5 },
            turbulent: { amplitude: 40, frequency: 0.04, speed: 3 }
        };

        const layerMap = {
            single: 1,
            double: 2,
            triple: 3
        };

        const colors = colorMap[customizations.color] || colorMap.blue;
        const style = styleMap[customizations.style] || styleMap.gentle;
        const layers = layerMap[customizations.layers] || layerMap.single;

        const generateWaveLayer = (index, opacity) => `
            <div 
                style="
                    position: absolute;
                    bottom: ${index * 20}px;
                    left: 0;
                    width: 200%;
                    height: 100px;
                    background: ${colors[index % colors.length]};
                    opacity: ${opacity};
                    clip-path: polygon(
                        0% 100%,
                        ${Array.from({ length: 21 }, (_, i) => 
                            `${i * 5}% ${50 + Math.sin(i * style.frequency * 100) * style.amplitude}%`
                        ).join(', ')},
                        100% 100%
                    );
                    animation: wave-${index} ${style.speed + index}s ease-in-out infinite;
                "
            ></div>
        `;

        return {
            code: `const WavesBackground = ({ children }) => {
    return (
        <div className="min-h-screen w-full relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
            ${Array.from({ length: layers }, (_, i) => generateWaveLayer(i, 0.3 + (i * 0.2))).join('')}
            <style>{\`
                ${Array.from({ length: layers }, (_, i) => `
                    @keyframes wave-${i} {
                        0%, 100% { transform: translateX(0) translateY(0); }
                        25% { transform: translateX(-5%) translateY(-10px); }
                        50% { transform: translateX(-25%) translateY(0); }
                        75% { transform: translateX(-15%) translateY(10px); }
                    }
                `).join('')}
            \`}</style>
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};`,
            name: `${customizations.style || 'Gentle'} Waves Background`,
            category: 'backgrounds',
            description: `Animated waves with ${customizations.layers || 'single'} layer(s)`,
            dependencies: ['react'],
            variants: {
                style: Object.keys(styleMap),
                color: Object.keys(colorMap),
                layers: Object.keys(layerMap)
            },
            tags: ['waves', 'animation', 'flowing', 'background'],
            appliedCustomizations: customizations
        };
    }

    // Generate geometric animated background
    generateGeometricBackground(customizations) {
        const shapesMap = {
            circles: 'border-radius: 50%',
            squares: 'border-radius: 0',
            triangles: 'clip-path: polygon(50% 0%, 0% 100%, 100% 100%)',
            mixed: 'border-radius: var(--random-radius)'
        };

        const countMap = {
            few: 15,
            normal: 30,
            many: 50
        };

        const speedMap = {
            slow: 15,
            medium: 10,
            fast: 5
        };

        const colorsMap = {
            monochrome: ['#ffffff'],
            rainbow: ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#0080ff', '#8000ff'],
            warm: ['#ff6b6b', '#ffa726', '#ffee58', '#ff8a65'],
            cool: ['#42a5f5', '#26c6da', '#66bb6a', '#ab47bc']
        };

        const shapes = customizations.shapes || 'circles';
        const count = countMap[customizations.count] || countMap.normal;
        const speed = speedMap[customizations.speed] || speedMap.medium;
        const colors = colorsMap[customizations.colors] || colorsMap.monochrome;

        return {
            code: `const GeometricBackground = ({ children }) => {
    const shapes = Array.from({ length: ${count} }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 30 + 10,
        rotation: Math.random() * 360,
        color: [${colors.map(c => `'${c}'`).join(', ')}][i % ${colors.length}],
        duration: Math.random() * ${speed} + ${speed}
    }));

    return (
        <div className="min-h-screen w-full relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
            {shapes.map((shape) => (
                <div
                    key={shape.id}
                    className="absolute opacity-20"
                    style={{
                        left: \`\${shape.x}%\`,
                        top: \`\${shape.y}%\`,
                        width: \`\${shape.size}px\`,
                        height: \`\${shape.size}px\`,
                        backgroundColor: shape.color,
                        ${shapesMap[shapes]},
                        transform: \`rotate(\${shape.rotation}deg)\`,
                        animation: \`geometric-float \${shape.duration}s ease-in-out infinite\`
                    }}
                />
            ))}
            <style>{\`
                @keyframes geometric-float {
                    0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
                    25% { transform: translateY(-15px) rotate(90deg) scale(1.1); }
                    50% { transform: translateY(0) rotate(180deg) scale(0.9); }
                    75% { transform: translateY(15px) rotate(270deg) scale(1.1); }
                }
            \`}</style>
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};`,
            name: `${customizations.shapes || 'Circles'} Geometric Background`,
            category: 'backgrounds',
            description: `Animated geometric shapes with ${customizations.colors || 'monochrome'} colors`,
            dependencies: ['react'],
            variants: {
                shapes: Object.keys(shapesMap),
                count: Object.keys(countMap),
                speed: Object.keys(speedMap),
                colors: Object.keys(colorsMap)
            },
            tags: ['geometric', 'shapes', 'animation', 'background'],
            appliedCustomizations: customizations
        };
    }

    // Generate animated blob background
    generateBlobBackground(customizations) {
        const countMap = {
            single: 1,
            double: 2,
            triple: 3
        };

        const sizeMap = {
            small: { min: 200, max: 400 },
            medium: { min: 300, max: 600 },
            large: { min: 500, max: 800 }
        };

        const speedMap = {
            slow: 20,
            medium: 15,
            fast: 10
        };

        const colorsMap = {
            purple: ['#8b5cf6', '#a855f7', '#9333ea'],
            blue: ['#3b82f6', '#2563eb', '#1d4ed8'],
            pink: ['#ec4899', '#db2777', '#be185d'],
            green: ['#10b981', '#059669', '#047857'],
            gradient: ['linear-gradient(45deg, #8b5cf6, #3b82f6)', 'linear-gradient(45deg, #ec4899, #f97316)', 'linear-gradient(45deg, #10b981, #06b6d4)']
        };

        const count = countMap[customizations.count] || countMap.single;
        const size = sizeMap[customizations.size] || sizeMap.medium;
        const speed = speedMap[customizations.speed] || speedMap.medium;
        const colors = colorsMap[customizations.colors] || colorsMap.purple;

        return {
            code: `const BlobBackground = ({ children }) => {
    const blobs = Array.from({ length: ${count} }, (_, i) => ({
        id: i,
        x: 20 + (i * 30),
        y: 20 + (i * 25),
        size: ${size.min} + Math.random() * ${size.max - size.min},
        color: [${colors.map(c => `'${c}'`).join(', ')}][i % ${colors.length}],
        duration: ${speed} + (i * 2)
    }));

    return (
        <div className="min-h-screen w-full relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, #1e1b4b 0%, #0f0f23 100%)' }}>
            {blobs.map((blob) => (
                <div
                    key={blob.id}
                    className="absolute opacity-30 blur-xl"
                    style={{
                        left: \`\${blob.x}%\`,
                        top: \`\${blob.y}%\`,
                        width: \`\${blob.size}px\`,
                        height: \`\${blob.size}px\`,
                        background: blob.color,
                        borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
                        animation: \`blob-morph \${blob.duration}s ease-in-out infinite\`
                    }}
                />
            ))}
            <style>{\`
                @keyframes blob-morph {
                    0%, 100% { 
                        border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
                        transform: rotate(0deg) scale(1);
                    }
                    25% { 
                        border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
                        transform: rotate(90deg) scale(1.1);
                    }
                    50% { 
                        border-radius: 50% 60% 30% 60% / 60% 30% 60% 40%;
                        transform: rotate(180deg) scale(0.9);
                    }
                    75% { 
                        border-radius: 60% 30% 60% 40% / 30% 60% 40% 70%;
                        transform: rotate(270deg) scale(1.05);
                    }
                }
            \`}</style>
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};`,
            name: `${customizations.colors || 'Purple'} Blob Background`,
            category: 'backgrounds',
            description: `Animated morphing blobs with ${customizations.count || 'single'} blob(s)`,
            dependencies: ['react'],
            variants: {
                count: Object.keys(countMap),
                size: Object.keys(sizeMap),
                speed: Object.keys(speedMap),
                colors: Object.keys(colorsMap)
            },
            tags: ['blob', 'organic', 'morphing', 'background'],
            appliedCustomizations: customizations
        };
    }

    // Generate circuit pattern background
    generateCircuitBackground(customizations) {
        const densityMap = {
            sparse: 15,
            normal: 25,
            dense: 40
        };

        const colorMap = {
            green: '#00ff00',
            blue: '#00bfff',
            purple: '#8a2be2',
            orange: '#ff8c00',
            white: '#ffffff'
        };

        const glowMap = {
            none: '0px 0px 0px',
            subtle: '0px 0px 3px',
            bright: '0px 0px 8px'
        };

        const animationMap = {
            static: 'none',
            pulse: 'circuit-pulse 3s ease-in-out infinite',
            flow: 'circuit-flow 5s linear infinite'
        };

        const density = densityMap[customizations.density] || densityMap.normal;
        const color = colorMap[customizations.color] || colorMap.green;
        const glow = glowMap[customizations.glow] || glowMap.subtle;
        const animation = animationMap[customizations.animation] || animationMap.pulse;

        return {
            code: `const CircuitBackground = ({ children }) => {
    const circuits = Array.from({ length: ${density} }, (_, i) => ({
        id: i,
        x: Math.random() * 90,
        y: Math.random() * 90,
        width: Math.random() * 60 + 20,
        height: Math.random() * 60 + 20,
        rotation: Math.random() * 360
    }));

    return (
        <div className="min-h-screen w-full relative" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' }}>
            <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 1000 1000">
                {circuits.map((circuit) => (
                    <g key={circuit.id} transform={\`translate(\${circuit.x * 10}, \${circuit.y * 10}) rotate(\${circuit.rotation})\`}>
                        <rect
                            x="0" y="0"
                            width="20" height="2"
                            fill="${color}"
                            style={{ 
                                filter: 'drop-shadow(${glow} ${color})',
                                animation: '${animation}'
                            }}
                        />
                        <rect
                            x="18" y="0"
                            width="2" height="20"
                            fill="${color}"
                            style={{ 
                                filter: 'drop-shadow(${glow} ${color})',
                                animation: '${animation}'
                            }}
                        />
                        <circle
                            cx="20" cy="20"
                            r="3"
                            fill="${color}"
                            style={{ 
                                filter: 'drop-shadow(${glow} ${color})',
                                animation: '${animation}'
                            }}
                        />
                    </g>
                ))}
            </svg>
            <style>{\`
                @keyframes circuit-pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 0.8; }
                }
                @keyframes circuit-flow {
                    0% { opacity: 0.2; }
                    25% { opacity: 0.6; }
                    50% { opacity: 1; }
                    75% { opacity: 0.6; }
                    100% { opacity: 0.2; }
                }
            \`}</style>
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};`,
            name: `${customizations.color || 'Green'} Circuit Background`,
            category: 'backgrounds',
            description: `Tech circuit pattern with ${customizations.animation || 'pulse'} animation`,
            dependencies: ['react'],
            variants: {
                density: Object.keys(densityMap),
                color: Object.keys(colorMap),
                glow: Object.keys(glowMap),
                animation: Object.keys(animationMap)
            },
            tags: ['circuit', 'tech', 'electronic', 'background'],
            appliedCustomizations: customizations
        };
    }

    // Component search and filtering methods
    searchComponents(query) {
        const searchTerm = query.toLowerCase();
        return Object.entries(this.components).filter(([key, component]) => {
            return (
                key.toLowerCase().includes(searchTerm) ||
                component.name.toLowerCase().includes(searchTerm) ||
                component.description.toLowerCase().includes(searchTerm) ||
                component.category.toLowerCase().includes(searchTerm) ||
                component.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        }).map(([key, component]) => ({ key, ...component }));
    }

    getComponentsByCategory(category) {
        return Object.entries(this.components)
            .filter(([_, component]) => component.category === category)
            .map(([key, component]) => ({ key, ...component }));
    }

    listCategories() {
        const categoryStats = {};
        
        Object.values(this.components).forEach(component => {
            const category = component.category;
            if (!categoryStats[category]) {
                categoryStats[category] = 0;
            }
            categoryStats[category]++;
        });

        const updatedCategories = { ...this.categories };
        Object.keys(updatedCategories).forEach(category => {
            updatedCategories[category].count = categoryStats[category] || 0;
        });

        return updatedCategories;
    }

    getComponentList() {
        return Object.entries(this.components).map(([key, component]) => ({
            key,
            name: component.name,
            category: component.category,
            description: component.description,
            tags: component.tags || [],
            variants: component.variants || {},
            dependencies: component.dependencies || []
        }));
    }

    getComponent(key) {
        return this.components[key];
    }

    // Enhanced component generation with proper variant support
    generateComponent(key, customizations = {}) {
        const component = this.components[key];
        if (!component) {
            return this.generateFallbackComponent(key);
        }

        // Check if this component has a specialized generator
        if (this.componentGenerators[key]) {
            return this.componentGenerators[key](component, customizations);
        }

        // Apply customizations to the base code using template replacement
        let code = this.applyVariantsToCode(component, customizations);

        return {
            code,
            name: component.name,
            category: component.category,
            description: component.description,
            dependencies: component.dependencies || [],
            variants: component.variants || {},
            tags: component.tags || [],
            appliedCustomizations: customizations
        };
    }

    // New method to properly apply variants to component code
    applyVariantsToCode(component, customizations) {
        let code = component.code;
        
        // Handle different component types with specific variant logic
        const componentKey = Object.keys(this.components).find(k => this.components[k] === component);
        
        if (componentKey?.startsWith('button-')) {
            code = this.applyButtonVariants(code, customizations, component);
        } else if (componentKey?.startsWith('card-')) {
            code = this.applyCardVariants(code, customizations, component);
        } else if (componentKey?.startsWith('text-') || componentKey?.includes('text')) {
            code = this.applyTextVariants(code, customizations, component);
        } else if (componentKey?.startsWith('loader-')) {
            code = this.applyLoaderVariants(code, customizations, component);
        } else {
            // Generic variant application for other components
            code = this.applyGenericVariants(code, customizations, component);
        }

        return code;
    }

    // Button-specific variant application
    applyButtonVariants(code, customizations, component) {
        // Handle size variants
        if (customizations.size) {
            const sizeClasses = {
                sm: 'px-4 py-2 text-sm',
                md: 'px-6 py-3 text-base', 
                lg: 'px-8 py-4 text-lg',
                xl: 'px-10 py-5 text-xl'
            };
            code = code.replace(/size = ['"]md['"]/, `size = "${customizations.size}"`);
            code = code.replace(/px-6 py-3 text-base/, sizeClasses[customizations.size] || sizeClasses.md);
        }

        // Handle color/variant styling
        if (customizations.color || customizations.variant) {
            const colorValue = customizations.color || customizations.variant;
            code = code.replace(/variant = ['"]primary['"]/, `variant = "${colorValue}"`);
            
            // Update gradient colors based on variant
            const gradientMap = {
                blue: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                green: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                red: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                purple: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                yellow: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                pink: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                danger: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                success: 'linear-gradient(135deg, #00b894 0%, #00a085 100%)'
            };
            
            if (gradientMap[colorValue]) {
                // Find and replace gradient values in the code
                code = code.replace(/linear-gradient\(135deg, [^)]+\)/, gradientMap[colorValue]);
            }
        }

        // Handle animation variants
        if (customizations.animation) {
            const animationClasses = {
                glow: 'hover:shadow-lg hover:shadow-current/50',
                pulse: 'animate-pulse',
                bounce: 'hover:animate-bounce',
                shake: 'hover:animate-pulse'
            };
            
            if (animationClasses[customizations.animation]) {
                code = code.replace(/hover:scale-105/, `hover:scale-105 ${animationClasses[customizations.animation]}`);
            }
        }

        return code;
    }

    // Card-specific variant application
    applyCardVariants(code, customizations, component) {
        // Handle shadow variants
        if (customizations.variant === 'shadow' || customizations.shadow) {
            code = code.replace(/shadow-lg/, 'shadow-2xl');
        }

        // Handle glass effect
        if (customizations.variant === 'glass') {
            code = code.replace(/bg-white/, 'bg-white/20 backdrop-blur-lg border border-white/30');
        }

        // Handle size variants
        if (customizations.size) {
            const paddingMap = {
                sm: 'p-4',
                md: 'p-6',
                lg: 'p-8',
                xl: 'p-10'
            };
            code = code.replace(/p-6/, paddingMap[customizations.size] || paddingMap.md);
        }

        return code;
    }

    // Text-specific variant application  
    applyTextVariants(code, customizations, component) {
        // Handle size variants
        if (customizations.size) {
            const textSizeMap = {
                sm: 'text-sm',
                md: 'text-base',
                lg: 'text-lg',
                xl: 'text-xl',
                '2xl': 'text-2xl'
            };
            code = code.replace(/text-base/, textSizeMap[customizations.size] || textSizeMap.md);
        }

        // Handle speed variants for typewriter
        if (customizations.speed && code.includes('speedMs')) {
            const speedMap = {
                slow: 150,
                medium: 100,
                fast: 50,
                'very-fast': 25
            };
            const newSpeed = speedMap[customizations.speed] || speedMap.medium;
            code = code.replace(/medium: 100/, `medium: ${newSpeed}`);
        }

        // Handle color variants
        if (customizations.color) {
            const colorClasses = {
                blue: 'text-blue-600',
                green: 'text-green-600', 
                red: 'text-red-600',
                purple: 'text-purple-600',
                yellow: 'text-yellow-600'
            };
            
            if (colorClasses[customizations.color]) {
                code = code.replace(/text-gray-900/, colorClasses[customizations.color]);
            }
        }

        return code;
    }

    // Loader-specific variant application
    applyLoaderVariants(code, customizations, component) {
        // Handle size variants
        if (customizations.size) {
            const sizeMap = {
                sm: 'w-4 h-4',
                md: 'w-8 h-8',
                lg: 'w-12 h-12',
                xl: 'w-16 h-16'
            };
            code = code.replace(/w-8 h-8/, sizeMap[customizations.size] || sizeMap.md);
        }

        // Handle color variants
        if (customizations.color) {
            const colorMap = {
                blue: 'border-blue-600',
                green: 'border-green-600',
                red: 'border-red-600',
                purple: 'border-purple-600'
            };
            
            if (colorMap[customizations.color]) {
                code = code.replace(/border-blue-600/, colorMap[customizations.color]);
            }
        }

        // Handle speed variants
        if (customizations.speed) {
            const speedMap = {
                slow: '2s',
                medium: '1s', 
                fast: '0.5s'
            };
            
            if (speedMap[customizations.speed]) {
                code = code.replace(/1s/, speedMap[customizations.speed]);
            }
        }

        return code;
    }

    // Generic variant application for other component types
    applyGenericVariants(code, customizations, component) {
        // Apply size variants generically
        if (customizations.size && component.variants?.size) {
            Object.entries(customizations).forEach(([prop, value]) => {
                if (component.variants[prop]?.includes(value)) {
                    // Replace default prop values with customized ones
                    const defaultPattern = new RegExp(`${prop}\\s*=\\s*['"][^'"]*['"]`, 'g');
                    code = code.replace(defaultPattern, `${prop}="${value}"`);
                }
            });
        }

        return code;
    }

    generateFallbackComponent(key) {
        const componentName = key.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join('');

        return {
            code: `const ${componentName} = ({ children, className = "" }) => {
    return (
        <div className={\`p-4 bg-gray-100 border border-gray-300 rounded-lg \${className}\`}>
            {children || "${componentName} Component"}
        </div>
    );
};`,
            name: componentName,
            category: 'components',
            description: `Auto-generated ${componentName} component`,
            dependencies: [],
            variants: {},
            tags: ['generated', 'fallback']
        };
    }

    // Command parsing for terminal integration
    parseCommand(message) {
        const lowerMessage = message.toLowerCase();
        
        // Extract component type from natural language  
        // Note: Order matters - more specific matches first
        const componentTypeMap = {
            'hero': ['hero', 'banner', 'landing', 'jumbotron', 'header'],
            'text': ['typewriter', 'typing', 'animated text', 'text animation'],
            'button': ['button', 'btn', 'click'],
            'card': ['card', 'box', 'container'],
            'modal': ['modal', 'popup', 'dialog', 'overlay'],
            'input': ['input', 'field', 'form'],
            'loader': ['loader', 'loading', 'spinner', 'progress'],
            'navigation': ['nav', 'menu', 'navigation', 'navbar'],
            'animation': ['animate', 'animation', 'effect', 'transition'],
            'layout': ['layout', 'grid', 'flex', 'container']
        };

        let detectedType = null;
        let detectedVariant = null;

        // Find component type
        for (const [type, keywords] of Object.entries(componentTypeMap)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                detectedType = type;
                break;
            }
        }

        // Find specific variants based on common descriptors
        const variantMap = {
            'animated': ['animated', 'moving', 'motion'],
            'glow': ['glow', 'glowing', 'shine', 'bright'],
            'glass': ['glass', 'transparent', 'blur'],
            'neon': ['neon', 'cyberpunk', 'futuristic'],
            'floating': ['floating', 'hover', 'suspended'],
            'ripple': ['ripple', 'wave', 'material'],
            'magnetic': ['magnetic', 'follow', 'mouse'],
            'typewriter': ['typewriter', 'typing', 'type'],
            'glitch': ['glitch', 'distorted', 'error'],
            'rainbow': ['rainbow', 'colorful', 'multicolor'],
            'modern': ['modern', 'contemporary', 'new', 'fresh'],
            'split': ['split', 'two-column', 'divided'],
            'video-background': ['video', 'background', 'fullscreen']
        };

        for (const [variant, keywords] of Object.entries(variantMap)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                detectedVariant = variant;
                break;
            }
        }

        // Construct component key
        let componentKey = null;
        
        // First try with variant
        if (detectedVariant && detectedType) {
            componentKey = `${detectedType}-${detectedVariant}`;
        }

        // Check if specific variant component exists
        if (componentKey && this.components[componentKey]) {
            return {
                type: 'component',
                key: componentKey,
                component: this.components[componentKey]
            };
        }

        // Try to find a default component for the type
        if (detectedType) {
            // Look for common default variants
            const defaultVariants = ['animated', 'basic', 'simple'];
            
            for (const defaultVar of defaultVariants) {
                const defaultKey = `${detectedType}-${defaultVar}`;
                if (this.components[defaultKey]) {
                    return {
                        type: 'component',
                        key: defaultKey,
                        component: this.components[defaultKey]
                    };
                }
            }
            
            // If no default variant found, find the first component of this type
            const firstComponentOfType = Object.keys(this.components).find(key => 
                key.startsWith(detectedType + '-') && this.components[key]
            );
            
            if (firstComponentOfType) {
                return {
                    type: 'component',
                    key: firstComponentOfType,
                    component: this.components[firstComponentOfType]
                };
            }
        }

        // Fallback to search
        const searchResults = this.searchComponents(message);
        return {
            type: 'search',
            query: message,
            results: searchResults.slice(0, 5) // Limit results
        };
    }

    // Terminal command handlers
    handleListCommand(categoryFilter = null) {
        if (categoryFilter) {
            // List components in a specific category
            return this.handleCategoryListCommand(categoryFilter);
        }
        
        const categories = this.listCategories();
        const totalComponents = Object.values(categories).reduce((sum, cat) => sum + cat.count, 0);
        
        return {
            type: 'list',
            totalComponents,
            categories: Object.entries(categories).map(([key, category]) => ({
                key,
                ...category
            }))
        };
    }

    handleCategoryListCommand(categoryKey) {
        const components = Object.entries(this.components)
            .filter(([key, component]) => component.category === categoryKey)
            .map(([key, component]) => ({
                key,
                name: component.name,
                description: component.description,
                tags: component.tags || [],
                variants: component.variants || {}
            }));

        const category = this.categories[categoryKey];
        if (!category) {
            return {
                type: 'error',
                message: `Category '${categoryKey}' not found. Use '/ui list' to see available categories.`
            };
        }

        return {
            type: 'category_list',
            category: {
                key: categoryKey,
                ...category,
                count: components.length
            },
            components
        };
    }

    handleInfoCommand(componentKey) {
        const component = this.components[componentKey];
        if (!component) {
            return {
                type: 'error',
                message: `Component '${componentKey}' not found. Use '/ui list' to see available components.`
            };
        }

        return {
            type: 'info',
            component: {
                key: componentKey,
                ...component,
                codePreview: component.code.slice(0, 200) + '...'
            }
        };
    }

    handleSearchCommand(query) {
        const results = this.searchComponents(query);
        return {
            type: 'search',
            query,
            results: results.slice(0, 10),
            total: results.length
        };
    }
}

// Singleton instance
let reactBitsInstance = null;

function getReactBitsClient() {
    if (!reactBitsInstance) {
        reactBitsInstance = new ReactBitsClient();
    }
    return reactBitsInstance;
}

module.exports = { getReactBitsClient, ReactBitsClient };