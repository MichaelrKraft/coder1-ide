/**
 * Magic UI Component Studio - Main Application
 * A visual development environment for React components
 */

// Global state
const StudioState = {
    currentComponent: null,
    currentProps: {},
    currentRevision: 0,
    revisions: [],
    components: [],
    selectedCategory: 'all'
};

// Component Library - Expanded set with 50+ components
const ComponentLibrary = {
    'ai-generated': [],
    navigation: [
        {
            id: 'nav-navbar',
            name: 'Navigation Bar',
            category: 'navigation',
            description: 'Fully customizable responsive navigation bar with comprehensive styling options',
            code: `
                function NavigationBar({ 
                    brandName = "CoderOne",
                    link1Text = "Home",
                    link2Text = "Features",
                    link3Text = "Pricing",
                    link4Text = "About",
                    buttonText = "Get Started",
                    backgroundColor = "#ffffff",
                    transparent = "false",
                    brandColor = "#8b5cf6",
                    linkColor = "#4a4a4a",
                    linkHoverColor = "#8b5cf6",
                    buttonBackgroundColor = "#8b5cf6",
                    buttonTextColor = "#ffffff",
                    buttonHoverBackgroundColor = "#764ba2",
                    borderBottomWidth = "1px",
                    borderBottomColor = "#e5e5e5",
                    borderBottomStyle = "solid",
                    paddingVertical = "16px",
                    paddingHorizontal = "32px",
                    brandFontSize = "20px",
                    brandFontWeight = "700",
                    linkFontSize = "16px",
                    linkFontWeight = "400",
                    linkSpacing = "32px",
                    buttonPadding = "8px 20px",
                    buttonBorderRadius = "6px",
                    buttonFontSize = "16px",
                    buttonFontWeight = "500",
                    navHeight = "auto",
                    position = "relative",
                    sticky = "false",
                    shadow = "false",
                    shadowColor = "#000000",
                    shadowOpacity = "0.1",
                    shadowBlur = "10px",
                    transitionDuration = "0.3s"
                }) {
                    const [hoveredLink, setHoveredLink] = React.useState(null);
                    const [buttonHovered, setButtonHovered] = React.useState(false);
                    
                    const shadowStyle = shadow === 'true' ? 
                        '0 2px ' + shadowBlur + ' rgba(' + 
                        parseInt(shadowColor.slice(1, 3), 16) + ', ' + 
                        parseInt(shadowColor.slice(3, 5), 16) + ', ' + 
                        parseInt(shadowColor.slice(5, 7), 16) + ', ' + shadowOpacity + ')' : 'none';
                    
                    return (
                        <nav style={{
                            width: '100%',
                            padding: paddingVertical + ' ' + paddingHorizontal,
                            background: transparent === 'true' ? 'transparent' : backgroundColor,
                            borderBottom: transparent === 'true' ? 'none' : borderBottomWidth + ' ' + borderBottomStyle + ' ' + borderBottomColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            position: sticky === 'true' ? 'sticky' : position,
                            top: sticky === 'true' ? '0' : 'auto',
                            zIndex: sticky === 'true' ? '1000' : 'auto',
                            height: navHeight,
                            boxShadow: shadowStyle,
                            transition: 'all ' + transitionDuration + ' ease'
                        }}>
                            <div style={{
                                fontSize: brandFontSize,
                                fontWeight: brandFontWeight,
                                color: brandColor,
                                transition: 'color ' + transitionDuration + ' ease'
                            }}>{brandName}</div>
                            
                            <div style={{
                                display: 'flex',
                                gap: linkSpacing,
                                alignItems: 'center'
                            }}>
                                {[link1Text, link2Text, link3Text, link4Text].map((text, index) => (
                                    <a 
                                        key={index}
                                        href="#" 
                                        style={{ 
                                            color: hoveredLink === index ? linkHoverColor : linkColor,
                                            textDecoration: 'none',
                                            fontSize: linkFontSize,
                                            fontWeight: linkFontWeight,
                                            transition: 'color ' + transitionDuration + ' ease'
                                        }}
                                        onMouseEnter={() => setHoveredLink(index)}
                                        onMouseLeave={() => setHoveredLink(null)}
                                    >
                                        {text}
                                    </a>
                                ))}
                                <button style={{
                                    padding: buttonPadding,
                                    background: buttonHovered ? buttonHoverBackgroundColor : buttonBackgroundColor,
                                    color: buttonTextColor,
                                    border: 'none',
                                    borderRadius: buttonBorderRadius,
                                    fontSize: buttonFontSize,
                                    fontWeight: buttonFontWeight,
                                    cursor: 'pointer',
                                    transition: 'background ' + transitionDuration + ' ease'
                                }}
                                onMouseEnter={() => setButtonHovered(true)}
                                onMouseLeave={() => setButtonHovered(false)}
                                >
                                    {buttonText}
                                </button>
                            </div>
                        </nav>
                    );
                }
            `,
            props: {
                // Content Section
                brandName: { type: 'string', default: 'CoderOne', section: 'Content' },
                link1Text: { type: 'string', default: 'Home', section: 'Content' },
                link2Text: { type: 'string', default: 'Features', section: 'Content' },
                link3Text: { type: 'string', default: 'Pricing', section: 'Content' },
                link4Text: { type: 'string', default: 'About', section: 'Content' },
                buttonText: { type: 'string', default: 'Get Started', section: 'Content' },
                
                // Colors Section
                backgroundColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                brandColor: { type: 'color', default: '#8b5cf6', section: 'Colors' },
                linkColor: { type: 'color', default: '#4a4a4a', section: 'Colors' },
                linkHoverColor: { type: 'color', default: '#8b5cf6', section: 'Colors' },
                buttonBackgroundColor: { type: 'color', default: '#8b5cf6', section: 'Colors' },
                buttonTextColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                buttonHoverBackgroundColor: { type: 'color', default: '#764ba2', section: 'Colors' },
                borderBottomColor: { type: 'color', default: '#e5e5e5', section: 'Colors' },
                shadowColor: { type: 'color', default: '#000000', section: 'Colors' },
                
                // Typography Section
                brandFontSize: { type: 'select', options: ['16px', '18px', '20px', '22px', '24px', '28px'], default: '20px', section: 'Typography' },
                brandFontWeight: { type: 'select', options: ['400', '500', '600', '700', '800'], default: '700', section: 'Typography' },
                linkFontSize: { type: 'select', options: ['14px', '16px', '18px', '20px'], default: '16px', section: 'Typography' },
                linkFontWeight: { type: 'select', options: ['300', '400', '500', '600'], default: '400', section: 'Typography' },
                buttonFontSize: { type: 'select', options: ['14px', '16px', '18px', '20px'], default: '16px', section: 'Typography' },
                buttonFontWeight: { type: 'select', options: ['400', '500', '600', '700'], default: '500', section: 'Typography' },
                
                // Spacing Section
                paddingVertical: { type: 'select', options: ['8px', '12px', '16px', '20px', '24px'], default: '16px', section: 'Spacing' },
                paddingHorizontal: { type: 'select', options: ['16px', '24px', '32px', '40px', '48px'], default: '32px', section: 'Spacing' },
                linkSpacing: { type: 'select', options: ['16px', '24px', '32px', '40px', '48px'], default: '32px', section: 'Spacing' },
                buttonPadding: { type: 'select', options: ['6px 16px', '8px 20px', '10px 24px', '12px 28px'], default: '8px 20px', section: 'Spacing' },
                navHeight: { type: 'select', options: ['auto', '60px', '70px', '80px', '90px'], default: 'auto', section: 'Spacing' },
                
                // Layout Section
                position: { type: 'select', options: ['relative', 'fixed', 'absolute'], default: 'relative', section: 'Layout' },
                sticky: { type: 'select', options: ['false', 'true'], default: 'false', section: 'Layout' },
                transparent: { type: 'select', options: ['false', 'true'], default: 'false', section: 'Layout' },
                
                // Border Section
                borderBottomWidth: { type: 'select', options: ['0px', '1px', '2px', '3px'], default: '1px', section: 'Border' },
                borderBottomStyle: { type: 'select', options: ['solid', 'dashed', 'dotted', 'double'], default: 'solid', section: 'Border' },
                buttonBorderRadius: { type: 'select', options: ['0px', '4px', '6px', '8px', '12px', '999px'], default: '6px', section: 'Border' },
                
                // Effects Section
                shadow: { type: 'select', options: ['false', 'true'], default: 'false', section: 'Effects' },
                shadowOpacity: { type: 'select', options: ['0.05', '0.1', '0.15', '0.2', '0.25'], default: '0.1', section: 'Effects' },
                shadowBlur: { type: 'select', options: ['5px', '10px', '15px', '20px'], default: '10px', section: 'Effects' },
                transitionDuration: { type: 'select', options: ['0.1s', '0.2s', '0.3s', '0.4s', '0.5s'], default: '0.3s', section: 'Effects' }
            }
        },
        {
            id: 'nav-sidebar',
            name: 'Sidebar Menu',
            category: 'navigation',
            description: 'Highly customizable vertical sidebar navigation with comprehensive styling',
            code: `
                function SidebarMenu({ 
                    title = "Menu",
                    item1Text = "Dashboard",
                    item1Icon = "📊",
                    item2Text = "Projects",
                    item2Icon = "📁",
                    item3Text = "Tasks",
                    item3Icon = "✓",
                    item4Text = "Team",
                    item4Icon = "👥",
                    item5Text = "Settings",
                    item5Icon = "⚙️",
                    darkMode = "false",
                    backgroundColor = "#f9f9f9",
                    darkBackgroundColor = "#1a1a1a",
                    textColor = "#333333",
                    darkTextColor = "#ffffff",
                    activeItemBackground = "#06b6d4",
                    activeItemTextColor = "#ffffff",
                    hoverBackground = "#e5e5e5",
                    darkHoverBackground = "#2a2a2a",
                    borderRadius = "12px",
                    itemBorderRadius = "8px",
                    width = "250px",
                    height = "400px",
                    padding = "20px",
                    titleFontSize = "18px",
                    titleFontWeight = "600",
                    titleMarginBottom = "24px",
                    itemFontSize = "16px",
                    itemFontWeight = "400",
                    itemPadding = "12px 16px",
                    itemMarginBottom = "4px",
                    itemGap = "12px",
                    iconSize = "16px",
                    borderWidth = "0px",
                    borderColor = "#e5e5e5",
                    borderStyle = "solid",
                    shadowEnabled = "false",
                    shadowColor = "#000000",
                    shadowOpacity = "0.1",
                    shadowBlur = "10px",
                    transitionDuration = "0.2s"
                }) {
                    const [activeItem, setActiveItem] = React.useState(0);
                    const [hoveredItem, setHoveredItem] = React.useState(null);
                    
                    const isDark = darkMode === 'true';
                    const bgColor = isDark ? darkBackgroundColor : backgroundColor;
                    const txtColor = isDark ? darkTextColor : textColor;
                    const hoverBg = isDark ? darkHoverBackground : hoverBackground;
                    
                    const menuItems = [
                        { label: item1Text, icon: item1Icon },
                        { label: item2Text, icon: item2Icon },
                        { label: item3Text, icon: item3Icon },
                        { label: item4Text, icon: item4Icon },
                        { label: item5Text, icon: item5Icon }
                    ];
                    
                    const shadowStyle = shadowEnabled === 'true' ? 
                        '0 2px ' + shadowBlur + ' rgba(' + 
                        parseInt(shadowColor.slice(1, 3), 16) + ', ' + 
                        parseInt(shadowColor.slice(3, 5), 16) + ', ' + 
                        parseInt(shadowColor.slice(5, 7), 16) + ', ' + shadowOpacity + ')' : 'none';
                    
                    return (
                        <div style={{
                            width: width,
                            height: height,
                            background: bgColor,
                            borderRadius: borderRadius,
                            padding: padding,
                            color: txtColor,
                            border: borderWidth + ' ' + borderStyle + ' ' + borderColor,
                            boxShadow: shadowStyle,
                            transition: 'all ' + transitionDuration + ' ease'
                        }}>
                            <h3 style={{ 
                                marginBottom: titleMarginBottom, 
                                fontSize: titleFontSize,
                                fontWeight: titleFontWeight,
                                color: txtColor
                            }}>{title}</h3>
                            {menuItems.map((item, index) => (
                                <div
                                    key={index}
                                    onClick={() => setActiveItem(index)}
                                    onMouseEnter={() => setHoveredItem(index)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                    style={{
                                        padding: itemPadding,
                                        marginBottom: itemMarginBottom,
                                        borderRadius: itemBorderRadius,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: itemGap,
                                        background: activeItem === index ? activeItemBackground : 
                                                  hoveredItem === index ? hoverBg : 'transparent',
                                        color: activeItem === index ? activeItemTextColor : txtColor,
                                        fontSize: itemFontSize,
                                        fontWeight: itemFontWeight,
                                        transition: 'all ' + transitionDuration + ' ease'
                                    }}
                                >
                                    <span style={{ fontSize: iconSize }}>{item.icon}</span>
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    );
                }
            `,
            props: {
                // Content Section
                title: { type: 'string', default: 'Menu', section: 'Content' },
                item1Text: { type: 'string', default: 'Dashboard', section: 'Content' },
                item1Icon: { type: 'string', default: '📊', section: 'Content' },
                item2Text: { type: 'string', default: 'Projects', section: 'Content' },
                item2Icon: { type: 'string', default: '📁', section: 'Content' },
                item3Text: { type: 'string', default: 'Tasks', section: 'Content' },
                item3Icon: { type: 'string', default: '✓', section: 'Content' },
                item4Text: { type: 'string', default: 'Team', section: 'Content' },
                item4Icon: { type: 'string', default: '👥', section: 'Content' },
                item5Text: { type: 'string', default: 'Settings', section: 'Content' },
                item5Icon: { type: 'string', default: '⚙️', section: 'Content' },
                
                // Colors Section
                darkMode: { type: 'select', options: ['false', 'true'], default: 'false', section: 'Colors' },
                backgroundColor: { type: 'color', default: '#f9f9f9', section: 'Colors' },
                darkBackgroundColor: { type: 'color', default: '#1a1a1a', section: 'Colors' },
                textColor: { type: 'color', default: '#333333', section: 'Colors' },
                darkTextColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                activeItemBackground: { type: 'color', default: '#06b6d4', section: 'Colors' },
                activeItemTextColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                hoverBackground: { type: 'color', default: '#e5e5e5', section: 'Colors' },
                darkHoverBackground: { type: 'color', default: '#2a2a2a', section: 'Colors' },
                borderColor: { type: 'color', default: '#e5e5e5', section: 'Colors' },
                shadowColor: { type: 'color', default: '#000000', section: 'Colors' },
                
                // Typography Section
                titleFontSize: { type: 'select', options: ['14px', '16px', '18px', '20px', '22px'], default: '18px', section: 'Typography' },
                titleFontWeight: { type: 'select', options: ['400', '500', '600', '700'], default: '600', section: 'Typography' },
                itemFontSize: { type: 'select', options: ['14px', '16px', '18px', '20px'], default: '16px', section: 'Typography' },
                itemFontWeight: { type: 'select', options: ['300', '400', '500', '600'], default: '400', section: 'Typography' },
                iconSize: { type: 'select', options: ['14px', '16px', '18px', '20px', '24px'], default: '16px', section: 'Typography' },
                
                // Spacing Section
                width: { type: 'select', options: ['200px', '225px', '250px', '275px', '300px'], default: '250px', section: 'Spacing' },
                height: { type: 'select', options: ['300px', '350px', '400px', '450px', '500px', 'auto'], default: '400px', section: 'Spacing' },
                padding: { type: 'select', options: ['12px', '16px', '20px', '24px', '28px'], default: '20px', section: 'Spacing' },
                titleMarginBottom: { type: 'select', options: ['16px', '20px', '24px', '28px', '32px'], default: '24px', section: 'Spacing' },
                itemPadding: { type: 'select', options: ['8px 12px', '10px 14px', '12px 16px', '14px 18px', '16px 20px'], default: '12px 16px', section: 'Spacing' },
                itemMarginBottom: { type: 'select', options: ['2px', '4px', '6px', '8px', '10px'], default: '4px', section: 'Spacing' },
                itemGap: { type: 'select', options: ['8px', '10px', '12px', '14px', '16px'], default: '12px', section: 'Spacing' },
                
                // Shape Section
                borderRadius: { type: 'select', options: ['0px', '4px', '8px', '12px', '16px', '20px'], default: '12px', section: 'Shape' },
                itemBorderRadius: { type: 'select', options: ['0px', '4px', '6px', '8px', '10px', '12px'], default: '8px', section: 'Shape' },
                borderWidth: { type: 'select', options: ['0px', '1px', '2px', '3px'], default: '0px', section: 'Shape' },
                borderStyle: { type: 'select', options: ['solid', 'dashed', 'dotted', 'double'], default: 'solid', section: 'Shape' },
                
                // Effects Section
                shadowEnabled: { type: 'select', options: ['false', 'true'], default: 'false', section: 'Effects' },
                shadowOpacity: { type: 'select', options: ['0.05', '0.1', '0.15', '0.2', '0.25'], default: '0.1', section: 'Effects' },
                shadowBlur: { type: 'select', options: ['5px', '10px', '15px', '20px'], default: '10px', section: 'Effects' },
                transitionDuration: { type: 'select', options: ['0.1s', '0.2s', '0.3s', '0.4s', '0.5s'], default: '0.2s', section: 'Effects' }
            }
        },
        {
            id: 'nav-breadcrumb',
            name: 'Breadcrumb',
            category: 'navigation',
            description: 'Comprehensive breadcrumb navigation with extensive customization',
            code: `
                function Breadcrumb({ 
                    // Content Section
                    homeText = "Home",
                    categoryText = "Products", 
                    currentText = "Details",
                    separator = "/",
                    showHome = "true",
                    
                    // Style Section
                    backgroundColor = "transparent",
                    borderRadius = "8px",
                    padding = "12px 16px",
                    margin = "0px",
                    borderWidth = "0px",
                    borderColor = "#e5e5e5",
                    borderStyle = "solid",
                    
                    // Typography Section  
                    fontSize = "14px",
                    fontWeight = "400",
                    linkColor = "#8b5cf6",
                    separatorColor = "#999999",
                    currentColor = "#666666",
                    linkHoverColor = "#7c3aed",
                    fontFamily = "inherit",
                    
                    // Layout Section
                    alignment = "left",
                    itemSpacing = "8px",
                    containerWidth = "100%",
                    containerMaxWidth = "none",
                    flexWrap = "nowrap",
                    
                    // Interactive Section
                    linkDecoration = "none",
                    linkHoverDecoration = "underline",
                    cursorStyle = "pointer",
                    transition = "all 0.2s ease",
                    
                    // Advanced Section
                    shadow = "none",
                    opacity = "1",
                    zIndex = "auto"
                }) {
                    const [hoveredIndex, setHoveredIndex] = React.useState(null);
                    
                    const containerStyle = {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: alignment,
                        gap: itemSpacing,
                        fontSize: fontSize,
                        fontWeight: fontWeight,
                        fontFamily: fontFamily,
                        padding: padding,
                        margin: margin,
                        backgroundColor: backgroundColor,
                        borderRadius: borderRadius,
                        border: borderWidth + ' ' + borderStyle + ' ' + borderColor,
                        boxShadow: shadow,
                        opacity: opacity,
                        zIndex: zIndex,
                        width: containerWidth,
                        maxWidth: containerMaxWidth,
                        flexWrap: flexWrap,
                        transition: transition
                    };
                    
                    const linkStyle = (index) => ({
                        color: hoveredIndex === index ? linkHoverColor : linkColor,
                        textDecoration: hoveredIndex === index ? linkHoverDecoration : linkDecoration,
                        cursor: cursorStyle,
                        transition: transition
                    });
                    
                    const separatorStyle = {
                        color: separatorColor,
                        userSelect: 'none'
                    };
                    
                    const currentStyle = {
                        color: currentColor,
                        fontWeight: fontWeight
                    };
                    
                    const items = [];
                    
                    if (showHome === 'true') {
                        items.push(
                            <span key="home">
                                <a href="#" 
                                   style={linkStyle(0)}
                                   onMouseEnter={() => setHoveredIndex(0)}
                                   onMouseLeave={() => setHoveredIndex(null)}>
                                    {homeText}
                                </a>
                            </span>
                        );
                        
                        items.push(<span key="sep1" style={separatorStyle}>{separator}</span>);
                    }
                    
                    items.push(
                        <span key="category">
                            <a href="#" 
                               style={linkStyle(1)}
                               onMouseEnter={() => setHoveredIndex(1)}
                               onMouseLeave={() => setHoveredIndex(null)}>
                                {categoryText}
                            </a>
                        </span>
                    );
                    
                    items.push(<span key="sep2" style={separatorStyle}>{separator}</span>);
                    
                    items.push(
                        <span key="current" style={currentStyle}>{currentText}</span>
                    );
                    
                    return <nav style={containerStyle}>{items}</nav>;
                }
            `,
            props: {
                // Content Section
                homeText: { type: 'string', default: 'Home', section: 'Content' },
                categoryText: { type: 'string', default: 'Products', section: 'Content' },
                currentText: { type: 'string', default: 'Details', section: 'Content' },
                separator: { type: 'string', default: '/', section: 'Content' },
                showHome: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                
                // Style Section
                backgroundColor: { type: 'color', default: 'transparent', section: 'Style' },
                borderRadius: { type: 'select', options: ['0px', '4px', '8px', '12px', '16px'], default: '8px', section: 'Style' },
                padding: { type: 'string', default: '12px 16px', section: 'Style' },
                margin: { type: 'string', default: '0px', section: 'Style' },
                borderWidth: { type: 'select', options: ['0px', '1px', '2px', '3px'], default: '0px', section: 'Style' },
                borderColor: { type: 'color', default: '#e5e5e5', section: 'Style' },
                borderStyle: { type: 'select', options: ['solid', 'dashed', 'dotted'], default: 'solid', section: 'Style' },
                
                // Typography Section
                fontSize: { type: 'select', options: ['12px', '14px', '16px', '18px'], default: '14px', section: 'Typography' },
                fontWeight: { type: 'select', options: ['300', '400', '500', '600', '700'], default: '400', section: 'Typography' },
                linkColor: { type: 'color', default: '#8b5cf6', section: 'Typography' },
                separatorColor: { type: 'color', default: '#999999', section: 'Typography' },
                currentColor: { type: 'color', default: '#666666', section: 'Typography' },
                linkHoverColor: { type: 'color', default: '#7c3aed', section: 'Typography' },
                fontFamily: { type: 'select', options: ['inherit', 'Arial', 'Helvetica', 'Georgia', 'Times'], default: 'inherit', section: 'Typography' },
                
                // Layout Section
                alignment: { type: 'select', options: ['left', 'center', 'right'], default: 'left', section: 'Layout' },
                itemSpacing: { type: 'select', options: ['4px', '8px', '12px', '16px', '20px'], default: '8px', section: 'Layout' },
                containerWidth: { type: 'select', options: ['auto', '100%', '50%', '75%'], default: '100%', section: 'Layout' },
                containerMaxWidth: { type: 'select', options: ['none', '400px', '600px', '800px', '1200px'], default: 'none', section: 'Layout' },
                flexWrap: { type: 'select', options: ['nowrap', 'wrap'], default: 'nowrap', section: 'Layout' },
                
                // Interactive Section
                linkDecoration: { type: 'select', options: ['none', 'underline'], default: 'none', section: 'Interactive' },
                linkHoverDecoration: { type: 'select', options: ['none', 'underline'], default: 'underline', section: 'Interactive' },
                cursorStyle: { type: 'select', options: ['pointer', 'default'], default: 'pointer', section: 'Interactive' },
                transition: { type: 'select', options: ['none', 'all 0.2s ease', 'all 0.3s ease', 'color 0.2s ease'], default: 'all 0.2s ease', section: 'Interactive' },
                
                // Advanced Section
                shadow: { type: 'select', options: ['none', '0 1px 3px rgba(0,0,0,0.1)', '0 4px 6px rgba(0,0,0,0.1)'], default: 'none', section: 'Advanced' },
                opacity: { type: 'select', options: ['0.5', '0.75', '1'], default: '1', section: 'Advanced' },
                zIndex: { type: 'select', options: ['auto', '10', '100', '1000'], default: 'auto', section: 'Advanced' }
            }
        },
        {
            id: 'nav-tabs',
            name: 'Tab Navigation',
            category: 'navigation',
            description: 'Horizontal tab navigation',
            code: `
                function TabNavigation({ 
                    // Content Section
                    tab1Text = "Overview",
                    tab2Text = "Analytics", 
                    tab3Text = "Reports",
                    tab4Text = "Settings",
                    showContent = "true",
                    contentText = "Content for",
                    
                    // Style Section
                    style = "underline",
                    activeColor = "#8b5cf6",
                    inactiveColor = "#666666",
                    backgroundColor = "transparent",
                    borderColor = "#e5e5e5",
                    borderRadius = "8px",
                    
                    // Typography Section
                    fontSize = "14px",
                    fontWeight = "400",
                    activeFontWeight = "600",
                    fontFamily = "inherit",
                    
                    // Layout Section
                    tabPadding = "12px 24px",
                    tabSpacing = "8px",
                    containerWidth = "100%",
                    alignment = "flex-start",
                    orientation = "horizontal",
                    
                    // Interactive Section
                    hoverColor = "#999999",
                    transition = "all 0.2s ease",
                    cursor = "pointer",
                    
                    // Content Area Section
                    contentPadding = "24px",
                    contentBackground = "#f9f9f9",
                    contentBorderRadius = "8px",
                    contentMarginTop = "16px",
                    contentTextColor = "#333333",
                    
                    // Advanced Section
                    borderWidth = "2px",
                    underlineWidth = "3px",
                    shadow = "none",
                    zIndex = "auto"
                }) {
                    const [activeTab, setActiveTab] = React.useState('tab1');
                    const [hoveredTab, setHoveredTab] = React.useState(null);
                    
                    const tabs = [
                        { id: 'tab1', label: tab1Text },
                        { id: 'tab2', label: tab2Text },
                        { id: 'tab3', label: tab3Text },
                        { id: 'tab4', label: tab4Text }
                    ];
                    
                    const containerStyle = {
                        width: containerWidth,
                        fontFamily: fontFamily
                    };
                    
                    const tabsContainerStyle = {
                        display: 'flex',
                        flexDirection: orientation === 'vertical' ? 'column' : 'row',
                        justifyContent: alignment,
                        borderBottom: style === 'underline' ? borderWidth + ' solid ' + borderColor : 'none',
                        gap: style === 'pills' ? tabSpacing : '0',
                        background: backgroundColor,
                        borderRadius: style === 'pills' ? borderRadius : '0',
                        boxShadow: shadow,
                        zIndex: zIndex
                    };
                    
                    const getTabStyle = (tab) => {
                        const isActive = activeTab === tab.id;
                        const isHovered = hoveredTab === tab.id;
                        
                        return {
                            padding: tabPadding,
                            background: isActive && style === 'pills' ? activeColor : 
                                       isHovered && style === 'pills' ? hoverColor + '20' : 'transparent',
                            color: isActive ? 
                                   (style === 'pills' ? 'white' : activeColor) : 
                                   (isHovered ? hoverColor : inactiveColor),
                            border: style === 'bordered' ? '1px solid ' + borderColor : 'none',
                            borderBottom: style === 'underline' && isActive ? 
                                         underlineWidth + ' solid ' + activeColor : 
                                         style === 'underline' ? underlineWidth + ' solid transparent' : 'none',
                            borderRadius: style === 'pills' ? borderRadius : '0',
                            cursor: cursor,
                            fontWeight: isActive ? activeFontWeight : fontWeight,
                            fontSize: fontSize,
                            transition: transition,
                            outline: 'none',
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                        };
                    };
                    
                    const contentStyle = {
                        padding: contentPadding,
                        background: contentBackground,
                        marginTop: orientation === 'horizontal' ? contentMarginTop : '0',
                        marginLeft: orientation === 'vertical' ? contentMarginTop : '0',
                        borderRadius: contentBorderRadius,
                        color: contentTextColor,
                        fontSize: fontSize,
                        fontFamily: fontFamily
                    };
                    
                    const activeTabData = tabs.find(tab => tab.id === activeTab);
                    
                    return (
                        <div style={containerStyle}>
                            <div style={tabsContainerStyle}>
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        onMouseEnter={() => setHoveredTab(tab.id)}
                                        onMouseLeave={() => setHoveredTab(null)}
                                        style={getTabStyle(tab)}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            {showContent === 'true' && (
                                <div style={contentStyle}>
                                    <p style={{ margin: 0 }}>
                                        {contentText} <strong>{activeTabData?.label}</strong> tab
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                }
            `,
            props: {
                // Content Section
                tab1Text: { type: 'string', default: 'Overview', section: 'Content' },
                tab2Text: { type: 'string', default: 'Analytics', section: 'Content' },
                tab3Text: { type: 'string', default: 'Reports', section: 'Content' },
                tab4Text: { type: 'string', default: 'Settings', section: 'Content' },
                showContent: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                contentText: { type: 'string', default: 'Content for', section: 'Content' },
                
                // Style Section
                style: { type: 'select', options: ['underline', 'pills', 'bordered'], default: 'underline', section: 'Style' },
                activeColor: { type: 'color', default: '#8b5cf6', section: 'Style' },
                inactiveColor: { type: 'color', default: '#666666', section: 'Style' },
                backgroundColor: { type: 'color', default: 'transparent', section: 'Style' },
                borderColor: { type: 'color', default: '#e5e5e5', section: 'Style' },
                borderRadius: { type: 'select', options: ['0px', '4px', '8px', '12px', '16px'], default: '8px', section: 'Style' },
                
                // Typography Section
                fontSize: { type: 'select', options: ['12px', '14px', '16px', '18px', '20px'], default: '14px', section: 'Typography' },
                fontWeight: { type: 'select', options: ['300', '400', '500', '600'], default: '400', section: 'Typography' },
                activeFontWeight: { type: 'select', options: ['500', '600', '700', '800'], default: '600', section: 'Typography' },
                fontFamily: { type: 'select', options: ['inherit', 'Arial', 'Helvetica', 'Georgia'], default: 'inherit', section: 'Typography' },
                
                // Layout Section
                tabPadding: { type: 'select', options: ['8px 16px', '12px 24px', '16px 32px'], default: '12px 24px', section: 'Layout' },
                tabSpacing: { type: 'select', options: ['4px', '8px', '12px', '16px'], default: '8px', section: 'Layout' },
                containerWidth: { type: 'select', options: ['auto', '100%', '50%', '75%'], default: '100%', section: 'Layout' },
                alignment: { type: 'select', options: ['flex-start', 'center', 'flex-end'], default: 'flex-start', section: 'Layout' },
                orientation: { type: 'select', options: ['horizontal', 'vertical'], default: 'horizontal', section: 'Layout' },
                
                // Interactive Section
                hoverColor: { type: 'color', default: '#999999', section: 'Interactive' },
                transition: { type: 'select', options: ['none', 'all 0.1s ease', 'all 0.2s ease', 'all 0.3s ease'], default: 'all 0.2s ease', section: 'Interactive' },
                cursor: { type: 'select', options: ['pointer', 'default'], default: 'pointer', section: 'Interactive' },
                
                // Content Area Section
                contentPadding: { type: 'string', default: '24px', section: 'Content Area' },
                contentBackground: { type: 'color', default: '#f9f9f9', section: 'Content Area' },
                contentBorderRadius: { type: 'select', options: ['0px', '4px', '8px', '12px'], default: '8px', section: 'Content Area' },
                contentMarginTop: { type: 'select', options: ['8px', '16px', '24px', '32px'], default: '16px', section: 'Content Area' },
                contentTextColor: { type: 'color', default: '#333333', section: 'Content Area' },
                
                // Advanced Section
                borderWidth: { type: 'select', options: ['1px', '2px', '3px'], default: '2px', section: 'Advanced' },
                underlineWidth: { type: 'select', options: ['2px', '3px', '4px'], default: '3px', section: 'Advanced' },
                shadow: { type: 'select', options: ['none', '0 2px 4px rgba(0,0,0,0.1)', '0 4px 8px rgba(0,0,0,0.1)'], default: 'none', section: 'Advanced' },
                zIndex: { type: 'select', options: ['auto', '10', '100'], default: 'auto', section: 'Advanced' }
            }
        },
        {
            id: 'nav-pagination',
            name: 'Pagination',
            category: 'navigation',
            description: 'Page navigation controls',
            code: `
                function Pagination({ totalPages = 10, primaryColor = "#8b5cf6" }) {
                    const [currentPage, setCurrentPage] = React.useState(1);
                    
                    return (
                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            alignItems: 'center'
                        }}>
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #e5e5e5',
                                    background: 'white',
                                    borderRadius: '6px',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    opacity: currentPage === 1 ? 0.5 : 1
                                }}
                            >Previous</button>
                            
                            {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                const pageNum = i + 1;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            border: 'none',
                                            background: currentPage === pageNum ? primaryColor : 'white',
                                            color: currentPage === pageNum ? 'white' : '#666',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: currentPage === pageNum ? '600' : '400'
                                        }}
                                    >{pageNum}</button>
                                );
                            })}
                            
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #e5e5e5',
                                    background: 'white',
                                    borderRadius: '6px',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    opacity: currentPage === totalPages ? 0.5 : 1
                                }}
                            >Next</button>
                        </div>
                    );
                }
            `,
            props: {
                totalPages: { type: 'string', default: '10' },
                primaryColor: { type: 'color', default: '#8b5cf6' }
            }
        },
        {
            id: 'nav-mobile-menu',
            name: 'Mobile Menu',
            category: 'navigation', 
            description: 'Hamburger menu for mobile',
            code: `
                function MobileMenu({ brandName = "Menu", accentColor = "#8b5cf6" }) {
                    const [isOpen, setIsOpen] = React.useState(false);
                    
                    return (
                        <div style={{ position: 'relative', width: '100%' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '16px 20px',
                                background: 'white',
                                borderBottom: '1px solid #e5e5e5'
                            }}>
                                <span style={{ fontSize: '18px', fontWeight: '600', color: accentColor }}>{brandName}</span>
                                <button
                                    onClick={() => setIsOpen(!isOpen)}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <div style={{ width: '24px', height: '2px', background: '#333', transition: 'all 0.3s' }}></div>
                                    <div style={{ width: '24px', height: '2px', background: '#333', transition: 'all 0.3s' }}></div>
                                    <div style={{ width: '24px', height: '2px', background: '#333', transition: 'all 0.3s' }}></div>
                                </button>
                            </div>
                            
                            {isOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: 'white',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    zIndex: 1000
                                }}>
                                    {['Home', 'Features', 'Pricing', 'About', 'Contact'].map((item) => (
                                        <a
                                            key={item}
                                            href="#"
                                            style={{
                                                display: 'block',
                                                padding: '16px 20px',
                                                color: '#333',
                                                textDecoration: 'none',
                                                borderBottom: '1px solid #f0f0f0',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.background = '#f9f9f9'}
                                            onMouseLeave={(e) => e.target.style.background = 'white'}
                                        >{item}</a>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                }
            `,
            props: {
                brandName: { type: 'string', default: 'Menu' },
                accentColor: { type: 'color', default: '#8b5cf6' }
            }
        }
    ],
    content: [
        {
            id: 'content-feature-grid',
            name: 'Feature Grid',
            category: 'content',
            description: '3-column feature grid with icons',
            code: `
                function FeatureGrid({ 
                    // Content Section
                    feature1Icon = "⚡",
                    feature1Title = "Lightning Fast",
                    feature1Desc = "Optimized for speed and performance",
                    feature2Icon = "🔒",
                    feature2Title = "Secure",
                    feature2Desc = "Bank-level security for your data",
                    feature3Icon = "📱",
                    feature3Title = "Responsive",
                    feature3Desc = "Works perfectly on all devices",
                    feature4Icon = "🎨",
                    feature4Title = "Customizable",
                    feature4Desc = "Tailor it to your needs",
                    feature5Icon = "🚀",
                    feature5Title = "Scalable",
                    feature5Desc = "Grows with your business",
                    feature6Icon = "💬",
                    feature6Title = "24/7 Support",
                    feature6Desc = "Always here to help you",
                    
                    // Colors Section
                    backgroundColor = "#ffffff",
                    borderColor = "#e5e5e5",
                    titleColor = "#8b5cf6",
                    descriptionColor = "#666666",
                    iconBackgroundColor = "transparent",
                    iconBackgroundHover = "#f3f4f6",
                    cardHoverBackground = "#fafafa",
                    shadowColor = "#000000",
                    
                    // Typography Section
                    iconSize = "40px",
                    titleFontSize = "18px",
                    titleFontWeight = "600",
                    descriptionFontSize = "14px",
                    descriptionLineHeight = "1.5",
                    textTransform = "none",
                    
                    // Grid Layout Section
                    columns = "3",
                    gap = "32px",
                    containerPadding = "40px",
                    cardAlignment = "center",
                    
                    // Card Section
                    cardPadding = "24px",
                    borderRadius = "12px",
                    borderWidth = "1px",
                    borderStyle = "solid",
                    
                    // Icon Section
                    iconContainerSize = "auto",
                    iconMarginBottom = "16px",
                    iconBorderRadius = "0px",
                    iconPadding = "0px",
                    showIconBackground = "false",
                    
                    // Spacing Section
                    titleMarginBottom = "8px",
                    descriptionMarginBottom = "0px",
                    
                    // Effects Section
                    hoverTransform = "translateY(-4px)",
                    hoverShadow = "0 10px 30px",
                    shadowOpacity = "0.1",
                    transitionDuration = "0.2s",
                    cursor = "pointer",
                    
                    // Feature Visibility Section
                    showFeature4 = "true",
                    showFeature5 = "true",
                    showFeature6 = "true"
                }) {
                    const features = [
                        { icon: feature1Icon, title: feature1Title, desc: feature1Desc },
                        { icon: feature2Icon, title: feature2Title, desc: feature2Desc },
                        { icon: feature3Icon, title: feature3Title, desc: feature3Desc }
                    ];
                    
                    if (showFeature4 === "true") {
                        features.push({ icon: feature4Icon, title: feature4Title, desc: feature4Desc });
                    }
                    if (showFeature5 === "true") {
                        features.push({ icon: feature5Icon, title: feature5Title, desc: feature5Desc });
                    }
                    if (showFeature6 === "true") {
                        features.push({ icon: feature6Icon, title: feature6Title, desc: feature6Desc });
                    }
                    
                    const gridColumns = columns === "2" ? "repeat(2, 1fr)" : 
                                       columns === "3" ? "repeat(3, 1fr)" : 
                                       columns === "4" ? "repeat(4, 1fr)" : "repeat(3, 1fr)";
                    
                    return (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: gridColumns,
                            gap: gap,
                            padding: containerPadding
                        }}>
                            {features.map((feature, i) => (
                                <div key={i} style={{
                                    textAlign: cardAlignment,
                                    padding: cardPadding,
                                    background: backgroundColor,
                                    borderRadius: borderRadius,
                                    border: borderWidth + ' ' + borderStyle + ' ' + borderColor,
                                    transition: 'all ' + transitionDuration,
                                    cursor: cursor
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = hoverTransform;
                                    e.currentTarget.style.boxShadow = hoverShadow + ' rgba(' + 
                                        (shadowColor === '#000000' ? '0, 0, 0' : '139, 92, 246') + ', ' + shadowOpacity + ')';
                                    e.currentTarget.style.background = cardHoverBackground;
                                    const iconContainer = e.currentTarget.querySelector('.icon-container');
                                    if (iconContainer && showIconBackground === "true") {
                                        iconContainer.style.background = iconBackgroundHover;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.background = backgroundColor;
                                    const iconContainer = e.currentTarget.querySelector('.icon-container');
                                    if (iconContainer && showIconBackground === "true") {
                                        iconContainer.style.background = iconBackgroundColor;
                                    }
                                }}>
                                    <div 
                                        className="icon-container"
                                        style={{
                                            fontSize: iconSize,
                                            marginBottom: iconMarginBottom,
                                            width: iconContainerSize === "auto" ? "auto" : iconContainerSize,
                                            height: iconContainerSize === "auto" ? "auto" : iconContainerSize,
                                            display: showIconBackground === "true" ? "inline-flex" : "block",
                                            alignItems: showIconBackground === "true" ? "center" : "initial",
                                            justifyContent: showIconBackground === "true" ? "center" : "initial",
                                            background: showIconBackground === "true" ? iconBackgroundColor : "transparent",
                                            borderRadius: iconBorderRadius,
                                            padding: iconPadding,
                                            transition: 'background ' + transitionDuration
                                        }}>{feature.icon}</div>
                                    <h3 style={{
                                        fontSize: titleFontSize,
                                        fontWeight: titleFontWeight,
                                        marginBottom: titleMarginBottom,
                                        color: titleColor,
                                        textTransform: textTransform
                                    }}>{feature.title}</h3>
                                    <p style={{
                                        fontSize: descriptionFontSize,
                                        color: descriptionColor,
                                        lineHeight: descriptionLineHeight,
                                        marginBottom: descriptionMarginBottom
                                    }}>{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    );
                }
            `,
            props: {
                // Content Section
                feature1Icon: { type: 'string', default: '⚡', section: 'Content' },
                feature1Title: { type: 'string', default: 'Lightning Fast', section: 'Content' },
                feature1Desc: { type: 'string', default: 'Optimized for speed and performance', section: 'Content' },
                feature2Icon: { type: 'string', default: '🔒', section: 'Content' },
                feature2Title: { type: 'string', default: 'Secure', section: 'Content' },
                feature2Desc: { type: 'string', default: 'Bank-level security for your data', section: 'Content' },
                feature3Icon: { type: 'string', default: '📱', section: 'Content' },
                feature3Title: { type: 'string', default: 'Responsive', section: 'Content' },
                feature3Desc: { type: 'string', default: 'Works perfectly on all devices', section: 'Content' },
                feature4Icon: { type: 'string', default: '🎨', section: 'Content' },
                feature4Title: { type: 'string', default: 'Customizable', section: 'Content' },
                feature4Desc: { type: 'string', default: 'Tailor it to your needs', section: 'Content' },
                feature5Icon: { type: 'string', default: '🚀', section: 'Content' },
                feature5Title: { type: 'string', default: 'Scalable', section: 'Content' },
                feature5Desc: { type: 'string', default: 'Grows with your business', section: 'Content' },
                feature6Icon: { type: 'string', default: '💬', section: 'Content' },
                feature6Title: { type: 'string', default: '24/7 Support', section: 'Content' },
                feature6Desc: { type: 'string', default: 'Always here to help you', section: 'Content' },
                
                // Colors Section
                backgroundColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                borderColor: { type: 'color', default: '#e5e5e5', section: 'Colors' },
                titleColor: { type: 'color', default: '#8b5cf6', section: 'Colors' },
                descriptionColor: { type: 'color', default: '#666666', section: 'Colors' },
                iconBackgroundColor: { type: 'color', default: 'transparent', section: 'Colors' },
                iconBackgroundHover: { type: 'color', default: '#f3f4f6', section: 'Colors' },
                cardHoverBackground: { type: 'color', default: '#fafafa', section: 'Colors' },
                shadowColor: { type: 'color', default: '#000000', section: 'Colors' },
                
                // Typography Section
                iconSize: { type: 'select', options: ['32px', '36px', '40px', '44px', '48px'], default: '40px', section: 'Typography' },
                titleFontSize: { type: 'select', options: ['16px', '18px', '20px', '22px'], default: '18px', section: 'Typography' },
                titleFontWeight: { type: 'select', options: ['500', '600', '700'], default: '600', section: 'Typography' },
                descriptionFontSize: { type: 'select', options: ['12px', '13px', '14px', '15px', '16px'], default: '14px', section: 'Typography' },
                descriptionLineHeight: { type: 'select', options: ['1.3', '1.4', '1.5', '1.6', '1.7'], default: '1.5', section: 'Typography' },
                textTransform: { type: 'select', options: ['none', 'uppercase', 'lowercase', 'capitalize'], default: 'none', section: 'Typography' },
                
                // Grid Layout Section
                columns: { type: 'select', options: ['2', '3', '4'], default: '3', section: 'Grid Layout' },
                gap: { type: 'select', options: ['16px', '24px', '32px', '40px', '48px'], default: '32px', section: 'Grid Layout' },
                containerPadding: { type: 'select', options: ['20px', '30px', '40px', '50px', '60px'], default: '40px', section: 'Grid Layout' },
                cardAlignment: { type: 'select', options: ['left', 'center', 'right'], default: 'center', section: 'Grid Layout' },
                
                // Card Section
                cardPadding: { type: 'select', options: ['16px', '20px', '24px', '28px', '32px'], default: '24px', section: 'Card' },
                borderRadius: { type: 'select', options: ['8px', '10px', '12px', '16px', '20px'], default: '12px', section: 'Card' },
                borderWidth: { type: 'select', options: ['0px', '1px', '2px'], default: '1px', section: 'Card' },
                borderStyle: { type: 'select', options: ['solid', 'dashed', 'dotted'], default: 'solid', section: 'Card' },
                
                // Icon Section
                iconContainerSize: { type: 'select', options: ['auto', '60px', '70px', '80px'], default: 'auto', section: 'Icon' },
                iconMarginBottom: { type: 'select', options: ['8px', '12px', '16px', '20px', '24px'], default: '16px', section: 'Icon' },
                iconBorderRadius: { type: 'select', options: ['0px', '8px', '12px', '50%'], default: '0px', section: 'Icon' },
                iconPadding: { type: 'select', options: ['0px', '8px', '12px', '16px'], default: '0px', section: 'Icon' },
                showIconBackground: { type: 'select', options: ['true', 'false'], default: 'false', section: 'Icon' },
                
                // Spacing Section
                titleMarginBottom: { type: 'select', options: ['4px', '6px', '8px', '10px', '12px'], default: '8px', section: 'Spacing' },
                descriptionMarginBottom: { type: 'select', options: ['0px', '4px', '8px', '12px'], default: '0px', section: 'Spacing' },
                
                // Effects Section
                hoverTransform: { type: 'select', options: ['none', 'translateY(-2px)', 'translateY(-4px)', 'translateY(-6px)', 'scale(1.02)', 'scale(1.05)'], default: 'translateY(-4px)', section: 'Effects' },
                hoverShadow: { type: 'select', options: ['0 5px 15px', '0 10px 30px', '0 15px 40px'], default: '0 10px 30px', section: 'Effects' },
                shadowOpacity: { type: 'select', options: ['0.05', '0.1', '0.15', '0.2'], default: '0.1', section: 'Effects' },
                transitionDuration: { type: 'select', options: ['0.1s', '0.2s', '0.3s', '0.4s'], default: '0.2s', section: 'Effects' },
                cursor: { type: 'select', options: ['default', 'pointer'], default: 'pointer', section: 'Effects' },
                
                // Feature Visibility Section
                showFeature4: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Feature Visibility' },
                showFeature5: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Feature Visibility' },
                showFeature6: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Feature Visibility' }
            }
        },
        {
            id: 'content-testimonials',
            name: 'Testimonials',
            category: 'content',
            description: 'Customer testimonial carousel',
            code: `
                function Testimonials({ 
                    // Content Section
                    testimonial1Name = "Sarah Johnson",
                    testimonial1Role = "CEO at TechCo",
                    testimonial1Text = "This product changed how we work. Absolutely revolutionary!",
                    testimonial1Rating = "5",
                    testimonial1Avatar = "👩",
                    testimonial2Name = "Mike Chen",
                    testimonial2Role = "Designer",
                    testimonial2Text = "The best tool I have used in years. Highly recommend it!",
                    testimonial2Rating = "5",
                    testimonial2Avatar = "👨",
                    testimonial3Name = "Emily Davis",
                    testimonial3Role = "Developer",
                    testimonial3Text = "Incredible features and amazing support. Love it!",
                    testimonial3Rating = "5",
                    testimonial3Avatar = "👩‍💻",
                    showQuotes = "true",
                    showRating = "true",
                    showAvatar = "true",
                    showRole = "true",
                    showDots = "true",
                    autoPlay = "false",
                    autoPlaySpeed = "3000",
                    
                    // Colors Section
                    backgroundColor = "#ffffff",
                    textColor = "#333333",
                    nameColor = "#10b981",
                    roleColor = "#666666",
                    starColor = "#fbbf24",
                    starEmptyColor = "#e5e5e5",
                    dotActiveColor = "#10b981",
                    dotInactiveColor = "#e5e5e5",
                    quoteColor = "#e5e5e5",
                    avatarBackground = "#f3f4f6",
                    shadowColor = "#000000",
                    
                    // Typography Section
                    testimonialFontSize = "18px",
                    testimonialFontStyle = "italic",
                    testimonialLineHeight = "1.6",
                    nameFontSize = "16px",
                    nameFontWeight = "600",
                    roleFontSize = "14px",
                    starFontSize = "24px",
                    quoteFontSize = "48px",
                    textTransform = "none",
                    
                    // Layout Section
                    maxWidth = "600px",
                    containerPadding = "40px",
                    cardPadding = "32px",
                    textAlignment = "center",
                    avatarPosition = "top",
                    
                    // Card Section
                    borderRadius = "16px",
                    shadowBlur = "40px",
                    shadowOpacity = "0.1",
                    borderWidth = "0px",
                    borderColor = "#e5e5e5",
                    borderStyle = "solid",
                    
                    // Avatar Section
                    avatarSize = "60px",
                    avatarBorderRadius = "50%",
                    avatarMarginBottom = "16px",
                    avatarFontSize = "24px",
                    
                    // Spacing Section
                    starMarginBottom = "16px",
                    testimonialMarginBottom = "24px",
                    nameMarginBottom = "4px",
                    dotsMarginTop = "24px",
                    
                    // Dots Section
                    dotSize = "8px",
                    dotGap = "8px",
                    dotBorderRadius = "50%",
                    dotHoverScale = "1.2",
                    
                    // Animation Section
                    transitionDuration = "0.3s",
                    fadeAnimation = "true"
                }) {
                    const [current, setCurrent] = React.useState(0);
                    const [isTransitioning, setIsTransitioning] = React.useState(false);
                    
                    const testimonials = [
                        { 
                            name: testimonial1Name, 
                            role: testimonial1Role, 
                            text: testimonial1Text, 
                            rating: parseInt(testimonial1Rating),
                            avatar: testimonial1Avatar
                        },
                        { 
                            name: testimonial2Name, 
                            role: testimonial2Role, 
                            text: testimonial2Text, 
                            rating: parseInt(testimonial2Rating),
                            avatar: testimonial2Avatar
                        },
                        { 
                            name: testimonial3Name, 
                            role: testimonial3Role, 
                            text: testimonial3Text, 
                            rating: parseInt(testimonial3Rating),
                            avatar: testimonial3Avatar
                        }
                    ];
                    
                    React.useEffect(() => {
                        if (autoPlay === "true") {
                            const interval = setInterval(() => {
                                handleTransition((current + 1) % testimonials.length);
                            }, parseInt(autoPlaySpeed));
                            return () => clearInterval(interval);
                        }
                    }, [current, autoPlay, autoPlaySpeed]);
                    
                    const handleTransition = (newIndex) => {
                        if (fadeAnimation === "true") {
                            setIsTransitioning(true);
                            setTimeout(() => {
                                setCurrent(newIndex);
                                setIsTransitioning(false);
                            }, 150);
                        } else {
                            setCurrent(newIndex);
                        }
                    };
                    
                    const shadowValue = borderWidth === "0px" 
                        ? '0 10px ' + shadowBlur + ' rgba(' + 
                          (shadowColor === '#000000' ? '0, 0, 0' : '16, 185, 129') + ', ' + shadowOpacity + ')'
                        : 'none';
                    
                    return (
                        <div style={{
                            maxWidth: maxWidth,
                            margin: '0 auto',
                            padding: containerPadding,
                            textAlign: textAlignment
                        }}>
                            <div style={{
                                background: backgroundColor,
                                borderRadius: borderRadius,
                                padding: cardPadding,
                                boxShadow: shadowValue,
                                border: borderWidth + ' ' + borderStyle + ' ' + borderColor,
                                position: 'relative',
                                opacity: isTransitioning ? 0 : 1,
                                transition: 'opacity ' + transitionDuration
                            }}>
                                {showQuotes === "true" && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '20px',
                                        left: '20px',
                                        fontSize: quoteFontSize,
                                        color: quoteColor,
                                        lineHeight: '1',
                                        opacity: '0.3'
                                    }}>“</div>
                                )}
                                
                                {showAvatar === "true" && avatarPosition === "top" && (
                                    <div style={{
                                        width: avatarSize,
                                        height: avatarSize,
                                        background: avatarBackground,
                                        borderRadius: avatarBorderRadius,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: avatarMarginBottom,
                                        fontSize: avatarFontSize
                                    }}>
                                        {testimonials[current].avatar}
                                    </div>
                                )}
                                
                                {showRating === "true" && (
                                    <div style={{
                                        fontSize: starFontSize,
                                        marginBottom: starMarginBottom,
                                        color: starColor
                                    }}>
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i} style={{ 
                                                color: i < testimonials[current].rating ? starColor : starEmptyColor 
                                            }}>★</span>
                                        ))}
                                    </div>
                                )}
                                
                                <p style={{
                                    fontSize: testimonialFontSize,
                                    color: textColor,
                                    marginBottom: testimonialMarginBottom,
                                    fontStyle: testimonialFontStyle,
                                    lineHeight: testimonialLineHeight,
                                    textTransform: textTransform
                                }}>
                                    {showQuotes === "true" && '"'}
                                    {testimonials[current].text}
                                    {showQuotes === "true" && '"'}
                                </p>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: textAlignment }}>
                                    {showAvatar === "true" && avatarPosition === "bottom" && (
                                        <div style={{
                                            width: avatarSize,
                                            height: avatarSize,
                                            background: avatarBackground,
                                            borderRadius: avatarBorderRadius,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: '12px',
                                            fontSize: avatarFontSize
                                        }}>
                                            {testimonials[current].avatar}
                                        </div>
                                    )}
                                    
                                    <div>
                                        <div style={{
                                            fontSize: nameFontSize,
                                            fontWeight: nameFontWeight,
                                            color: nameColor,
                                            marginBottom: nameMarginBottom,
                                            textTransform: textTransform
                                        }}>{testimonials[current].name}</div>
                                        
                                        {showRole === "true" && (
                                            <div style={{
                                                fontSize: roleFontSize,
                                                color: roleColor
                                            }}>{testimonials[current].role}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {showDots === "true" && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: dotGap,
                                    marginTop: dotsMarginTop
                                }}>
                                    {testimonials.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleTransition(i)}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(' + dotHoverScale + ')'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                            style={{
                                                width: dotSize,
                                                height: dotSize,
                                                borderRadius: dotBorderRadius,
                                                border: 'none',
                                                background: current === i ? dotActiveColor : dotInactiveColor,
                                                cursor: 'pointer',
                                                transition: 'all ' + transitionDuration,
                                                transform: 'scale(1)'
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                }
            `,
            props: {
                // Content Section
                testimonial1Name: { type: 'string', default: 'Sarah Johnson', section: 'Content' },
                testimonial1Role: { type: 'string', default: 'CEO at TechCo', section: 'Content' },
                testimonial1Text: { type: 'string', default: 'This product changed how we work. Absolutely revolutionary!', section: 'Content' },
                testimonial1Rating: { type: 'select', options: ['1', '2', '3', '4', '5'], default: '5', section: 'Content' },
                testimonial1Avatar: { type: 'string', default: '👩', section: 'Content' },
                testimonial2Name: { type: 'string', default: 'Mike Chen', section: 'Content' },
                testimonial2Role: { type: 'string', default: 'Designer', section: 'Content' },
                testimonial2Text: { type: 'string', default: 'The best tool I have used in years. Highly recommend it!', section: 'Content' },
                testimonial2Rating: { type: 'select', options: ['1', '2', '3', '4', '5'], default: '5', section: 'Content' },
                testimonial2Avatar: { type: 'string', default: '👨', section: 'Content' },
                testimonial3Name: { type: 'string', default: 'Emily Davis', section: 'Content' },
                testimonial3Role: { type: 'string', default: 'Developer', section: 'Content' },
                testimonial3Text: { type: 'string', default: 'Incredible features and amazing support. Love it!', section: 'Content' },
                testimonial3Rating: { type: 'select', options: ['1', '2', '3', '4', '5'], default: '5', section: 'Content' },
                testimonial3Avatar: { type: 'string', default: '👩‍💻', section: 'Content' },
                showQuotes: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                showRating: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                showAvatar: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                showRole: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                showDots: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                autoPlay: { type: 'select', options: ['true', 'false'], default: 'false', section: 'Content' },
                autoPlaySpeed: { type: 'select', options: ['2000', '3000', '4000', '5000'], default: '3000', section: 'Content' },
                
                // Colors Section
                backgroundColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                textColor: { type: 'color', default: '#333333', section: 'Colors' },
                nameColor: { type: 'color', default: '#10b981', section: 'Colors' },
                roleColor: { type: 'color', default: '#666666', section: 'Colors' },
                starColor: { type: 'color', default: '#fbbf24', section: 'Colors' },
                starEmptyColor: { type: 'color', default: '#e5e5e5', section: 'Colors' },
                dotActiveColor: { type: 'color', default: '#10b981', section: 'Colors' },
                dotInactiveColor: { type: 'color', default: '#e5e5e5', section: 'Colors' },
                quoteColor: { type: 'color', default: '#e5e5e5', section: 'Colors' },
                avatarBackground: { type: 'color', default: '#f3f4f6', section: 'Colors' },
                shadowColor: { type: 'color', default: '#000000', section: 'Colors' },
                
                // Typography Section
                testimonialFontSize: { type: 'select', options: ['16px', '18px', '20px', '22px'], default: '18px', section: 'Typography' },
                testimonialFontStyle: { type: 'select', options: ['normal', 'italic'], default: 'italic', section: 'Typography' },
                testimonialLineHeight: { type: 'select', options: ['1.4', '1.5', '1.6', '1.7', '1.8'], default: '1.6', section: 'Typography' },
                nameFontSize: { type: 'select', options: ['14px', '15px', '16px', '17px', '18px'], default: '16px', section: 'Typography' },
                nameFontWeight: { type: 'select', options: ['500', '600', '700'], default: '600', section: 'Typography' },
                roleFontSize: { type: 'select', options: ['12px', '13px', '14px', '15px'], default: '14px', section: 'Typography' },
                starFontSize: { type: 'select', options: ['20px', '22px', '24px', '26px', '28px'], default: '24px', section: 'Typography' },
                quoteFontSize: { type: 'select', options: ['36px', '42px', '48px', '54px'], default: '48px', section: 'Typography' },
                textTransform: { type: 'select', options: ['none', 'uppercase', 'lowercase', 'capitalize'], default: 'none', section: 'Typography' },
                
                // Layout Section
                maxWidth: { type: 'select', options: ['500px', '600px', '700px', '800px'], default: '600px', section: 'Layout' },
                containerPadding: { type: 'select', options: ['20px', '30px', '40px', '50px'], default: '40px', section: 'Layout' },
                cardPadding: { type: 'select', options: ['24px', '28px', '32px', '36px', '40px'], default: '32px', section: 'Layout' },
                textAlignment: { type: 'select', options: ['left', 'center', 'right'], default: 'center', section: 'Layout' },
                avatarPosition: { type: 'select', options: ['top', 'bottom'], default: 'top', section: 'Layout' },
                
                // Card Section
                borderRadius: { type: 'select', options: ['8px', '12px', '16px', '20px', '24px'], default: '16px', section: 'Card' },
                shadowBlur: { type: 'select', options: ['20px', '30px', '40px', '50px'], default: '40px', section: 'Card' },
                shadowOpacity: { type: 'select', options: ['0.05', '0.1', '0.15', '0.2'], default: '0.1', section: 'Card' },
                borderWidth: { type: 'select', options: ['0px', '1px', '2px'], default: '0px', section: 'Card' },
                borderColor: { type: 'color', default: '#e5e5e5', section: 'Card' },
                borderStyle: { type: 'select', options: ['solid', 'dashed', 'dotted'], default: 'solid', section: 'Card' },
                
                // Avatar Section
                avatarSize: { type: 'select', options: ['40px', '50px', '60px', '70px', '80px'], default: '60px', section: 'Avatar' },
                avatarBorderRadius: { type: 'select', options: ['0px', '8px', '12px', '50%'], default: '50%', section: 'Avatar' },
                avatarMarginBottom: { type: 'select', options: ['8px', '12px', '16px', '20px'], default: '16px', section: 'Avatar' },
                avatarFontSize: { type: 'select', options: ['20px', '24px', '28px', '32px'], default: '24px', section: 'Avatar' },
                
                // Spacing Section
                starMarginBottom: { type: 'select', options: ['8px', '12px', '16px', '20px'], default: '16px', section: 'Spacing' },
                testimonialMarginBottom: { type: 'select', options: ['16px', '20px', '24px', '28px'], default: '24px', section: 'Spacing' },
                nameMarginBottom: { type: 'select', options: ['2px', '4px', '6px', '8px'], default: '4px', section: 'Spacing' },
                dotsMarginTop: { type: 'select', options: ['16px', '20px', '24px', '28px', '32px'], default: '24px', section: 'Spacing' },
                
                // Dots Section
                dotSize: { type: 'select', options: ['6px', '8px', '10px', '12px'], default: '8px', section: 'Dots' },
                dotGap: { type: 'select', options: ['6px', '8px', '10px', '12px'], default: '8px', section: 'Dots' },
                dotBorderRadius: { type: 'select', options: ['0px', '2px', '50%'], default: '50%', section: 'Dots' },
                dotHoverScale: { type: 'select', options: ['1.1', '1.2', '1.3', '1.4'], default: '1.2', section: 'Dots' },
                
                // Animation Section
                transitionDuration: { type: 'select', options: ['0.2s', '0.3s', '0.4s', '0.5s'], default: '0.3s', section: 'Animation' },
                fadeAnimation: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Animation' }
            }
        },
        {
            id: 'content-faq',
            name: 'FAQ Accordion',
            category: 'content',
            description: 'Expandable FAQ section',
            code: `
                function FAQAccordion({ primaryColor = "#8b5cf6" }) {
                    const [openIndex, setOpenIndex] = React.useState(null);
                    const faqs = [
                        { q: 'How does it work?', a: 'Our platform uses advanced technology to deliver amazing results quickly and efficiently.' },
                        { q: 'What is the pricing?', a: 'We offer flexible pricing plans starting at $9/month with a free trial available.' },
                        { q: 'Is there support?', a: 'Yes! We provide 24/7 customer support via chat, email, and phone.' },
                        { q: 'Can I cancel anytime?', a: 'Absolutely! You can cancel your subscription at any time with no penalties.' }
                    ];
                    
                    return (
                        <div style={{
                            maxWidth: '700px',
                            margin: '0 auto',
                            padding: '40px'
                        }}>
                            <h2 style={{
                                fontSize: '32px',
                                fontWeight: '700',
                                textAlign: 'center',
                                marginBottom: '32px',
                                color: '#1a1a1a'
                            }}>Frequently Asked Questions</h2>
                            {faqs.map((faq, i) => (
                                <div key={i} style={{
                                    marginBottom: '12px',
                                    border: '1px solid #e5e5e5',
                                    borderRadius: '8px',
                                    overflow: 'hidden'
                                }}>
                                    <button
                                        onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                        style={{
                                            width: '100%',
                                            padding: '16px 20px',
                                            background: 'white',
                                            border: 'none',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            fontSize: '16px',
                                            fontWeight: '500',
                                            color: '#333',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9f9f9'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                    >
                                        {faq.q}
                                        <span style={{
                                            transform: openIndex === i ? 'rotate(180deg)' : 'rotate(0)',
                                            transition: 'transform 0.2s'
                                        }}>▼</span>
                                    </button>
                                    {openIndex === i && (
                                        <div style={{
                                            padding: '16px 20px',
                                            background: '#f9f9f9',
                                            borderTop: '1px solid #e5e5e5',
                                            color: '#666',
                                            fontSize: '14px',
                                            lineHeight: '1.6'
                                        }}>{faq.a}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                }
            `,
            props: {
                primaryColor: { type: 'color', default: '#8b5cf6' }
            }
        },
        {
            id: 'content-team-cards',
            name: 'Team Cards',
            category: 'content',
            description: 'Team member showcase cards',
            code: `
                function TeamCards({ accentColor = "#06b6d4" }) {
                    const team = [
                        { name: 'Alice Cooper', role: 'CEO & Founder', emoji: '👩‍💼' },
                        { name: 'Bob Wilson', role: 'CTO', emoji: '👨‍💻' },
                        { name: 'Carol Smith', role: 'Head of Design', emoji: '👩‍🎨' },
                        { name: 'David Lee', role: 'Lead Developer', emoji: '👨‍🔧' }
                    ];
                    
                    return (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '24px',
                            padding: '40px'
                        }}>
                            {team.map((member, i) => (
                                <div key={i} style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    padding: '24px',
                                    textAlign: 'center',
                                    border: '1px solid #e5e5e5',
                                    transition: 'transform 0.2s',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                                    <div style={{
                                        width: '80px',
                                        height: '80px',
                                        background: \`\${accentColor}20\`,
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '40px',
                                        margin: '0 auto 16px'
                                    }}>{member.emoji}</div>
                                    <h3 style={{
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        marginBottom: '4px',
                                        color: '#333'
                                    }}>{member.name}</h3>
                                    <p style={{
                                        fontSize: '14px',
                                        color: accentColor
                                    }}>{member.role}</p>
                                </div>
                            ))}
                        </div>
                    );
                }
            `,
            props: {
                accentColor: { type: 'color', default: '#06b6d4' }
            }
        },
        {
            id: 'content-timeline',
            name: 'Timeline',
            category: 'content',
            description: 'Vertical timeline of events',
            code: `
                function Timeline({ lineColor = "#8b5cf6" }) {
                    const events = [
                        { year: '2020', title: 'Company Founded', desc: 'Started with a simple idea' },
                        { year: '2021', title: 'First Product Launch', desc: 'Released our flagship product' },
                        { year: '2022', title: 'Series A Funding', desc: 'Raised $10M in funding' },
                        { year: '2023', title: 'Global Expansion', desc: 'Opened offices worldwide' },
                        { year: '2024', title: 'IPO', desc: 'Went public on NASDAQ' }
                    ];
                    
                    return (
                        <div style={{
                            padding: '40px',
                            maxWidth: '600px',
                            margin: '0 auto'
                        }}>
                            {events.map((event, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    gap: '24px',
                                    marginBottom: '32px',
                                    position: 'relative'
                                }}>
                                    <div style={{
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            background: lineColor,
                                            borderRadius: '50%',
                                            border: '4px solid white',
                                            boxShadow: '0 0 0 1px ' + lineColor,
                                            zIndex: 1
                                        }}/>
                                        {i < events.length - 1 && (
                                            <div style={{
                                                width: '2px',
                                                flex: 1,
                                                background: lineColor,
                                                opacity: 0.3,
                                                marginTop: '8px'
                                            }}/>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, paddingBottom: '20px' }}>
                                        <div style={{
                                            fontSize: '14px',
                                            color: lineColor,
                                            fontWeight: '600',
                                            marginBottom: '4px'
                                        }}>{event.year}</div>
                                        <h3 style={{
                                            fontSize: '18px',
                                            fontWeight: '600',
                                            marginBottom: '8px',
                                            color: '#333'
                                        }}>{event.title}</h3>
                                        <p style={{
                                            fontSize: '14px',
                                            color: '#666',
                                            lineHeight: '1.5'
                                        }}>{event.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                }
            `,
            props: {
                lineColor: { type: 'color', default: '#8b5cf6' }
            }
        },
        {
            id: 'content-stats',
            name: 'Stats Display',
            category: 'content',
            description: 'Comprehensive animated statistics display with full customization',
            code: `
                function StatsDisplay({ 
                    // Content Section
                    stat1Value = "10K+",
                    stat1Label = "Happy Customers",
                    stat2Value = "99.9%",
                    stat2Label = "Uptime",
                    stat3Value = "24/7",
                    stat3Label = "Support",
                    stat4Value = "500+",
                    stat4Label = "Projects Completed",
                    showStat4 = "true",
                    
                    // Background Section
                    backgroundType = "gradient",
                    backgroundColor = "#667eea",
                    gradientStartColor = "#667eea",
                    gradientEndColor = "#764ba2",
                    gradientDirection = "135deg",
                    
                    // Layout Section
                    columns = "4",
                    gap = "32px",
                    padding = "40px",
                    borderRadius = "16px",
                    alignment = "center",
                    containerWidth = "100%",
                    
                    // Typography Section
                    valueSize = "42px",
                    valueFontWeight = "700",
                    valueColor = "#ffffff",
                    labelSize = "14px",
                    labelColor = "#ffffff",
                    labelOpacity = "0.9",
                    labelTransform = "uppercase",
                    labelSpacing = "1px",
                    fontFamily = "inherit",
                    
                    // Animation Section
                    enableAnimation = "true",
                    animationType = "fadeInUp",
                    animationDuration = "0.5s",
                    animationDelay = "0.1s",
                    animationEasing = "ease-out",
                    
                    // Spacing Section
                    valueMarginBottom = "8px",
                    itemPadding = "0px",
                    
                    // Advanced Section
                    shadow = "0 10px 30px rgba(0,0,0,0.2)",
                    border = "none",
                    hoverEffect = "none",
                    transition = "all 0.3s ease"
                }) {
                    const stats = [
                        { value: stat1Value, label: stat1Label },
                        { value: stat2Value, label: stat2Label },
                        { value: stat3Value, label: stat3Label },
                        ...(showStat4 === 'true' ? [{ value: stat4Value, label: stat4Label }] : [])
                    ];
                    
                    const [isHovered, setIsHovered] = React.useState(false);
                    
                    const backgroundStyle = backgroundType === 'gradient' 
                        ? 'linear-gradient(' + gradientDirection + ', ' + gradientStartColor + ' 0%, ' + gradientEndColor + ' 100%)'
                        : backgroundColor;
                    
                    const gridColumns = showStat4 === 'true' ? columns : Math.min(3, parseInt(columns));
                    
                    const containerStyle = {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(' + gridColumns + ', 1fr)',
                        gap: gap,
                        padding: padding,
                        background: backgroundStyle,
                        borderRadius: borderRadius,
                        textAlign: alignment,
                        width: containerWidth,
                        fontFamily: fontFamily,
                        boxShadow: shadow,
                        border: border,
                        transition: transition,
                        transform: hoverEffect === 'scale' && isHovered ? 'scale(1.02)' : 'none',
                        opacity: hoverEffect === 'opacity' && isHovered ? '0.9' : '1'
                    };
                    
                    const getValueStyle = (index) => ({
                        fontSize: valueSize,
                        fontWeight: valueFontWeight,
                        color: valueColor,
                        marginBottom: valueMarginBottom,
                        animation: enableAnimation === 'true' ? 
                                  animationType + ' ' + animationDuration + ' ' + animationEasing : 'none',
                        animationDelay: enableAnimation === 'true' ? (index * parseFloat(animationDelay)) + 's' : '0s',
                        animationFillMode: 'both'
                    });
                    
                    const getLabelStyle = () => ({
                        fontSize: labelSize,
                        color: labelColor,
                        opacity: labelOpacity,
                        textTransform: labelTransform,
                        letterSpacing: labelSpacing,
                        fontFamily: fontFamily
                    });
                    
                    const getItemStyle = () => ({
                        padding: itemPadding,
                        textAlign: alignment
                    });
                    
                    return (
                        <div 
                            style={containerStyle}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                        >
                            {stats.map((stat, i) => (
                                <div key={i} style={getItemStyle()}>
                                    <div style={getValueStyle(i)}>
                                        {stat.value}
                                    </div>
                                    <div style={getLabelStyle()}>
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                }
            `,
            props: {
                // Content Section
                stat1Value: { type: 'string', default: '10K+', section: 'Content' },
                stat1Label: { type: 'string', default: 'Happy Customers', section: 'Content' },
                stat2Value: { type: 'string', default: '99.9%', section: 'Content' },
                stat2Label: { type: 'string', default: 'Uptime', section: 'Content' },
                stat3Value: { type: 'string', default: '24/7', section: 'Content' },
                stat3Label: { type: 'string', default: 'Support', section: 'Content' },
                stat4Value: { type: 'string', default: '500+', section: 'Content' },
                stat4Label: { type: 'string', default: 'Projects Completed', section: 'Content' },
                showStat4: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                
                // Background Section
                backgroundType: { type: 'select', options: ['solid', 'gradient'], default: 'gradient', section: 'Background' },
                backgroundColor: { type: 'color', default: '#667eea', section: 'Background' },
                gradientStartColor: { type: 'color', default: '#667eea', section: 'Background' },
                gradientEndColor: { type: 'color', default: '#764ba2', section: 'Background' },
                gradientDirection: { type: 'select', options: ['135deg', '90deg', '45deg', '180deg', '0deg'], default: '135deg', section: 'Background' },
                
                // Layout Section
                columns: { type: 'select', options: ['2', '3', '4', '5'], default: '4', section: 'Layout' },
                gap: { type: 'select', options: ['16px', '24px', '32px', '40px', '48px'], default: '32px', section: 'Layout' },
                padding: { type: 'select', options: ['24px', '32px', '40px', '48px', '56px'], default: '40px', section: 'Layout' },
                borderRadius: { type: 'select', options: ['0px', '8px', '16px', '24px', '32px'], default: '16px', section: 'Layout' },
                alignment: { type: 'select', options: ['left', 'center', 'right'], default: 'center', section: 'Layout' },
                containerWidth: { type: 'select', options: ['auto', '100%', '80%', '90%'], default: '100%', section: 'Layout' },
                
                // Typography Section
                valueSize: { type: 'select', options: ['24px', '32px', '42px', '52px', '64px'], default: '42px', section: 'Typography' },
                valueFontWeight: { type: 'select', options: ['400', '500', '600', '700', '800'], default: '700', section: 'Typography' },
                valueColor: { type: 'color', default: '#ffffff', section: 'Typography' },
                labelSize: { type: 'select', options: ['12px', '14px', '16px', '18px'], default: '14px', section: 'Typography' },
                labelColor: { type: 'color', default: '#ffffff', section: 'Typography' },
                labelOpacity: { type: 'select', options: ['0.7', '0.8', '0.9', '1'], default: '0.9', section: 'Typography' },
                labelTransform: { type: 'select', options: ['none', 'uppercase', 'lowercase', 'capitalize'], default: 'uppercase', section: 'Typography' },
                labelSpacing: { type: 'select', options: ['0px', '0.5px', '1px', '1.5px', '2px'], default: '1px', section: 'Typography' },
                fontFamily: { type: 'select', options: ['inherit', 'Arial', 'Helvetica', 'Georgia'], default: 'inherit', section: 'Typography' },
                
                // Animation Section
                enableAnimation: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Animation' },
                animationType: { type: 'select', options: ['fadeInUp', 'fadeIn', 'slideInUp', 'bounceIn'], default: 'fadeInUp', section: 'Animation' },
                animationDuration: { type: 'select', options: ['0.3s', '0.5s', '0.7s', '1s'], default: '0.5s', section: 'Animation' },
                animationDelay: { type: 'select', options: ['0.05s', '0.1s', '0.15s', '0.2s'], default: '0.1s', section: 'Animation' },
                animationEasing: { type: 'select', options: ['ease', 'ease-out', 'ease-in', 'ease-in-out'], default: 'ease-out', section: 'Animation' },
                
                // Spacing Section
                valueMarginBottom: { type: 'select', options: ['4px', '8px', '12px', '16px'], default: '8px', section: 'Spacing' },
                itemPadding: { type: 'select', options: ['0px', '8px', '12px', '16px'], default: '0px', section: 'Spacing' },
                
                // Advanced Section
                shadow: { type: 'select', options: ['none', '0 4px 6px rgba(0,0,0,0.1)', '0 10px 30px rgba(0,0,0,0.2)', '0 20px 40px rgba(0,0,0,0.3)'], default: '0 10px 30px rgba(0,0,0,0.2)', section: 'Advanced' },
                border: { type: 'select', options: ['none', '1px solid rgba(255,255,255,0.2)', '2px solid rgba(255,255,255,0.3)'], default: 'none', section: 'Advanced' },
                hoverEffect: { type: 'select', options: ['none', 'scale', 'opacity'], default: 'none', section: 'Advanced' },
                transition: { type: 'select', options: ['none', 'all 0.2s ease', 'all 0.3s ease', 'transform 0.3s ease'], default: 'all 0.3s ease', section: 'Advanced' }
            }
        }
    ],
    buttons: [
        {
            id: 'button-animated',
            name: 'Animated Button',
            category: 'buttons',
            description: 'Button with smooth hover animations and comprehensive customization',
            code: `
                function AnimatedButton({ 
                    text = "Click Me", 
                    backgroundColor = "#8b5cf6", 
                    textColor = "#ffffff",
                    fontSize = "16px",
                    fontWeight = "600",
                    padding = "12px 24px",
                    borderRadius = "8px",
                    borderWidth = "0px",
                    borderColor = "#000000",
                    borderStyle = "solid",
                    shadowColor = "#8b5cf6",
                    shadowOpacity = "0.3",
                    shadowBlur = "20px",
                    shadowSpread = "0px",
                    hoverTransform = "translateY(-2px)",
                    hoverScale = "1.0",
                    transitionDuration = "0.3s",
                    transitionEasing = "ease",
                    width = "auto",
                    minWidth = "auto",
                    maxWidth = "none",
                    textAlign = "center",
                    letterSpacing = "normal",
                    textTransform = "none"
                }) {
                    return (
                        <button 
                            style={{
                                padding: padding,
                                background: backgroundColor,
                                color: textColor,
                                border: borderWidth + ' ' + borderStyle + ' ' + borderColor,
                                borderRadius: borderRadius,
                                fontSize: fontSize,
                                fontWeight: fontWeight,
                                cursor: 'pointer',
                                transition: 'all ' + transitionDuration + ' ' + transitionEasing,
                                transform: 'translateY(0) scale(1)',
                                width: width,
                                minWidth: minWidth,
                                maxWidth: maxWidth,
                                textAlign: textAlign,
                                letterSpacing: letterSpacing,
                                textTransform: textTransform,
                                boxShadow: 'none'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = hoverTransform + ' scale(' + hoverScale + ')';
                                e.target.style.boxShadow = '0 ' + shadowBlur + ' ' + shadowSpread + ' rgba(' + 
                                    parseInt(shadowColor.slice(1, 3), 16) + ', ' + 
                                    parseInt(shadowColor.slice(3, 5), 16) + ', ' + 
                                    parseInt(shadowColor.slice(5, 7), 16) + ', ' + shadowOpacity + ')';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0) scale(1)';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            {text}
                        </button>
                    );
                }
            `,
            props: {
                // Content Section
                text: { type: 'string', default: 'Click Me', section: 'Content' },
                
                // Colors Section
                backgroundColor: { type: 'color', default: '#8b5cf6', section: 'Colors' },
                textColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                borderColor: { type: 'color', default: '#000000', section: 'Colors' },
                shadowColor: { type: 'color', default: '#8b5cf6', section: 'Colors' },
                
                // Typography Section
                fontSize: { type: 'select', options: ['12px', '14px', '16px', '18px', '20px', '24px'], default: '16px', section: 'Typography' },
                fontWeight: { type: 'select', options: ['300', '400', '500', '600', '700', '800'], default: '600', section: 'Typography' },
                letterSpacing: { type: 'select', options: ['normal', '0.5px', '1px', '1.5px', '2px'], default: 'normal', section: 'Typography' },
                textTransform: { type: 'select', options: ['none', 'uppercase', 'lowercase', 'capitalize'], default: 'none', section: 'Typography' },
                textAlign: { type: 'select', options: ['left', 'center', 'right'], default: 'center', section: 'Typography' },
                
                // Spacing Section  
                padding: { type: 'select', options: ['8px 16px', '10px 20px', '12px 24px', '14px 28px', '16px 32px', '20px 40px'], default: '12px 24px', section: 'Spacing' },
                width: { type: 'select', options: ['auto', '100px', '150px', '200px', '250px', '100%'], default: 'auto', section: 'Spacing' },
                minWidth: { type: 'select', options: ['auto', '80px', '100px', '120px', '150px'], default: 'auto', section: 'Spacing' },
                maxWidth: { type: 'select', options: ['none', '200px', '300px', '400px', '500px'], default: 'none', section: 'Spacing' },
                
                // Shape Section
                borderRadius: { type: 'select', options: ['0px', '4px', '6px', '8px', '12px', '16px', '24px', '999px'], default: '8px', section: 'Shape' },
                borderWidth: { type: 'select', options: ['0px', '1px', '2px', '3px', '4px'], default: '0px', section: 'Shape' },
                borderStyle: { type: 'select', options: ['solid', 'dashed', 'dotted', 'double'], default: 'solid', section: 'Shape' },
                
                // Animation Section
                hoverTransform: { type: 'select', options: ['translateY(-2px)', 'translateY(-4px)', 'translateY(-6px)', 'translateY(0px)', 'translateX(2px)'], default: 'translateY(-2px)', section: 'Animation' },
                hoverScale: { type: 'select', options: ['0.95', '1.0', '1.05', '1.1', '1.15'], default: '1.0', section: 'Animation' },
                transitionDuration: { type: 'select', options: ['0.1s', '0.2s', '0.3s', '0.4s', '0.5s'], default: '0.3s', section: 'Animation' },
                transitionEasing: { type: 'select', options: ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'], default: 'ease', section: 'Animation' },
                shadowOpacity: { type: 'select', options: ['0.1', '0.2', '0.3', '0.4', '0.5'], default: '0.3', section: 'Animation' },
                shadowBlur: { type: 'select', options: ['10px', '15px', '20px', '25px', '30px'], default: '20px', section: 'Animation' },
                shadowSpread: { type: 'select', options: ['0px', '2px', '4px', '6px', '8px'], default: '0px', section: 'Animation' }
            }
        },
        {
            id: 'button-glow',
            name: 'Glow Button',
            category: 'buttons',
            description: 'Button with customizable glowing effect and gradient background',
            code: `
                function GlowButton({ 
                    text = "Glow Button", 
                    gradientStartColor = "#06b6d4", 
                    gradientEndColor = "#8b5cf6",
                    gradientDirection = "135deg",
                    textColor = "#ffffff",
                    fontSize = "16px",
                    fontWeight = "600",
                    padding = "14px 28px",
                    borderRadius = "12px",
                    borderWidth = "0px",
                    borderColor = "#000000",
                    borderStyle = "solid",
                    glowColor = "#06b6d4",
                    glowIntensity = "0.4",
                    glowBlur = "20px",
                    glowSpread = "0px",
                    hoverGlowIntensity = "0.6",
                    hoverGlowBlur = "40px",
                    hoverTransform = "translateY(-2px)",
                    hoverScale = "1.0",
                    transitionDuration = "0.3s",
                    transitionEasing = "ease",
                    width = "auto",
                    minWidth = "auto",
                    maxWidth = "none",
                    textAlign = "center",
                    letterSpacing = "normal",
                    textTransform = "none",
                    pulseAnimation = "false",
                    pulseSpeed = "2s"
                }) {
                    const [isHovered, setIsHovered] = React.useState(false);
                    
                    // Convert hex to RGB for glow effect
                    const hexToRgb = (hex) => {
                        const r = parseInt(hex.slice(1, 3), 16);
                        const g = parseInt(hex.slice(3, 5), 16);
                        const b = parseInt(hex.slice(5, 7), 16);
                        return r + ', ' + g + ', ' + b;
                    };
                    
                    const baseGlow = '0 0 ' + glowBlur + ' ' + glowSpread + ' rgba(' + hexToRgb(glowColor) + ', ' + glowIntensity + ')';
                    const hoverGlow = '0 0 ' + hoverGlowBlur + ' ' + glowSpread + ' rgba(' + hexToRgb(glowColor) + ', ' + hoverGlowIntensity + ')';
                    
                    return (
                        <button 
                            style={{
                                padding: padding,
                                background: 'linear-gradient(' + gradientDirection + ', ' + gradientStartColor + ', ' + gradientEndColor + ')',
                                color: textColor,
                                border: borderWidth + ' ' + borderStyle + ' ' + borderColor,
                                borderRadius: borderRadius,
                                fontSize: fontSize,
                                fontWeight: fontWeight,
                                cursor: 'pointer',
                                position: 'relative',
                                boxShadow: isHovered ? hoverGlow : baseGlow,
                                transition: 'all ' + transitionDuration + ' ' + transitionEasing,
                                transform: isHovered ? hoverTransform + ' scale(' + hoverScale + ')' : 'translateY(0) scale(1)',
                                width: width,
                                minWidth: minWidth,
                                maxWidth: maxWidth,
                                textAlign: textAlign,
                                letterSpacing: letterSpacing,
                                textTransform: textTransform,
                                animation: pulseAnimation === 'true' ? 'none' : 'none'
                            }}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                        >
                            {text}
                        </button>
                    );
                }
            `,
            props: {
                // Content Section
                text: { type: 'string', default: 'Glow Button', section: 'Content' },
                
                // Colors Section
                gradientStartColor: { type: 'color', default: '#06b6d4', section: 'Colors' },
                gradientEndColor: { type: 'color', default: '#8b5cf6', section: 'Colors' },
                textColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                borderColor: { type: 'color', default: '#000000', section: 'Colors' },
                glowColor: { type: 'color', default: '#06b6d4', section: 'Colors' },
                
                // Typography Section
                fontSize: { type: 'select', options: ['12px', '14px', '16px', '18px', '20px', '24px'], default: '16px', section: 'Typography' },
                fontWeight: { type: 'select', options: ['300', '400', '500', '600', '700', '800'], default: '600', section: 'Typography' },
                letterSpacing: { type: 'select', options: ['normal', '0.5px', '1px', '1.5px', '2px'], default: 'normal', section: 'Typography' },
                textTransform: { type: 'select', options: ['none', 'uppercase', 'lowercase', 'capitalize'], default: 'none', section: 'Typography' },
                textAlign: { type: 'select', options: ['left', 'center', 'right'], default: 'center', section: 'Typography' },
                
                // Spacing Section  
                padding: { type: 'select', options: ['8px 16px', '10px 20px', '12px 24px', '14px 28px', '16px 32px', '20px 40px'], default: '14px 28px', section: 'Spacing' },
                width: { type: 'select', options: ['auto', '100px', '150px', '200px', '250px', '100%'], default: 'auto', section: 'Spacing' },
                minWidth: { type: 'select', options: ['auto', '80px', '100px', '120px', '150px'], default: 'auto', section: 'Spacing' },
                maxWidth: { type: 'select', options: ['none', '200px', '300px', '400px', '500px'], default: 'none', section: 'Spacing' },
                
                // Shape Section
                borderRadius: { type: 'select', options: ['0px', '4px', '6px', '8px', '12px', '16px', '24px', '999px'], default: '12px', section: 'Shape' },
                borderWidth: { type: 'select', options: ['0px', '1px', '2px', '3px', '4px'], default: '0px', section: 'Shape' },
                borderStyle: { type: 'select', options: ['solid', 'dashed', 'dotted', 'double'], default: 'solid', section: 'Shape' },
                gradientDirection: { type: 'select', options: ['0deg', '45deg', '90deg', '135deg', '180deg', '225deg', '270deg', '315deg'], default: '135deg', section: 'Shape' },
                
                // Glow Effects Section
                glowIntensity: { type: 'select', options: ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7'], default: '0.4', section: 'Glow Effects' },
                glowBlur: { type: 'select', options: ['10px', '15px', '20px', '25px', '30px', '40px'], default: '20px', section: 'Glow Effects' },
                glowSpread: { type: 'select', options: ['0px', '2px', '4px', '6px', '8px'], default: '0px', section: 'Glow Effects' },
                hoverGlowIntensity: { type: 'select', options: ['0.2', '0.4', '0.6', '0.8', '1.0'], default: '0.6', section: 'Glow Effects' },
                hoverGlowBlur: { type: 'select', options: ['20px', '30px', '40px', '50px', '60px'], default: '40px', section: 'Glow Effects' },
                
                // Animation Section
                hoverTransform: { type: 'select', options: ['translateY(-2px)', 'translateY(-4px)', 'translateY(-6px)', 'translateY(0px)', 'translateX(2px)'], default: 'translateY(-2px)', section: 'Animation' },
                hoverScale: { type: 'select', options: ['0.95', '1.0', '1.05', '1.1', '1.15'], default: '1.0', section: 'Animation' },
                transitionDuration: { type: 'select', options: ['0.1s', '0.2s', '0.3s', '0.4s', '0.5s'], default: '0.3s', section: 'Animation' },
                transitionEasing: { type: 'select', options: ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'], default: 'ease', section: 'Animation' },
                pulseAnimation: { type: 'select', options: ['false', 'true'], default: 'false', section: 'Animation' },
                pulseSpeed: { type: 'select', options: ['1s', '1.5s', '2s', '2.5s', '3s'], default: '2s', section: 'Animation' }
            }
        },
        {
            id: 'button-gradient',
            name: 'Gradient Button',
            category: 'buttons',
            description: 'Button with customizable gradient background and press animations',
            code: `
                function GradientButton({ 
                    text = "Gradient", 
                    gradientStartColor = "#667eea", 
                    gradientEndColor = "#764ba2",
                    gradientDirection = "135deg",
                    gradientStartPosition = "0%",
                    gradientEndPosition = "100%",
                    textColor = "#ffffff",
                    fontSize = "16px",
                    fontWeight = "600",
                    padding = "12px 24px",
                    borderRadius = "10px",
                    borderWidth = "0px",
                    borderColor = "#000000",
                    borderStyle = "solid",
                    width = "auto",
                    minWidth = "auto",
                    maxWidth = "none",
                    textAlign = "center",
                    letterSpacing = "normal",
                    textTransform = "none",
                    pressScale = "0.95",
                    hoverScale = "1.0",
                    transitionDuration = "0.2s",
                    transitionEasing = "ease",
                    shadowEnabled = "false",
                    shadowColor = "#000000",
                    shadowOpacity = "0.2",
                    shadowBlur = "10px",
                    shadowOffsetX = "0px",
                    shadowOffsetY = "2px",
                    overlayEffect = "none",
                    overlayOpacity = "0.1"
                }) {
                    const [isPressed, setIsPressed] = React.useState(false);
                    const [isHovered, setIsHovered] = React.useState(false);
                    
                    // Create shadow style if enabled
                    const shadowStyle = shadowEnabled === 'true' ? 
                        shadowOffsetX + ' ' + shadowOffsetY + ' ' + shadowBlur + ' rgba(' + 
                        parseInt(shadowColor.slice(1, 3), 16) + ', ' + 
                        parseInt(shadowColor.slice(3, 5), 16) + ', ' + 
                        parseInt(shadowColor.slice(5, 7), 16) + ', ' + shadowOpacity + ')' : 'none';
                    
                    // Create overlay style
                    const getOverlayStyle = () => {
                        if (overlayEffect === 'none') return '';
                        if (overlayEffect === 'lighten' && isHovered) return ', rgba(255, 255, 255, ' + overlayOpacity + ')';
                        if (overlayEffect === 'darken' && isHovered) return ', rgba(0, 0, 0, ' + overlayOpacity + ')';
                        return '';
                    };
                    
                    return (
                        <button 
                            style={{
                                padding: padding,
                                background: 'linear-gradient(' + gradientDirection + ', ' + gradientStartColor + ' ' + gradientStartPosition + ', ' + gradientEndColor + ' ' + gradientEndPosition + ')' + getOverlayStyle(),
                                color: textColor,
                                border: borderWidth + ' ' + borderStyle + ' ' + borderColor,
                                borderRadius: borderRadius,
                                fontSize: fontSize,
                                fontWeight: fontWeight,
                                cursor: 'pointer',
                                transition: 'transform ' + transitionDuration + ' ' + transitionEasing + ', box-shadow ' + transitionDuration + ' ' + transitionEasing,
                                transform: isPressed ? 'scale(' + pressScale + ')' : isHovered ? 'scale(' + hoverScale + ')' : 'scale(1)',
                                width: width,
                                minWidth: minWidth,
                                maxWidth: maxWidth,
                                textAlign: textAlign,
                                letterSpacing: letterSpacing,
                                textTransform: textTransform,
                                boxShadow: shadowStyle,
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseDown={() => setIsPressed(true)}
                            onMouseUp={() => setIsPressed(false)}
                            onMouseLeave={() => {
                                setIsPressed(false);
                                setIsHovered(false);
                            }}
                            onMouseEnter={() => setIsHovered(true)}
                        >
                            {text}
                        </button>
                    );
                }
            `,
            props: {
                // Content Section
                text: { type: 'string', default: 'Gradient', section: 'Content' },
                
                // Gradient Section
                gradientStartColor: { type: 'color', default: '#667eea', section: 'Gradient' },
                gradientEndColor: { type: 'color', default: '#764ba2', section: 'Gradient' },
                gradientDirection: { type: 'select', options: ['0deg', '45deg', '90deg', '135deg', '180deg', '225deg', '270deg', '315deg'], default: '135deg', section: 'Gradient' },
                gradientStartPosition: { type: 'select', options: ['0%', '10%', '20%', '30%', '40%', '50%'], default: '0%', section: 'Gradient' },
                gradientEndPosition: { type: 'select', options: ['50%', '60%', '70%', '80%', '90%', '100%'], default: '100%', section: 'Gradient' },
                overlayEffect: { type: 'select', options: ['none', 'lighten', 'darken'], default: 'none', section: 'Gradient' },
                overlayOpacity: { type: 'select', options: ['0.05', '0.1', '0.15', '0.2', '0.25'], default: '0.1', section: 'Gradient' },
                
                // Colors Section
                textColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                borderColor: { type: 'color', default: '#000000', section: 'Colors' },
                shadowColor: { type: 'color', default: '#000000', section: 'Colors' },
                
                // Typography Section
                fontSize: { type: 'select', options: ['12px', '14px', '16px', '18px', '20px', '24px'], default: '16px', section: 'Typography' },
                fontWeight: { type: 'select', options: ['300', '400', '500', '600', '700', '800'], default: '600', section: 'Typography' },
                letterSpacing: { type: 'select', options: ['normal', '0.5px', '1px', '1.5px', '2px'], default: 'normal', section: 'Typography' },
                textTransform: { type: 'select', options: ['none', 'uppercase', 'lowercase', 'capitalize'], default: 'none', section: 'Typography' },
                textAlign: { type: 'select', options: ['left', 'center', 'right'], default: 'center', section: 'Typography' },
                
                // Spacing Section  
                padding: { type: 'select', options: ['8px 16px', '10px 20px', '12px 24px', '14px 28px', '16px 32px', '20px 40px'], default: '12px 24px', section: 'Spacing' },
                width: { type: 'select', options: ['auto', '100px', '150px', '200px', '250px', '100%'], default: 'auto', section: 'Spacing' },
                minWidth: { type: 'select', options: ['auto', '80px', '100px', '120px', '150px'], default: 'auto', section: 'Spacing' },
                maxWidth: { type: 'select', options: ['none', '200px', '300px', '400px', '500px'], default: 'none', section: 'Spacing' },
                
                // Shape Section
                borderRadius: { type: 'select', options: ['0px', '4px', '6px', '8px', '10px', '12px', '16px', '24px', '999px'], default: '10px', section: 'Shape' },
                borderWidth: { type: 'select', options: ['0px', '1px', '2px', '3px', '4px'], default: '0px', section: 'Shape' },
                borderStyle: { type: 'select', options: ['solid', 'dashed', 'dotted', 'double'], default: 'solid', section: 'Shape' },
                
                // Shadow Section
                shadowEnabled: { type: 'select', options: ['false', 'true'], default: 'false', section: 'Shadow' },
                shadowOpacity: { type: 'select', options: ['0.1', '0.2', '0.3', '0.4', '0.5'], default: '0.2', section: 'Shadow' },
                shadowBlur: { type: 'select', options: ['5px', '10px', '15px', '20px', '25px'], default: '10px', section: 'Shadow' },
                shadowOffsetX: { type: 'select', options: ['0px', '1px', '2px', '3px', '4px'], default: '0px', section: 'Shadow' },
                shadowOffsetY: { type: 'select', options: ['0px', '1px', '2px', '3px', '4px'], default: '2px', section: 'Shadow' },
                
                // Animation Section
                pressScale: { type: 'select', options: ['0.90', '0.95', '0.98', '1.0'], default: '0.95', section: 'Animation' },
                hoverScale: { type: 'select', options: ['1.0', '1.02', '1.05', '1.08', '1.1'], default: '1.0', section: 'Animation' },
                transitionDuration: { type: 'select', options: ['0.1s', '0.2s', '0.3s', '0.4s', '0.5s'], default: '0.2s', section: 'Animation' },
                transitionEasing: { type: 'select', options: ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'], default: 'ease', section: 'Animation' }
            }
        }
    ],
    cards: [
        {
            id: 'card-glass',
            name: 'Glass Card',
            category: 'cards',
            description: 'Highly customizable glassmorphism card with comprehensive styling options',
            code: `
                function GlassCard({ 
                    title = "Glass Card", 
                    content = "This is a glass morphism card with a modern design.",
                    backgroundOpacity = "0.1",
                    backgroundColorR = "255",
                    backgroundColorG = "255",
                    backgroundColorB = "255",
                    blurIntensity = "10px",
                    borderOpacity = "0.2",
                    borderColorR = "255",
                    borderColorG = "255",
                    borderColorB = "255",
                    borderWidth = "1px",
                    borderStyle = "solid",
                    borderRadius = "16px",
                    shadowColor = "#000000",
                    shadowOpacity = "0.1",
                    shadowBlur = "32px",
                    shadowOffsetX = "0",
                    shadowOffsetY = "8px",
                    padding = "24px",
                    maxWidth = "320px",
                    minHeight = "auto",
                    titleColor = "#1a1a1a",
                    titleFontSize = "20px",
                    titleFontWeight = "600",
                    titleMarginBottom = "12px",
                    titleTextAlign = "left",
                    contentColor = "#4a4a4a",
                    contentFontSize = "14px",
                    contentLineHeight = "1.6",
                    contentTextAlign = "left",
                    hoverTransform = "translateY(-2px)",
                    hoverShadowBlur = "40px",
                    transitionDuration = "0.3s",
                    overflow = "hidden",
                    cursor = "default"
                }) {
                    const [isHovered, setIsHovered] = React.useState(false);
                    
                    const bgStyle = 'rgba(' + backgroundColorR + ', ' + backgroundColorG + ', ' + backgroundColorB + ', ' + backgroundOpacity + ')';
                    const borderColor = 'rgba(' + borderColorR + ', ' + borderColorG + ', ' + borderColorB + ', ' + borderOpacity + ')';
                    
                    const shadowRgb = [
                        parseInt(shadowColor.slice(1, 3), 16),
                        parseInt(shadowColor.slice(3, 5), 16),
                        parseInt(shadowColor.slice(5, 7), 16)
                    ].join(', ');
                    
                    const boxShadowBase = shadowOffsetX + ' ' + shadowOffsetY + ' ' + shadowBlur + ' rgba(' + shadowRgb + ', ' + shadowOpacity + ')';
                    const boxShadowHover = shadowOffsetX + ' ' + shadowOffsetY + ' ' + hoverShadowBlur + ' rgba(' + shadowRgb + ', ' + shadowOpacity + ')';
                    
                    return (
                        <div 
                            style={{
                                padding: padding,
                                background: bgStyle,
                                backdropFilter: 'blur(' + blurIntensity + ')',
                                borderRadius: borderRadius,
                                border: borderWidth + ' ' + borderStyle + ' ' + borderColor,
                                boxShadow: isHovered ? boxShadowHover : boxShadowBase,
                                maxWidth: maxWidth,
                                minHeight: minHeight,
                                overflow: overflow,
                                cursor: cursor,
                                transform: isHovered ? hoverTransform : 'translateY(0)',
                                transition: 'all ' + transitionDuration + ' ease'
                            }}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                        >
                            <h3 style={{
                                fontSize: titleFontSize,
                                fontWeight: titleFontWeight,
                                marginBottom: titleMarginBottom,
                                color: titleColor,
                                textAlign: titleTextAlign,
                                margin: '0 0 ' + titleMarginBottom + ' 0'
                            }}>{title}</h3>
                            <p style={{
                                fontSize: contentFontSize,
                                lineHeight: contentLineHeight,
                                color: contentColor,
                                textAlign: contentTextAlign,
                                margin: '0'
                            }}>{content}</p>
                        </div>
                    );
                }
            `,
            props: {
                // Content Section
                title: { type: 'string', default: 'Glass Card', section: 'Content' },
                content: { type: 'text', default: 'This is a glass morphism card with a modern design.', section: 'Content' },
                
                // Glass Effect Section
                backgroundOpacity: { type: 'select', options: ['0.05', '0.1', '0.15', '0.2', '0.25', '0.3'], default: '0.1', section: 'Glass Effect' },
                backgroundColorR: { type: 'select', options: ['0', '128', '255'], default: '255', section: 'Glass Effect' },
                backgroundColorG: { type: 'select', options: ['0', '128', '255'], default: '255', section: 'Glass Effect' },
                backgroundColorB: { type: 'select', options: ['0', '128', '255'], default: '255', section: 'Glass Effect' },
                blurIntensity: { type: 'select', options: ['0px', '5px', '10px', '15px', '20px', '25px'], default: '10px', section: 'Glass Effect' },
                
                // Border Section
                borderOpacity: { type: 'select', options: ['0.1', '0.2', '0.3', '0.4', '0.5'], default: '0.2', section: 'Border' },
                borderColorR: { type: 'select', options: ['0', '128', '255'], default: '255', section: 'Border' },
                borderColorG: { type: 'select', options: ['0', '128', '255'], default: '255', section: 'Border' },
                borderColorB: { type: 'select', options: ['0', '128', '255'], default: '255', section: 'Border' },
                borderWidth: { type: 'select', options: ['0px', '1px', '2px', '3px'], default: '1px', section: 'Border' },
                borderStyle: { type: 'select', options: ['solid', 'dashed', 'dotted', 'double'], default: 'solid', section: 'Border' },
                borderRadius: { type: 'select', options: ['0px', '8px', '12px', '16px', '20px', '24px'], default: '16px', section: 'Border' },
                
                // Shadow Section
                shadowColor: { type: 'color', default: '#000000', section: 'Shadow' },
                shadowOpacity: { type: 'select', options: ['0.05', '0.1', '0.15', '0.2', '0.25'], default: '0.1', section: 'Shadow' },
                shadowBlur: { type: 'select', options: ['16px', '24px', '32px', '40px', '48px'], default: '32px', section: 'Shadow' },
                shadowOffsetX: { type: 'select', options: ['0', '2px', '4px', '6px', '8px'], default: '0', section: 'Shadow' },
                shadowOffsetY: { type: 'select', options: ['0', '4px', '8px', '12px', '16px'], default: '8px', section: 'Shadow' },
                
                // Typography Section
                titleColor: { type: 'color', default: '#1a1a1a', section: 'Typography' },
                titleFontSize: { type: 'select', options: ['16px', '18px', '20px', '22px', '24px'], default: '20px', section: 'Typography' },
                titleFontWeight: { type: 'select', options: ['400', '500', '600', '700', '800'], default: '600', section: 'Typography' },
                titleTextAlign: { type: 'select', options: ['left', 'center', 'right'], default: 'left', section: 'Typography' },
                contentColor: { type: 'color', default: '#4a4a4a', section: 'Typography' },
                contentFontSize: { type: 'select', options: ['12px', '14px', '16px', '18px'], default: '14px', section: 'Typography' },
                contentLineHeight: { type: 'select', options: ['1.4', '1.5', '1.6', '1.7', '1.8'], default: '1.6', section: 'Typography' },
                contentTextAlign: { type: 'select', options: ['left', 'center', 'right', 'justify'], default: 'left', section: 'Typography' },
                
                // Spacing Section
                padding: { type: 'select', options: ['16px', '20px', '24px', '28px', '32px'], default: '24px', section: 'Spacing' },
                maxWidth: { type: 'select', options: ['280px', '320px', '360px', '400px', '100%'], default: '320px', section: 'Spacing' },
                minHeight: { type: 'select', options: ['auto', '100px', '150px', '200px', '250px'], default: 'auto', section: 'Spacing' },
                titleMarginBottom: { type: 'select', options: ['8px', '12px', '16px', '20px', '24px'], default: '12px', section: 'Spacing' },
                
                // Interaction Section
                hoverTransform: { type: 'select', options: ['none', 'translateY(-2px)', 'translateY(-4px)', 'scale(1.02)', 'scale(1.05)'], default: 'translateY(-2px)', section: 'Interaction' },
                hoverShadowBlur: { type: 'select', options: ['32px', '36px', '40px', '44px', '48px'], default: '40px', section: 'Interaction' },
                transitionDuration: { type: 'select', options: ['0.2s', '0.3s', '0.4s', '0.5s'], default: '0.3s', section: 'Interaction' },
                overflow: { type: 'select', options: ['visible', 'hidden', 'auto'], default: 'hidden', section: 'Interaction' },
                cursor: { type: 'select', options: ['default', 'pointer', 'grab'], default: 'default', section: 'Interaction' }
            }
        },
        {
            id: 'card-product',
            name: 'Product Card',
            category: 'cards',
            description: 'E-commerce product card',
            code: `
                function ProductCard({ 
                    // Content Section
                    title = "Premium Headphones", 
                    price = "$299", 
                    originalPrice = "$399",
                    badge = "New",
                    description = "High-quality wireless headphones with noise cancellation",
                    rating = "4.5",
                    reviews = "128",
                    buttonText = "Add to Cart",
                    showDescription = "true",
                    showRating = "true",
                    showOriginalPrice = "true",
                    showButton = "true",
                    
                    // Colors Section
                    backgroundColor = "#ffffff",
                    imageGradientStart = "#667eea",
                    imageGradientEnd = "#764ba2",
                    titleColor = "#1a1a1a",
                    priceColor = "#8b5cf6",
                    originalPriceColor = "#999999",
                    badgeBackground = "#10b981",
                    badgeColor = "#ffffff",
                    descriptionColor = "#666666",
                    ratingColor = "#fbbf24",
                    reviewsColor = "#888888",
                    buttonBackground = "#8b5cf6",
                    buttonColor = "#ffffff",
                    buttonHoverBackground = "#764ba2",
                    
                    // Typography Section
                    titleFontSize = "18px",
                    titleFontWeight = "600",
                    priceFontSize = "24px",
                    priceFontWeight = "700",
                    originalPriceFontSize = "16px",
                    descriptionFontSize = "14px",
                    badgeFontSize = "12px",
                    badgeFontWeight = "600",
                    ratingFontSize = "14px",
                    buttonFontSize = "14px",
                    buttonFontWeight = "500",
                    
                    // Dimensions Section
                    cardWidth = "280px",
                    imageHeight = "200px",
                    contentPadding = "20px",
                    badgePadding = "4px 12px",
                    buttonPadding = "10px 20px",
                    
                    // Badge Section
                    badgePosition = "top-right",
                    badgeOffsetTop = "12px",
                    badgeOffsetSide = "12px",
                    badgeBorderRadius = "20px",
                    
                    // Button Section
                    buttonWidth = "100%",
                    buttonBorderRadius = "8px",
                    buttonMarginTop = "16px",
                    
                    // Shape & Effects Section
                    borderRadius = "12px",
                    shadowEnabled = "true",
                    shadowColor = "#000000",
                    shadowOpacity = "0.1",
                    shadowBlur = "20px",
                    hoverShadowBlur = "25px",
                    hoverTransform = "translateY(-4px)",
                    transitionDuration = "0.3s",
                    
                    // Visibility Section
                    showBadge = "true"
                }) {
                    const [isHovered, setIsHovered] = React.useState(false);
                    
                    const badgePositions = {
                        'top-left': { top: badgeOffsetTop, left: badgeOffsetSide },
                        'top-right': { top: badgeOffsetTop, right: badgeOffsetSide },
                        'bottom-left': { bottom: badgeOffsetTop, left: badgeOffsetSide },
                        'bottom-right': { bottom: badgeOffsetTop, right: badgeOffsetSide }
                    };
                    
                    const shadowValue = shadowEnabled === "true"
                        ? '0 4px ' + (isHovered ? hoverShadowBlur : shadowBlur) + ' rgba(' + 
                          (shadowColor === '#000000' ? '0, 0, 0' : '139, 92, 246') + ', ' + shadowOpacity + ')'
                        : 'none';
                    
                    return (
                        <div style={{
                            width: cardWidth,
                            borderRadius: borderRadius,
                            overflow: 'hidden',
                            boxShadow: shadowValue,
                            background: backgroundColor,
                            transition: 'all ' + transitionDuration,
                            transform: isHovered ? hoverTransform : 'translateY(0)'
                        }}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        >
                            <div style={{
                                height: imageHeight,
                                background: 'linear-gradient(135deg, ' + imageGradientStart + ' 0%, ' + imageGradientEnd + ' 100%)',
                                position: 'relative'
                            }}>
                                {showBadge === "true" && badge && (
                                    <span style={{
                                        position: 'absolute',
                                        ...badgePositions[badgePosition],
                                        background: badgeBackground,
                                        color: badgeColor,
                                        padding: badgePadding,
                                        borderRadius: badgeBorderRadius,
                                        fontSize: badgeFontSize,
                                        fontWeight: badgeFontWeight
                                    }}>{badge}</span>
                                )}
                            </div>
                            <div style={{ padding: contentPadding }}>
                                <h3 style={{
                                    fontSize: titleFontSize,
                                    fontWeight: titleFontWeight,
                                    marginBottom: '8px',
                                    color: titleColor
                                }}>{title}</h3>
                                
                                {showDescription === "true" && description && (
                                    <p style={{
                                        fontSize: descriptionFontSize,
                                        color: descriptionColor,
                                        marginBottom: '12px',
                                        lineHeight: '1.5'
                                    }}>{description}</p>
                                )}
                                
                                {showRating === "true" && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '12px'
                                    }}>
                                        <span style={{ color: ratingColor, fontSize: ratingFontSize }}>
                                            {'★'.repeat(Math.floor(parseFloat(rating)))}
                                            {'☆'.repeat(5 - Math.floor(parseFloat(rating)))}
                                        </span>
                                        <span style={{ fontSize: ratingFontSize, color: titleColor }}>{rating}</span>
                                        <span style={{ fontSize: '12px', color: reviewsColor }}>({reviews} reviews)</span>
                                    </div>
                                )}
                                
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                                    <p style={{
                                        fontSize: priceFontSize,
                                        fontWeight: priceFontWeight,
                                        color: priceColor
                                    }}>{price}</p>
                                    {showOriginalPrice === "true" && originalPrice && (
                                        <p style={{
                                            fontSize: originalPriceFontSize,
                                            color: originalPriceColor,
                                            textDecoration: 'line-through'
                                        }}>{originalPrice}</p>
                                    )}
                                </div>
                                
                                {showButton === "true" && (
                                    <button style={{
                                        width: buttonWidth,
                                        padding: buttonPadding,
                                        marginTop: buttonMarginTop,
                                        background: isHovered ? buttonHoverBackground : buttonBackground,
                                        color: buttonColor,
                                        border: 'none',
                                        borderRadius: buttonBorderRadius,
                                        fontSize: buttonFontSize,
                                        fontWeight: buttonFontWeight,
                                        cursor: 'pointer',
                                        transition: 'background ' + transitionDuration
                                    }}>{buttonText}</button>
                                )}
                            </div>
                        </div>
                    );
                }
            `,
            props: {
                // Content Section
                title: { type: 'string', default: 'Premium Headphones', section: 'Content' },
                price: { type: 'string', default: '$299', section: 'Content' },
                originalPrice: { type: 'string', default: '$399', section: 'Content' },
                badge: { type: 'string', default: 'New', section: 'Content' },
                description: { type: 'string', default: 'High-quality wireless headphones with noise cancellation', section: 'Content' },
                rating: { type: 'string', default: '4.5', section: 'Content' },
                reviews: { type: 'string', default: '128', section: 'Content' },
                buttonText: { type: 'string', default: 'Add to Cart', section: 'Content' },
                showDescription: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                showRating: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                showOriginalPrice: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                showButton: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                
                // Colors Section
                backgroundColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                imageGradientStart: { type: 'color', default: '#667eea', section: 'Colors' },
                imageGradientEnd: { type: 'color', default: '#764ba2', section: 'Colors' },
                titleColor: { type: 'color', default: '#1a1a1a', section: 'Colors' },
                priceColor: { type: 'color', default: '#8b5cf6', section: 'Colors' },
                originalPriceColor: { type: 'color', default: '#999999', section: 'Colors' },
                badgeBackground: { type: 'color', default: '#10b981', section: 'Colors' },
                badgeColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                descriptionColor: { type: 'color', default: '#666666', section: 'Colors' },
                ratingColor: { type: 'color', default: '#fbbf24', section: 'Colors' },
                reviewsColor: { type: 'color', default: '#888888', section: 'Colors' },
                buttonBackground: { type: 'color', default: '#8b5cf6', section: 'Colors' },
                buttonColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                buttonHoverBackground: { type: 'color', default: '#764ba2', section: 'Colors' },
                
                // Typography Section
                titleFontSize: { type: 'select', options: ['16px', '18px', '20px', '22px'], default: '18px', section: 'Typography' },
                titleFontWeight: { type: 'select', options: ['500', '600', '700'], default: '600', section: 'Typography' },
                priceFontSize: { type: 'select', options: ['20px', '22px', '24px', '26px', '28px'], default: '24px', section: 'Typography' },
                priceFontWeight: { type: 'select', options: ['600', '700', '800'], default: '700', section: 'Typography' },
                originalPriceFontSize: { type: 'select', options: ['14px', '16px', '18px'], default: '16px', section: 'Typography' },
                descriptionFontSize: { type: 'select', options: ['12px', '13px', '14px', '15px'], default: '14px', section: 'Typography' },
                badgeFontSize: { type: 'select', options: ['10px', '11px', '12px', '13px'], default: '12px', section: 'Typography' },
                badgeFontWeight: { type: 'select', options: ['500', '600', '700'], default: '600', section: 'Typography' },
                ratingFontSize: { type: 'select', options: ['12px', '13px', '14px', '15px'], default: '14px', section: 'Typography' },
                buttonFontSize: { type: 'select', options: ['13px', '14px', '15px', '16px'], default: '14px', section: 'Typography' },
                buttonFontWeight: { type: 'select', options: ['400', '500', '600'], default: '500', section: 'Typography' },
                
                // Dimensions Section
                cardWidth: { type: 'select', options: ['240px', '260px', '280px', '300px', '320px'], default: '280px', section: 'Dimensions' },
                imageHeight: { type: 'select', options: ['160px', '180px', '200px', '220px', '240px'], default: '200px', section: 'Dimensions' },
                contentPadding: { type: 'select', options: ['16px', '20px', '24px', '28px'], default: '20px', section: 'Dimensions' },
                badgePadding: { type: 'select', options: ['2px 8px', '4px 12px', '6px 16px'], default: '4px 12px', section: 'Dimensions' },
                buttonPadding: { type: 'select', options: ['8px 16px', '10px 20px', '12px 24px'], default: '10px 20px', section: 'Dimensions' },
                
                // Badge Section
                badgePosition: { type: 'select', options: ['top-left', 'top-right', 'bottom-left', 'bottom-right'], default: 'top-right', section: 'Badge' },
                badgeOffsetTop: { type: 'select', options: ['8px', '12px', '16px', '20px'], default: '12px', section: 'Badge' },
                badgeOffsetSide: { type: 'select', options: ['8px', '12px', '16px', '20px'], default: '12px', section: 'Badge' },
                badgeBorderRadius: { type: 'select', options: ['4px', '8px', '12px', '16px', '20px', '999px'], default: '20px', section: 'Badge' },
                
                // Button Section
                buttonWidth: { type: 'select', options: ['auto', '100%'], default: '100%', section: 'Button' },
                buttonBorderRadius: { type: 'select', options: ['4px', '6px', '8px', '10px', '12px'], default: '8px', section: 'Button' },
                buttonMarginTop: { type: 'select', options: ['8px', '12px', '16px', '20px'], default: '16px', section: 'Button' },
                
                // Shape & Effects Section
                borderRadius: { type: 'select', options: ['8px', '12px', '16px', '20px', '24px'], default: '12px', section: 'Shape & Effects' },
                shadowEnabled: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Shape & Effects' },
                shadowColor: { type: 'color', default: '#000000', section: 'Shape & Effects' },
                shadowOpacity: { type: 'select', options: ['0.05', '0.1', '0.15', '0.2'], default: '0.1', section: 'Shape & Effects' },
                shadowBlur: { type: 'select', options: ['10px', '15px', '20px', '25px'], default: '20px', section: 'Shape & Effects' },
                hoverShadowBlur: { type: 'select', options: ['20px', '25px', '30px', '35px'], default: '25px', section: 'Shape & Effects' },
                hoverTransform: { type: 'select', options: ['translateY(-2px)', 'translateY(-4px)', 'translateY(-6px)', 'scale(1.02)'], default: 'translateY(-4px)', section: 'Shape & Effects' },
                transitionDuration: { type: 'select', options: ['0.2s', '0.3s', '0.4s'], default: '0.3s', section: 'Shape & Effects' },
                
                // Visibility Section
                showBadge: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Visibility' }
            }
        }
    ],
    forms: [
        {
            id: 'form-login',
            name: 'Login Form',
            category: 'forms',
            description: 'Simple login form',
            code: `
                function LoginForm({ 
                    // Content Section
                    title = "Welcome Back",
                    subtitle = "Sign in to your account",
                    emailLabel = "Email",
                    emailPlaceholder = "Email address",
                    passwordLabel = "Password",
                    passwordPlaceholder = "Enter your password",
                    buttonText = "Sign In",
                    forgotText = "Forgot password?",
                    signupText = "Don't have an account? Sign up",
                    showSubtitle = "true",
                    showLabels = "true",
                    showForgotPassword = "true",
                    showSignupLink = "true",
                    showRememberMe = "true",
                    rememberMeText = "Remember me",
                    
                    // Colors Section
                    backgroundColor = "#ffffff",
                    titleColor = "#1a1a1a",
                    subtitleColor = "#666666",
                    labelColor = "#333333",
                    inputBackground = "#ffffff",
                    inputBorderColor = "#e5e5e5",
                    inputFocusBorderColor = "#8b5cf6",
                    inputTextColor = "#1a1a1a",
                    placeholderColor = "#999999",
                    buttonBackground = "#8b5cf6",
                    buttonHoverBackground = "#764ba2",
                    buttonTextColor = "#ffffff",
                    linkColor = "#8b5cf6",
                    linkHoverColor = "#764ba2",
                    checkboxColor = "#8b5cf6",
                    
                    // Typography Section
                    titleFontSize = "24px",
                    titleFontWeight = "700",
                    subtitleFontSize = "14px",
                    labelFontSize = "14px",
                    labelFontWeight = "500",
                    inputFontSize = "14px",
                    buttonFontSize = "16px",
                    buttonFontWeight = "600",
                    linkFontSize = "14px",
                    
                    // Dimensions Section
                    formWidth = "360px",
                    formPadding = "32px",
                    fieldSpacing = "16px",
                    buttonMarginTop = "20px",
                    inputPadding = "12px",
                    buttonPadding = "12px",
                    
                    // Shape Section
                    formBorderRadius = "12px",
                    inputBorderRadius = "8px",
                    buttonBorderRadius = "8px",
                    inputBorderWidth = "1px",
                    
                    // Shadow Section
                    shadowEnabled = "true",
                    shadowColor = "#000000",
                    shadowOpacity = "0.1",
                    shadowBlur = "40px",
                    shadowSpread = "0px",
                    
                    // Layout Section
                    titleAlignment = "center",
                    fieldAlignment = "left",
                    buttonWidth = "100%",
                    linkAlignment = "center",
                    rememberMePosition = "left"
                }) {
                    const [email, setEmail] = React.useState('');
                    const [password, setPassword] = React.useState('');
                    const [rememberMe, setRememberMe] = React.useState(false);
                    const [isHovered, setIsHovered] = React.useState(false);
                    const [focusedField, setFocusedField] = React.useState('');
                    
                    const shadowValue = shadowEnabled === "true"
                        ? '0 10px ' + shadowBlur + ' ' + shadowSpread + ' rgba(' + 
                          (shadowColor === '#000000' ? '0, 0, 0' : '139, 92, 246') + ', ' + shadowOpacity + ')'
                        : 'none';
                    
                    return (
                        <div style={{
                            width: formWidth,
                            padding: formPadding,
                            background: backgroundColor,
                            borderRadius: formBorderRadius,
                            boxShadow: shadowValue
                        }}>
                            <h2 style={{
                                fontSize: titleFontSize,
                                fontWeight: titleFontWeight,
                                marginBottom: showSubtitle === "true" ? '8px' : '24px',
                                textAlign: titleAlignment,
                                color: titleColor
                            }}>{title}</h2>
                            
                            {showSubtitle === "true" && (
                                <p style={{
                                    fontSize: subtitleFontSize,
                                    color: subtitleColor,
                                    textAlign: titleAlignment,
                                    marginBottom: '24px'
                                }}>{subtitle}</p>
                            )}
                            
                            <div style={{ marginBottom: fieldSpacing }}>
                                {showLabels === "true" && (
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '6px',
                                        fontSize: labelFontSize,
                                        fontWeight: labelFontWeight,
                                        color: labelColor,
                                        textAlign: fieldAlignment
                                    }}>{emailLabel}</label>
                                )}
                                <input
                                    type="email"
                                    placeholder={emailPlaceholder}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField('')}
                                    style={{
                                        width: '100%',
                                        padding: inputPadding,
                                        background: inputBackground,
                                        border: inputBorderWidth + ' solid ' + (focusedField === 'email' ? inputFocusBorderColor : inputBorderColor),
                                        borderRadius: inputBorderRadius,
                                        fontSize: inputFontSize,
                                        color: inputTextColor,
                                        transition: 'border-color 0.2s',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            
                            <div style={{ marginBottom: showRememberMe === "true" || showForgotPassword === "true" ? '12px' : buttonMarginTop }}>
                                {showLabels === "true" && (
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '6px',
                                        fontSize: labelFontSize,
                                        fontWeight: labelFontWeight,
                                        color: labelColor,
                                        textAlign: fieldAlignment
                                    }}>{passwordLabel}</label>
                                )}
                                <input
                                    type="password"
                                    placeholder={passwordPlaceholder}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField('')}
                                    style={{
                                        width: '100%',
                                        padding: inputPadding,
                                        background: inputBackground,
                                        border: inputBorderWidth + ' solid ' + (focusedField === 'password' ? inputFocusBorderColor : inputBorderColor),
                                        borderRadius: inputBorderRadius,
                                        fontSize: inputFontSize,
                                        color: inputTextColor,
                                        transition: 'border-color 0.2s',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            
                            {(showRememberMe === "true" || showForgotPassword === "true") && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: buttonMarginTop
                                }}>
                                    {showRememberMe === "true" && (
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: linkFontSize,
                                            color: labelColor,
                                            cursor: 'pointer'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                                style={{ accentColor: checkboxColor }}
                                            />
                                            {rememberMeText}
                                        </label>
                                    )}
                                    
                                    {showForgotPassword === "true" && (
                                        <a href="#" style={{
                                            fontSize: linkFontSize,
                                            color: linkColor,
                                            textDecoration: 'none',
                                            transition: 'color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.color = linkHoverColor}
                                        onMouseLeave={(e) => e.target.style.color = linkColor}
                                        >{forgotText}</a>
                                    )}
                                </div>
                            )}
                            
                            <button 
                                style={{
                                    width: buttonWidth,
                                    padding: buttonPadding,
                                    background: isHovered ? buttonHoverBackground : buttonBackground,
                                    color: buttonTextColor,
                                    border: 'none',
                                    borderRadius: buttonBorderRadius,
                                    fontSize: buttonFontSize,
                                    fontWeight: buttonFontWeight,
                                    cursor: 'pointer',
                                    transition: 'background 0.3s'
                                }}
                                onMouseEnter={() => setIsHovered(true)}
                                onMouseLeave={() => setIsHovered(false)}
                            >
                                {buttonText}
                            </button>
                            
                            {showSignupLink === "true" && (
                                <p style={{
                                    marginTop: '20px',
                                    fontSize: linkFontSize,
                                    color: subtitleColor,
                                    textAlign: linkAlignment
                                }}>
                                    {signupText.split('?')[0]}?{' '}
                                    <a href="#" style={{
                                        color: linkColor,
                                        textDecoration: 'none',
                                        fontWeight: '500'
                                    }}>{signupText.split('?')[1] || 'Sign up'}</a>
                                </p>
                            )}
                        </div>
                    );
                }
            `,
            props: {
                // Content Section
                title: { type: 'string', default: 'Welcome Back', section: 'Content' },
                subtitle: { type: 'string', default: 'Sign in to your account', section: 'Content' },
                emailLabel: { type: 'string', default: 'Email', section: 'Content' },
                emailPlaceholder: { type: 'string', default: 'Email address', section: 'Content' },
                passwordLabel: { type: 'string', default: 'Password', section: 'Content' },
                passwordPlaceholder: { type: 'string', default: 'Enter your password', section: 'Content' },
                buttonText: { type: 'string', default: 'Sign In', section: 'Content' },
                forgotText: { type: 'string', default: 'Forgot password?', section: 'Content' },
                signupText: { type: 'string', default: "Don't have an account? Sign up", section: 'Content' },
                showSubtitle: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                showLabels: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                showForgotPassword: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                showSignupLink: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                showRememberMe: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Content' },
                rememberMeText: { type: 'string', default: 'Remember me', section: 'Content' },
                
                // Colors Section
                backgroundColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                titleColor: { type: 'color', default: '#1a1a1a', section: 'Colors' },
                subtitleColor: { type: 'color', default: '#666666', section: 'Colors' },
                labelColor: { type: 'color', default: '#333333', section: 'Colors' },
                inputBackground: { type: 'color', default: '#ffffff', section: 'Colors' },
                inputBorderColor: { type: 'color', default: '#e5e5e5', section: 'Colors' },
                inputFocusBorderColor: { type: 'color', default: '#8b5cf6', section: 'Colors' },
                inputTextColor: { type: 'color', default: '#1a1a1a', section: 'Colors' },
                placeholderColor: { type: 'color', default: '#999999', section: 'Colors' },
                buttonBackground: { type: 'color', default: '#8b5cf6', section: 'Colors' },
                buttonHoverBackground: { type: 'color', default: '#764ba2', section: 'Colors' },
                buttonTextColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                linkColor: { type: 'color', default: '#8b5cf6', section: 'Colors' },
                linkHoverColor: { type: 'color', default: '#764ba2', section: 'Colors' },
                checkboxColor: { type: 'color', default: '#8b5cf6', section: 'Colors' },
                
                // Typography Section
                titleFontSize: { type: 'select', options: ['20px', '22px', '24px', '26px', '28px'], default: '24px', section: 'Typography' },
                titleFontWeight: { type: 'select', options: ['600', '700', '800'], default: '700', section: 'Typography' },
                subtitleFontSize: { type: 'select', options: ['12px', '13px', '14px', '15px'], default: '14px', section: 'Typography' },
                labelFontSize: { type: 'select', options: ['12px', '13px', '14px', '15px'], default: '14px', section: 'Typography' },
                labelFontWeight: { type: 'select', options: ['400', '500', '600'], default: '500', section: 'Typography' },
                inputFontSize: { type: 'select', options: ['13px', '14px', '15px', '16px'], default: '14px', section: 'Typography' },
                buttonFontSize: { type: 'select', options: ['14px', '15px', '16px', '17px', '18px'], default: '16px', section: 'Typography' },
                buttonFontWeight: { type: 'select', options: ['500', '600', '700'], default: '600', section: 'Typography' },
                linkFontSize: { type: 'select', options: ['12px', '13px', '14px', '15px'], default: '14px', section: 'Typography' },
                
                // Dimensions Section
                formWidth: { type: 'select', options: ['320px', '360px', '400px', '440px', '480px'], default: '360px', section: 'Dimensions' },
                formPadding: { type: 'select', options: ['24px', '28px', '32px', '36px', '40px'], default: '32px', section: 'Dimensions' },
                fieldSpacing: { type: 'select', options: ['12px', '14px', '16px', '18px', '20px'], default: '16px', section: 'Dimensions' },
                buttonMarginTop: { type: 'select', options: ['16px', '20px', '24px', '28px'], default: '20px', section: 'Dimensions' },
                inputPadding: { type: 'select', options: ['10px', '12px', '14px', '16px'], default: '12px', section: 'Dimensions' },
                buttonPadding: { type: 'select', options: ['10px', '12px', '14px', '16px'], default: '12px', section: 'Dimensions' },
                
                // Shape Section
                formBorderRadius: { type: 'select', options: ['8px', '10px', '12px', '16px', '20px'], default: '12px', section: 'Shape' },
                inputBorderRadius: { type: 'select', options: ['4px', '6px', '8px', '10px'], default: '8px', section: 'Shape' },
                buttonBorderRadius: { type: 'select', options: ['4px', '6px', '8px', '10px', '12px'], default: '8px', section: 'Shape' },
                inputBorderWidth: { type: 'select', options: ['1px', '2px'], default: '1px', section: 'Shape' },
                
                // Shadow Section
                shadowEnabled: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Shadow' },
                shadowColor: { type: 'color', default: '#000000', section: 'Shadow' },
                shadowOpacity: { type: 'select', options: ['0.05', '0.1', '0.15', '0.2'], default: '0.1', section: 'Shadow' },
                shadowBlur: { type: 'select', options: ['20px', '30px', '40px', '50px'], default: '40px', section: 'Shadow' },
                shadowSpread: { type: 'select', options: ['-10px', '-5px', '0px', '5px'], default: '0px', section: 'Shadow' },
                
                // Layout Section
                titleAlignment: { type: 'select', options: ['left', 'center', 'right'], default: 'center', section: 'Layout' },
                fieldAlignment: { type: 'select', options: ['left', 'center', 'right'], default: 'left', section: 'Layout' },
                buttonWidth: { type: 'select', options: ['auto', '100%'], default: '100%', section: 'Layout' },
                linkAlignment: { type: 'select', options: ['left', 'center', 'right'], default: 'center', section: 'Layout' },
                rememberMePosition: { type: 'select', options: ['left', 'right'], default: 'left', section: 'Layout' }
            }
        }
    ],
    headers: [
        {
            id: 'header-split-hero',
            name: 'Split Hero',
            category: 'headers',
            description: 'Hero section with text and image side by side',
            code: `
                function SplitHero({ 
                    // Content Section
                    headline = "Build Amazing Products", 
                    subtext = "Turn your ideas into reality with our powerful platform",
                    ctaText = "Start Building",
                    emoji = "🚀",
                    
                    // Background Section
                    backgroundType = "gradient",
                    backgroundColor = "#ffffff",
                    gradientStartColor = "#f5f5f5",
                    gradientEndColor = "#ffffff",
                    gradientDirection = "135deg",
                    
                    // Typography Section
                    headlineSize = "48px",
                    headlineWeight = "700",
                    headlineColor = "#1a1a1a",
                    subtextSize = "18px",
                    subtextColor = "#666666",
                    
                    // Layout Section
                    containerPadding = "60px 40px",
                    sectionGap = "60px",
                    borderRadius = "16px",
                    imageHeight = "300px",
                    contentAlignment = "center",
                    
                    // Button Section
                    buttonBackground = "#8b5cf6",
                    buttonColor = "#ffffff",
                    buttonPadding = "14px 32px",
                    buttonBorderRadius = "8px",
                    buttonFontSize = "16px",
                    buttonFontWeight = "600",
                    
                    // Visual Section
                    imageBackgroundType = "gradient",
                    imageBackgroundColor = "#f0f0f0",
                    imageGradientStart = "#8b5cf620",
                    imageGradientEnd = "#8b5cf640",
                    emojiSize = "60px"
                }) {
                    const backgroundStyle = backgroundType === 'gradient' 
                        ? 'linear-gradient(' + gradientDirection + ', ' + gradientStartColor + ' 0%, ' + gradientEndColor + ' 100%)'
                        : backgroundColor;
                        
                    const imageBackgroundStyle = imageBackgroundType === 'gradient'
                        ? 'linear-gradient(135deg, ' + buttonBackground + '20, ' + buttonBackground + '40)'
                        : imageBackgroundColor;
                    
                    return (
                        <div style={{
                            display: 'flex',
                            alignItems: contentAlignment,
                            padding: containerPadding,
                            background: backgroundStyle,
                            borderRadius: borderRadius,
                            gap: sectionGap
                        }}>
                            <div style={{ flex: 1 }}>
                                <h1 style={{
                                    fontSize: headlineSize,
                                    fontWeight: headlineWeight,
                                    lineHeight: '1.2',
                                    marginBottom: '20px',
                                    color: headlineColor
                                }}>{headline}</h1>
                                <p style={{
                                    fontSize: subtextSize,
                                    color: subtextColor,
                                    marginBottom: '32px',
                                    lineHeight: '1.6'
                                }}>{subtext}</p>
                                <button style={{
                                    padding: buttonPadding,
                                    background: buttonBackground,
                                    color: buttonColor,
                                    border: 'none',
                                    borderRadius: buttonBorderRadius,
                                    fontSize: buttonFontSize,
                                    fontWeight: buttonFontWeight,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px ' + buttonBackground + '30'
                                }}>{ctaText}</button>
                            </div>
                            <div style={{
                                flex: 1,
                                height: imageHeight,
                                background: imageBackgroundStyle,
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: emojiSize
                            }}>{emoji}</div>
                        </div>
                    );
                }
            `,
            props: {
                // Content Section
                headline: { type: 'string', default: 'Build Amazing Products', section: 'Content' },
                subtext: { type: 'text', default: 'Turn your ideas into reality with our powerful platform', section: 'Content' },
                ctaText: { type: 'string', default: 'Start Building', section: 'Content' },
                emoji: { type: 'string', default: '🚀', section: 'Content' },
                
                // Background Section
                backgroundType: { type: 'select', options: ['solid', 'gradient'], default: 'gradient', section: 'Background' },
                backgroundColor: { type: 'color', default: '#ffffff', section: 'Background' },
                gradientStartColor: { type: 'color', default: '#f5f5f5', section: 'Background' },
                gradientEndColor: { type: 'color', default: '#ffffff', section: 'Background' },
                gradientDirection: { type: 'select', options: ['0deg', '45deg', '90deg', '135deg', '180deg', '225deg', '270deg', '315deg'], default: '135deg', section: 'Background' },
                
                // Typography Section
                headlineSize: { type: 'select', options: ['32px', '40px', '48px', '56px', '64px'], default: '48px', section: 'Typography' },
                headlineWeight: { type: 'select', options: ['400', '500', '600', '700', '800'], default: '700', section: 'Typography' },
                headlineColor: { type: 'color', default: '#1a1a1a', section: 'Typography' },
                subtextSize: { type: 'select', options: ['14px', '16px', '18px', '20px', '24px'], default: '18px', section: 'Typography' },
                subtextColor: { type: 'color', default: '#666666', section: 'Typography' },
                
                // Layout Section
                containerPadding: { type: 'select', options: ['40px 20px', '50px 30px', '60px 40px', '80px 60px', '100px 80px'], default: '60px 40px', section: 'Layout' },
                sectionGap: { type: 'select', options: ['40px', '50px', '60px', '80px', '100px'], default: '60px', section: 'Layout' },
                borderRadius: { type: 'select', options: ['0px', '8px', '12px', '16px', '20px', '24px'], default: '16px', section: 'Layout' },
                imageHeight: { type: 'select', options: ['200px', '250px', '300px', '350px', '400px'], default: '300px', section: 'Layout' },
                contentAlignment: { type: 'select', options: ['flex-start', 'center', 'flex-end'], default: 'center', section: 'Layout' },
                
                // Button Section
                buttonBackground: { type: 'color', default: '#8b5cf6', section: 'Button' },
                buttonColor: { type: 'color', default: '#ffffff', section: 'Button' },
                buttonPadding: { type: 'select', options: ['8px 16px', '10px 20px', '12px 24px', '14px 32px', '16px 40px'], default: '14px 32px', section: 'Button' },
                buttonBorderRadius: { type: 'select', options: ['4px', '6px', '8px', '12px', '16px', '999px'], default: '8px', section: 'Button' },
                buttonFontSize: { type: 'select', options: ['14px', '16px', '18px', '20px'], default: '16px', section: 'Button' },
                buttonFontWeight: { type: 'select', options: ['400', '500', '600', '700'], default: '600', section: 'Button' },
                
                // Visual Section
                imageBackgroundType: { type: 'select', options: ['solid', 'gradient'], default: 'gradient', section: 'Visual' },
                imageBackgroundColor: { type: 'color', default: '#f0f0f0', section: 'Visual' },
                emojiSize: { type: 'select', options: ['40px', '50px', '60px', '80px', '100px'], default: '60px', section: 'Visual' }
            }
        },
        {
            id: 'header-video-hero',
            name: 'Video Hero',
            category: 'headers',
            description: 'Hero with video background placeholder',
            code: `
                function VideoHero({ 
                    // Content Section
                    title = "Experience Innovation",
                    subtitle = "Watch our story unfold",
                    playIcon = "▶️",
                    
                    // Background Section
                    backgroundType = "gradient",
                    backgroundColor = "#667eea",
                    gradientStartColor = "#667eea",
                    gradientEndColor = "#764ba2",
                    gradientDirection = "135deg",
                    
                    // Overlay Section
                    overlayOpacity = "0.4",
                    overlayColor = "#000000",
                    
                    // Typography Section
                    titleSize = "42px",
                    titleWeight = "700",
                    titleColor = "#ffffff",
                    subtitleSize = "18px",
                    subtitleOpacity = "0.9",
                    
                    // Layout Section
                    containerHeight = "400px",
                    borderRadius = "16px",
                    contentPadding = "40px",
                    textAlignment = "center",
                    
                    // Play Button Section
                    playButtonSize = "80px",
                    playButtonBackground = "rgba(255, 255, 255, 0.2)",
                    playButtonMargin = "24px",
                    playIconSize = "32px",
                    playButtonHoverScale = "1.1"
                }) {
                    const backgroundStyle = backgroundType === 'gradient' 
                        ? 'linear-gradient(' + gradientDirection + ', ' + gradientStartColor + ' 0%, ' + gradientEndColor + ' 100%)'
                        : backgroundColor;
                    
                    return (
                        <div style={{
                            position: 'relative',
                            height: containerHeight,
                            borderRadius: borderRadius,
                            overflow: 'hidden',
                            background: backgroundStyle
                        }}>
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(' + parseInt(overlayColor.slice(1, 3), 16) + ', ' + parseInt(overlayColor.slice(3, 5), 16) + ', ' + parseInt(overlayColor.slice(5, 7), 16) + ', ' + overlayOpacity + ')',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: titleColor,
                                textAlign: textAlignment,
                                padding: contentPadding
                            }}>
                                <div style={{
                                    width: playButtonSize,
                                    height: playButtonSize,
                                    background: playButtonBackground,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: playIconSize,
                                    marginBottom: playButtonMargin,
                                    cursor: 'pointer',
                                    transition: 'transform 0.3s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(' + playButtonHoverScale + ')'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >{playIcon}</div>
                                <h1 style={{
                                    fontSize: titleSize,
                                    fontWeight: titleWeight,
                                    marginBottom: '16px',
                                    color: titleColor
                                }}>{title}</h1>
                                <p style={{
                                    fontSize: subtitleSize,
                                    opacity: subtitleOpacity,
                                    color: titleColor
                                }}>{subtitle}</p>
                            </div>
                        </div>
                    );
                }
            `,
            props: {
                // Content Section
                title: { type: 'string', default: 'Experience Innovation', section: 'Content' },
                subtitle: { type: 'string', default: 'Watch our story unfold', section: 'Content' },
                playIcon: { type: 'string', default: '▶️', section: 'Content' },
                
                // Background Section
                backgroundType: { type: 'select', options: ['solid', 'gradient'], default: 'gradient', section: 'Background' },
                backgroundColor: { type: 'color', default: '#667eea', section: 'Background' },
                gradientStartColor: { type: 'color', default: '#667eea', section: 'Background' },
                gradientEndColor: { type: 'color', default: '#764ba2', section: 'Background' },
                gradientDirection: { type: 'select', options: ['0deg', '45deg', '90deg', '135deg', '180deg', '225deg', '270deg', '315deg'], default: '135deg', section: 'Background' },
                
                // Overlay Section
                overlayOpacity: { type: 'select', options: ['0.0', '0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8'], default: '0.4', section: 'Overlay' },
                overlayColor: { type: 'color', default: '#000000', section: 'Overlay' },
                
                // Typography Section
                titleSize: { type: 'select', options: ['32px', '38px', '42px', '48px', '56px'], default: '42px', section: 'Typography' },
                titleWeight: { type: 'select', options: ['400', '500', '600', '700', '800'], default: '700', section: 'Typography' },
                titleColor: { type: 'color', default: '#ffffff', section: 'Typography' },
                subtitleSize: { type: 'select', options: ['14px', '16px', '18px', '20px', '24px'], default: '18px', section: 'Typography' },
                subtitleOpacity: { type: 'select', options: ['0.6', '0.7', '0.8', '0.9', '1.0'], default: '0.9', section: 'Typography' },
                
                // Layout Section
                containerHeight: { type: 'select', options: ['300px', '350px', '400px', '450px', '500px'], default: '400px', section: 'Layout' },
                borderRadius: { type: 'select', options: ['0px', '8px', '12px', '16px', '20px', '24px'], default: '16px', section: 'Layout' },
                contentPadding: { type: 'select', options: ['20px', '30px', '40px', '50px', '60px'], default: '40px', section: 'Layout' },
                textAlignment: { type: 'select', options: ['left', 'center', 'right'], default: 'center', section: 'Layout' },
                
                // Play Button Section
                playButtonSize: { type: 'select', options: ['60px', '70px', '80px', '90px', '100px'], default: '80px', section: 'Play Button' },
                playButtonBackground: { type: 'string', default: 'rgba(255, 255, 255, 0.2)', section: 'Play Button' },
                playButtonMargin: { type: 'select', options: ['16px', '20px', '24px', '32px', '40px'], default: '24px', section: 'Play Button' },
                playIconSize: { type: 'select', options: ['24px', '28px', '32px', '36px', '40px'], default: '32px', section: 'Play Button' },
                playButtonHoverScale: { type: 'select', options: ['1.0', '1.05', '1.1', '1.15', '1.2'], default: '1.1', section: 'Play Button' }
            }
        },
        {
            id: 'header-animated-text',
            name: 'Animated Text Hero',
            category: 'headers',
            description: 'Hero with animated text effect',
            code: `
                function AnimatedTextHero({ 
                    // Content Section
                    prefix = "We build",
                    words = "websites,apps,experiences",
                    description = "Crafting digital solutions that matter",
                    
                    // Background Section
                    backgroundType = "solid",
                    backgroundColor = "#ffffff",
                    gradientStartColor = "#ffffff",
                    gradientEndColor = "#f9fafb",
                    gradientDirection = "135deg",
                    
                    // Typography Section
                    prefixSize = "56px",
                    prefixWeight = "700",
                    prefixColor = "#1a1a1a",
                    animatedColor = "#06b6d4",
                    descriptionSize = "20px",
                    descriptionColor = "#666666",
                    
                    // Animation Section
                    animationSpeed = "2000",
                    animationType = "fadeInUp",
                    animationDuration = "0.5s",
                    
                    // Layout Section
                    containerPadding = "80px 40px",
                    textAlignment = "center",
                    borderRadius = "0px",
                    descriptionMarginTop = "24px",
                    lineBreak = "true"
                }) {
                    const [currentWord, setCurrentWord] = React.useState(0);
                    const wordList = words.split(',');
                    
                    React.useEffect(() => {
                        const interval = setInterval(() => {
                            setCurrentWord((prev) => (prev + 1) % wordList.length);
                        }, parseInt(animationSpeed));
                        return () => clearInterval(interval);
                    }, [animationSpeed]);
                    
                    const backgroundStyle = backgroundType === 'gradient' 
                        ? 'linear-gradient(' + gradientDirection + ', ' + gradientStartColor + ' 0%, ' + gradientEndColor + ' 100%)'
                        : backgroundColor;
                    
                    return (
                        <div style={{
                            textAlign: textAlignment,
                            padding: containerPadding,
                            background: backgroundStyle,
                            borderRadius: borderRadius
                        }}>
                            <h1 style={{
                                fontSize: prefixSize,
                                fontWeight: prefixWeight,
                                color: prefixColor
                            }}>
                                {prefix} {lineBreak === 'true' ? <br/> : ' '}
                                <span style={{
                                    color: animatedColor,
                                    display: 'inline-block',
                                    animation: animationType + ' ' + animationDuration + ' ease-out'
                                }}>{wordList[currentWord]}</span>
                            </h1>
                            <p style={{
                                fontSize: descriptionSize,
                                color: descriptionColor,
                                marginTop: descriptionMarginTop
                            }}>{description}</p>
                        </div>
                    );
                }
            `,
            props: {
                // Content Section
                prefix: { type: 'string', default: 'We build', section: 'Content' },
                words: { type: 'string', default: 'websites,apps,experiences', section: 'Content' },
                description: { type: 'text', default: 'Crafting digital solutions that matter', section: 'Content' },
                
                // Background Section
                backgroundType: { type: 'select', options: ['solid', 'gradient'], default: 'solid', section: 'Background' },
                backgroundColor: { type: 'color', default: '#ffffff', section: 'Background' },
                gradientStartColor: { type: 'color', default: '#ffffff', section: 'Background' },
                gradientEndColor: { type: 'color', default: '#f9fafb', section: 'Background' },
                gradientDirection: { type: 'select', options: ['0deg', '45deg', '90deg', '135deg', '180deg', '225deg', '270deg', '315deg'], default: '135deg', section: 'Background' },
                
                // Typography Section
                prefixSize: { type: 'select', options: ['40px', '48px', '56px', '64px', '72px'], default: '56px', section: 'Typography' },
                prefixWeight: { type: 'select', options: ['400', '500', '600', '700', '800'], default: '700', section: 'Typography' },
                prefixColor: { type: 'color', default: '#1a1a1a', section: 'Typography' },
                animatedColor: { type: 'color', default: '#06b6d4', section: 'Typography' },
                descriptionSize: { type: 'select', options: ['16px', '18px', '20px', '22px', '24px'], default: '20px', section: 'Typography' },
                descriptionColor: { type: 'color', default: '#666666', section: 'Typography' },
                
                // Animation Section
                animationSpeed: { type: 'select', options: ['1000', '1500', '2000', '2500', '3000'], default: '2000', section: 'Animation' },
                animationType: { type: 'select', options: ['fadeInUp', 'fadeIn', 'slideInUp', 'bounceIn', 'zoomIn'], default: 'fadeInUp', section: 'Animation' },
                animationDuration: { type: 'select', options: ['0.3s', '0.5s', '0.7s', '1s', '1.5s'], default: '0.5s', section: 'Animation' },
                
                // Layout Section
                containerPadding: { type: 'select', options: ['60px 30px', '70px 35px', '80px 40px', '100px 50px', '120px 60px'], default: '80px 40px', section: 'Layout' },
                textAlignment: { type: 'select', options: ['left', 'center', 'right'], default: 'center', section: 'Layout' },
                borderRadius: { type: 'select', options: ['0px', '8px', '12px', '16px', '20px', '24px'], default: '0px', section: 'Layout' },
                descriptionMarginTop: { type: 'select', options: ['16px', '20px', '24px', '32px', '40px'], default: '24px', section: 'Layout' },
                lineBreak: { type: 'select', options: ['true', 'false'], default: 'true', section: 'Layout' }
            }
        },
        {
            id: 'header-cta-hero',
            name: 'CTA Hero',
            category: 'headers',
            description: 'Hero with email capture form',
            code: `
                function CTAHero({ 
                    // Content Section
                    title = "Join 10,000+ developers",
                    subtitle = "Get weekly tips and resources",
                    buttonText = "Subscribe",
                    inputPlaceholder = "Enter your email",
                    
                    // Background Section
                    backgroundType = "gradient",
                    backgroundColor = "#fef3c7",
                    gradientStartColor = "#fef3c7",
                    gradientEndColor = "#fde68a",
                    gradientDirection = "135deg",
                    
                    // Typography Section
                    titleSize = "36px",
                    titleWeight = "700",
                    titleColor = "#1a1a1a",
                    subtitleSize = "18px",
                    subtitleColor = "#666666",
                    
                    // Layout Section
                    containerPadding = "60px 40px",
                    borderRadius = "16px",
                    textAlignment = "center",
                    formMaxWidth = "400px",
                    formGap = "12px",
                    titleMarginBottom = "12px",
                    subtitleMarginBottom = "32px",
                    
                    // Input Section
                    inputPadding = "12px 16px",
                    inputBorderColor = "#e5e5e5",
                    inputBorderRadius = "8px",
                    inputFontSize = "16px",
                    inputBorderWidth = "2px",
                    
                    // Button Section
                    buttonBackground = "#10b981",
                    buttonColor = "#ffffff",
                    buttonPadding = "12px 24px",
                    buttonBorderRadius = "8px",
                    buttonFontSize = "16px",
                    buttonFontWeight = "600"
                }) {
                    const [email, setEmail] = React.useState('');
                    
                    const backgroundStyle = backgroundType === 'gradient' 
                        ? 'linear-gradient(' + gradientDirection + ', ' + gradientStartColor + ' 0%, ' + gradientEndColor + ' 100%)'
                        : backgroundColor;
                    
                    return (
                        <div style={{
                            padding: containerPadding,
                            background: backgroundStyle,
                            borderRadius: borderRadius,
                            textAlign: textAlignment
                        }}>
                            <h2 style={{
                                fontSize: titleSize,
                                fontWeight: titleWeight,
                                color: titleColor,
                                marginBottom: titleMarginBottom
                            }}>{title}</h2>
                            <p style={{
                                fontSize: subtitleSize,
                                color: subtitleColor,
                                marginBottom: subtitleMarginBottom
                            }}>{subtitle}</p>
                            
                            <div style={{
                                display: 'flex',
                                gap: formGap,
                                maxWidth: formMaxWidth,
                                margin: '0 auto'
                            }}>
                                <input
                                    type="email"
                                    placeholder={inputPlaceholder}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: inputPadding,
                                        border: inputBorderWidth + ' solid ' + inputBorderColor,
                                        borderRadius: inputBorderRadius,
                                        fontSize: inputFontSize
                                    }}
                                />
                                <button style={{
                                    padding: buttonPadding,
                                    background: buttonBackground,
                                    color: buttonColor,
                                    border: 'none',
                                    borderRadius: buttonBorderRadius,
                                    fontSize: buttonFontSize,
                                    fontWeight: buttonFontWeight,
                                    cursor: 'pointer'
                                }}>{buttonText}</button>
                            </div>
                        </div>
                    );
                }
            `,
            props: {
                // Content Section
                title: { type: 'string', default: 'Join 10,000+ developers', section: 'Content' },
                subtitle: { type: 'string', default: 'Get weekly tips and resources', section: 'Content' },
                buttonText: { type: 'string', default: 'Subscribe', section: 'Content' },
                inputPlaceholder: { type: 'string', default: 'Enter your email', section: 'Content' },
                
                // Background Section
                backgroundType: { type: 'select', options: ['solid', 'gradient'], default: 'gradient', section: 'Background' },
                backgroundColor: { type: 'color', default: '#fef3c7', section: 'Background' },
                gradientStartColor: { type: 'color', default: '#fef3c7', section: 'Background' },
                gradientEndColor: { type: 'color', default: '#fde68a', section: 'Background' },
                gradientDirection: { type: 'select', options: ['0deg', '45deg', '90deg', '135deg', '180deg', '225deg', '270deg', '315deg'], default: '135deg', section: 'Background' },
                
                // Typography Section
                titleSize: { type: 'select', options: ['28px', '32px', '36px', '40px', '48px'], default: '36px', section: 'Typography' },
                titleWeight: { type: 'select', options: ['400', '500', '600', '700', '800'], default: '700', section: 'Typography' },
                titleColor: { type: 'color', default: '#1a1a1a', section: 'Typography' },
                subtitleSize: { type: 'select', options: ['14px', '16px', '18px', '20px', '22px'], default: '18px', section: 'Typography' },
                subtitleColor: { type: 'color', default: '#666666', section: 'Typography' },
                
                // Layout Section
                containerPadding: { type: 'select', options: ['40px 30px', '50px 35px', '60px 40px', '80px 60px', '100px 80px'], default: '60px 40px', section: 'Layout' },
                borderRadius: { type: 'select', options: ['0px', '8px', '12px', '16px', '20px', '24px'], default: '16px', section: 'Layout' },
                textAlignment: { type: 'select', options: ['left', 'center', 'right'], default: 'center', section: 'Layout' },
                formMaxWidth: { type: 'select', options: ['300px', '350px', '400px', '450px', '500px'], default: '400px', section: 'Layout' },
                formGap: { type: 'select', options: ['8px', '10px', '12px', '16px', '20px'], default: '12px', section: 'Layout' },
                titleMarginBottom: { type: 'select', options: ['8px', '10px', '12px', '16px', '20px'], default: '12px', section: 'Layout' },
                subtitleMarginBottom: { type: 'select', options: ['20px', '24px', '28px', '32px', '40px'], default: '32px', section: 'Layout' },
                
                // Input Section
                inputPadding: { type: 'select', options: ['8px 12px', '10px 14px', '12px 16px', '14px 18px', '16px 20px'], default: '12px 16px', section: 'Input' },
                inputBorderColor: { type: 'color', default: '#e5e5e5', section: 'Input' },
                inputBorderRadius: { type: 'select', options: ['4px', '6px', '8px', '12px', '16px'], default: '8px', section: 'Input' },
                inputFontSize: { type: 'select', options: ['14px', '15px', '16px', '17px', '18px'], default: '16px', section: 'Input' },
                inputBorderWidth: { type: 'select', options: ['1px', '2px', '3px'], default: '2px', section: 'Input' },
                
                // Button Section
                buttonBackground: { type: 'color', default: '#10b981', section: 'Button' },
                buttonColor: { type: 'color', default: '#ffffff', section: 'Button' },
                buttonPadding: { type: 'select', options: ['8px 16px', '10px 20px', '12px 24px', '14px 28px', '16px 32px'], default: '12px 24px', section: 'Button' },
                buttonBorderRadius: { type: 'select', options: ['4px', '6px', '8px', '12px', '16px'], default: '8px', section: 'Button' },
                buttonFontSize: { type: 'select', options: ['14px', '15px', '16px', '17px', '18px'], default: '16px', section: 'Button' },
                buttonFontWeight: { type: 'select', options: ['400', '500', '600', '700'], default: '600', section: 'Button' }
            }
        }
    ],
    heroes: [
        {
            id: 'hero-gradient',
            name: 'Gradient Hero',
            category: 'heroes',
            description: 'Hero section with gradient background',
            code: `
                function GradientHero({ 
                    // Content Properties
                    title = "Build Something Amazing", 
                    subtitle = "Create beautiful React components with our visual studio",
                    buttonText = "Get Started",
                    
                    // Gradient Properties
                    gradientStartColor = "#667eea",
                    gradientEndColor = "#764ba2", 
                    gradientDirection = "135deg",
                    
                    // Typography Properties
                    titleSize = "48px",
                    titleWeight = "700",
                    subtitleSize = "18px",
                    
                    // Spacing Properties
                    paddingVertical = "80px",
                    paddingHorizontal = "40px",
                    titleMarginBottom = "16px",
                    subtitleMarginBottom = "32px",
                    
                    // Layout Properties
                    textAlign = "center",
                    borderRadius = "16px",
                    subtitleMaxWidth = "600px",
                    
                    // Button Properties
                    buttonBackground = "white",
                    buttonColor = "#764ba2",
                    buttonPadding = "14px 32px",
                    buttonBorderRadius = "8px",
                    buttonFontSize = "16px",
                    buttonFontWeight = "600"
                }) {
                    return (
                        <div style={{
                            padding: \`\${paddingVertical} \${paddingHorizontal}\`,
                            background: 'linear-gradient(' + gradientDirection + ', ' + gradientStartColor + ' 0%, ' + gradientEndColor + ' 100%)',
                            borderRadius: borderRadius,
                            textAlign: textAlign,
                            color: 'white'
                        }}>
                            <h1 style={{
                                fontSize: titleSize,
                                fontWeight: titleWeight,
                                marginBottom: titleMarginBottom,
                                lineHeight: '1.2'
                            }}>{title}</h1>
                            <p style={{
                                fontSize: subtitleSize,
                                opacity: '0.9',
                                maxWidth: subtitleMaxWidth,
                                margin: '0 auto ' + subtitleMarginBottom
                            }}>{subtitle}</p>
                            <button style={{
                                padding: buttonPadding,
                                background: buttonBackground,
                                color: buttonColor,
                                border: 'none',
                                borderRadius: buttonBorderRadius,
                                fontSize: buttonFontSize,
                                fontWeight: buttonFontWeight,
                                cursor: 'pointer'
                            }}>
                                {buttonText}
                            </button>
                        </div>
                    );
                }
            `,
            props: {
                // Content Section
                title: { type: 'string', default: 'Build Something Amazing', section: 'Content' },
                subtitle: { type: 'text', default: 'Create beautiful React components with our visual studio', section: 'Content' },
                buttonText: { type: 'string', default: 'Get Started', section: 'Content' },
                
                // Gradient Section
                gradientStartColor: { type: 'color', default: '#667eea', section: 'Gradient' },
                gradientEndColor: { type: 'color', default: '#764ba2', section: 'Gradient' },
                gradientDirection: { 
                    type: 'select', 
                    options: ['135deg', '90deg', '45deg', '0deg', '180deg', '225deg', '270deg', '315deg'], 
                    default: '135deg',
                    section: 'Gradient'
                },
                
                // Typography Section
                titleSize: { 
                    type: 'select', 
                    options: ['32px', '40px', '48px', '56px', '64px'], 
                    default: '48px',
                    section: 'Typography'
                },
                titleWeight: { 
                    type: 'select', 
                    options: ['400', '500', '600', '700', '800'], 
                    default: '700',
                    section: 'Typography'
                },
                subtitleSize: { 
                    type: 'select', 
                    options: ['14px', '16px', '18px', '20px', '24px'], 
                    default: '18px',
                    section: 'Typography'
                },
                
                // Spacing Section
                paddingVertical: { 
                    type: 'select', 
                    options: ['40px', '60px', '80px', '100px', '120px'], 
                    default: '80px',
                    section: 'Spacing'
                },
                paddingHorizontal: { 
                    type: 'select', 
                    options: ['20px', '40px', '60px', '80px'], 
                    default: '40px',
                    section: 'Spacing'
                },
                titleMarginBottom: { 
                    type: 'select', 
                    options: ['8px', '12px', '16px', '20px', '24px'], 
                    default: '16px',
                    section: 'Spacing'
                },
                subtitleMarginBottom: { 
                    type: 'select', 
                    options: ['16px', '24px', '32px', '40px'], 
                    default: '32px',
                    section: 'Spacing'
                },
                
                // Layout Section
                textAlign: { 
                    type: 'select', 
                    options: ['left', 'center', 'right'], 
                    default: 'center',
                    section: 'Layout'
                },
                borderRadius: { 
                    type: 'select', 
                    options: ['0px', '8px', '12px', '16px', '20px', '24px'], 
                    default: '16px',
                    section: 'Layout'
                },
                subtitleMaxWidth: { 
                    type: 'select', 
                    options: ['400px', '500px', '600px', '700px', '800px', '100%'], 
                    default: '600px',
                    section: 'Layout'
                },
                
                // Button Section
                buttonBackground: { type: 'color', default: '#ffffff', section: 'Button' },
                buttonColor: { type: 'color', default: '#764ba2', section: 'Button' },
                buttonPadding: { 
                    type: 'select', 
                    options: ['8px 16px', '10px 20px', '12px 24px', '14px 32px', '16px 40px'], 
                    default: '14px 32px',
                    section: 'Button'
                },
                buttonBorderRadius: { 
                    type: 'select', 
                    options: ['4px', '6px', '8px', '12px', '16px', '999px'], 
                    default: '8px',
                    section: 'Button'
                },
                buttonFontSize: { 
                    type: 'select', 
                    options: ['14px', '16px', '18px', '20px'], 
                    default: '16px',
                    section: 'Button'
                },
                buttonFontWeight: { 
                    type: 'select', 
                    options: ['400', '500', '600', '700'], 
                    default: '600',
                    section: 'Button'
                }
            }
        }
    ],
    
    // Data Display Category
    dataDisplay: [
        {
            id: 'data-table',
            name: 'Data Table',
            category: 'dataDisplay',
            description: 'Professional data table with sorting, pagination, and customization options',
            code: `
                function DataTable({ 
                    // Content Section
                    title = "Data Table",
                    showTitle = "true",
                    showSearch = "true",
                    showPagination = "true",
                    searchPlaceholder = "Search...",
                    noDataMessage = "No data available",
                    
                    // Table Data
                    column1Header = "Name",
                    column2Header = "Role", 
                    column3Header = "Status",
                    column4Header = "Actions",
                    showColumn4 = "true",
                    
                    row1Col1 = "John Doe",
                    row1Col2 = "Developer",
                    row1Col3 = "Active",
                    row2Col1 = "Jane Smith",
                    row2Col2 = "Designer",
                    row2Col3 = "Active",
                    row3Col1 = "Bob Wilson",
                    row3Col2 = "Manager",
                    row3Col3 = "Inactive",
                    
                    // Colors Section
                    backgroundColor = "#ffffff",
                    headerBackgroundColor = "#f8fafc",
                    borderColor = "#e2e8f0",
                    textColor = "#1a202c",
                    headerTextColor = "#2d3748",
                    hoverBackgroundColor = "#f7fafc",
                    searchBackgroundColor = "#ffffff",
                    paginationColor = "#4a5568",
                    activePageColor = "#667eea",
                    
                    // Typography Section
                    titleFontSize = "24px",
                    titleFontWeight = "700",
                    headerFontSize = "14px",
                    headerFontWeight = "600",
                    bodyFontSize = "14px",
                    bodyFontWeight = "400",
                    searchFontSize = "14px",
                    paginationFontSize = "14px",
                    
                    // Dimensions Section
                    tableWidth = "100%",
                    tableMaxWidth = "1200px",
                    cellPadding = "12px",
                    headerHeight = "48px",
                    rowHeight = "56px",
                    searchWidth = "300px",
                    searchHeight = "40px",
                    
                    // Spacing Section
                    titleMarginBottom = "16px",
                    searchMarginBottom = "16px",
                    tableMarginBottom = "16px",
                    paginationMarginTop = "16px",
                    columnSpacing = "16px",
                    
                    // Border Section
                    borderRadius = "8px",
                    borderWidth = "1px",
                    borderStyle = "solid",
                    cellBorderWidth = "1px",
                    cellBorderColor = "#e2e8f0",
                    cellBorderStyle = "solid",
                    
                    // Shadow Section
                    showShadow = "true",
                    shadowBlur = "10px",
                    shadowOpacity = "0.05",
                    shadowColor = "#000000",
                    
                    // Actions Section
                    actionButtonColor = "#667eea",
                    actionButtonHoverColor = "#5a67d8",
                    actionButtonSize = "32px",
                    actionButtonSpacing = "8px",
                    
                    // Pagination Section
                    itemsPerPage = "3",
                    showPageNumbers = "true",
                    showPrevNext = "true",
                    maxPageButtons = "5",
                    
                    // Visibility Section
                    showHeaderBorder = "true",
                    showRowBorders = "true",
                    showHoverEffect = "true",
                    allowSorting = "true"
                }) {
                    const [searchTerm, setSearchTerm] = React.useState('');
                    const [currentPage, setCurrentPage] = React.useState(1);
                    const [sortConfig, setSortConfig] = React.useState({ key: null, direction: 'asc' });
                    
                    const data = [
                        { id: 1, col1: row1Col1, col2: row1Col2, col3: row1Col3 },
                        { id: 2, col1: row2Col1, col2: row2Col2, col3: row2Col3 },
                        { id: 3, col1: row3Col1, col2: row3Col2, col3: row3Col3 }
                    ];
                    
                    const filteredData = data.filter(item => 
                        Object.values(item).some(value => 
                            value.toString().toLowerCase().includes(searchTerm.toLowerCase())
                        )
                    );
                    
                    const sortedData = React.useMemo(() => {
                        if (!sortConfig.key) return filteredData;
                        
                        return [...filteredData].sort((a, b) => {
                            const aVal = a[sortConfig.key];
                            const bVal = b[sortConfig.key];
                            
                            if (sortConfig.direction === 'asc') {
                                return aVal.localeCompare(bVal);
                            }
                            return bVal.localeCompare(aVal);
                        });
                    }, [filteredData, sortConfig]);
                    
                    const totalPages = Math.ceil(sortedData.length / parseInt(itemsPerPage));
                    const startIndex = (currentPage - 1) * parseInt(itemsPerPage);
                    const paginatedData = sortedData.slice(startIndex, startIndex + parseInt(itemsPerPage));
                    
                    const handleSort = (column) => {
                        if (allowSorting !== "true") return;
                        
                        setSortConfig(prevConfig => ({
                            key: column,
                            direction: prevConfig.key === column && prevConfig.direction === 'asc' ? 'desc' : 'asc'
                        }));
                    };
                    
                    const shadowStyle = showShadow === 'true' ? 
                        '0 4px ' + shadowBlur + ' rgba(' + 
                        parseInt(shadowColor.slice(1, 3), 16) + ', ' + 
                        parseInt(shadowColor.slice(3, 5), 16) + ', ' + 
                        parseInt(shadowColor.slice(5, 7), 16) + ', ' + shadowOpacity + ')' : 'none';
                    
                    return (
                        <div style={{
                            width: tableWidth,
                            maxWidth: tableMaxWidth,
                            margin: '0 auto',
                            fontFamily: 'Inter, sans-serif'
                        }}>
                            {showTitle === "true" && (
                                <h2 style={{
                                    fontSize: titleFontSize,
                                    fontWeight: titleFontWeight,
                                    color: textColor,
                                    marginBottom: titleMarginBottom,
                                    margin: 0
                                }}>
                                    {title}
                                </h2>
                            )}
                            
                            {showSearch === "true" && (
                                <div style={{
                                    marginBottom: searchMarginBottom,
                                    display: 'flex',
                                    justifyContent: 'flex-end'
                                }}>
                                    <input
                                        type="text"
                                        placeholder={searchPlaceholder}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            width: searchWidth,
                                            height: searchHeight,
                                            padding: '8px 12px',
                                            border: '1px solid ' + borderColor,
                                            borderRadius: '6px',
                                            backgroundColor: searchBackgroundColor,
                                            fontSize: searchFontSize,
                                            color: textColor,
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            )}
                            
                            <div style={{
                                backgroundColor: backgroundColor,
                                borderRadius: borderRadius,
                                border: borderWidth + ' ' + borderStyle + ' ' + borderColor,
                                boxShadow: shadowStyle,
                                overflow: 'hidden',
                                marginBottom: tableMarginBottom
                            }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse'
                                }}>
                                    <thead style={{
                                        backgroundColor: headerBackgroundColor,
                                        borderBottom: showHeaderBorder === "true" ? cellBorderWidth + ' ' + cellBorderStyle + ' ' + cellBorderColor : 'none'
                                    }}>
                                        <tr style={{ height: headerHeight }}>
                                            <th 
                                                style={{
                                                    padding: cellPadding,
                                                    textAlign: 'left',
                                                    fontSize: headerFontSize,
                                                    fontWeight: headerFontWeight,
                                                    color: headerTextColor,
                                                    cursor: allowSorting === "true" ? 'pointer' : 'default',
                                                    userSelect: 'none'
                                                }}
                                                onClick={() => handleSort('col1')}
                                            >
                                                {column1Header}
                                                {sortConfig.key === 'col1' && (
                                                    <span style={{ marginLeft: '4px' }}>
                                                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                    </span>
                                                )}
                                            </th>
                                            <th 
                                                style={{
                                                    padding: cellPadding,
                                                    textAlign: 'left',
                                                    fontSize: headerFontSize,
                                                    fontWeight: headerFontWeight,
                                                    color: headerTextColor,
                                                    cursor: allowSorting === "true" ? 'pointer' : 'default',
                                                    userSelect: 'none'
                                                }}
                                                onClick={() => handleSort('col2')}
                                            >
                                                {column2Header}
                                                {sortConfig.key === 'col2' && (
                                                    <span style={{ marginLeft: '4px' }}>
                                                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                    </span>
                                                )}
                                            </th>
                                            <th 
                                                style={{
                                                    padding: cellPadding,
                                                    textAlign: 'left',
                                                    fontSize: headerFontSize,
                                                    fontWeight: headerFontWeight,
                                                    color: headerTextColor,
                                                    cursor: allowSorting === "true" ? 'pointer' : 'default',
                                                    userSelect: 'none'
                                                }}
                                                onClick={() => handleSort('col3')}
                                            >
                                                {column3Header}
                                                {sortConfig.key === 'col3' && (
                                                    <span style={{ marginLeft: '4px' }}>
                                                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                    </span>
                                                )}
                                            </th>
                                            {showColumn4 === "true" && (
                                                <th style={{
                                                    padding: cellPadding,
                                                    textAlign: 'left',
                                                    fontSize: headerFontSize,
                                                    fontWeight: headerFontWeight,
                                                    color: headerTextColor
                                                }}>
                                                    {column4Header}
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.length === 0 ? (
                                            <tr>
                                                <td 
                                                    colSpan={showColumn4 === "true" ? "4" : "3"}
                                                    style={{
                                                        padding: '32px',
                                                        textAlign: 'center',
                                                        color: textColor,
                                                        fontSize: bodyFontSize
                                                    }}
                                                >
                                                    {noDataMessage}
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedData.map((row, index) => (
                                                <tr 
                                                    key={row.id}
                                                    style={{
                                                        height: rowHeight,
                                                        borderBottom: showRowBorders === "true" ? cellBorderWidth + ' ' + cellBorderStyle + ' ' + cellBorderColor : 'none',
                                                        cursor: showHoverEffect === "true" ? 'pointer' : 'default',
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (showHoverEffect === "true") {
                                                            e.currentTarget.style.backgroundColor = hoverBackgroundColor;
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (showHoverEffect === "true") {
                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                        }
                                                    }}
                                                >
                                                    <td style={{
                                                        padding: cellPadding,
                                                        fontSize: bodyFontSize,
                                                        fontWeight: bodyFontWeight,
                                                        color: textColor
                                                    }}>
                                                        {row.col1}
                                                    </td>
                                                    <td style={{
                                                        padding: cellPadding,
                                                        fontSize: bodyFontSize,
                                                        fontWeight: bodyFontWeight,
                                                        color: textColor
                                                    }}>
                                                        {row.col2}
                                                    </td>
                                                    <td style={{
                                                        padding: cellPadding,
                                                        fontSize: bodyFontSize,
                                                        fontWeight: bodyFontWeight,
                                                        color: textColor
                                                    }}>
                                                        <span style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            backgroundColor: row.col3 === 'Active' ? '#d4edda' : '#f8d7da',
                                                            color: row.col3 === 'Active' ? '#155724' : '#721c24',
                                                            fontSize: '12px',
                                                            fontWeight: '500'
                                                        }}>
                                                            {row.col3}
                                                        </span>
                                                    </td>
                                                    {showColumn4 === "true" && (
                                                        <td style={{
                                                            padding: cellPadding
                                                        }}>
                                                            <div style={{
                                                                display: 'flex',
                                                                gap: actionButtonSpacing
                                                            }}>
                                                                <button style={{
                                                                    width: actionButtonSize,
                                                                    height: actionButtonSize,
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: actionButtonColor,
                                                                    color: 'white',
                                                                    cursor: 'pointer',
                                                                    fontSize: '12px',
                                                                    transition: 'background-color 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.target.style.backgroundColor = actionButtonHoverColor;
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.target.style.backgroundColor = actionButtonColor;
                                                                }}>
                                                                    ✏️
                                                                </button>
                                                                <button style={{
                                                                    width: actionButtonSize,
                                                                    height: actionButtonSize,
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: '#ef4444',
                                                                    color: 'white',
                                                                    cursor: 'pointer',
                                                                    fontSize: '12px',
                                                                    transition: 'background-color 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.target.style.backgroundColor = '#dc2626';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.target.style.backgroundColor = '#ef4444';
                                                                }}>
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {showPagination === "true" && totalPages > 1 && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginTop: paginationMarginTop
                                }}>
                                    {showPrevNext === "true" && (
                                        <button 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            style={{
                                                padding: '8px 12px',
                                                border: '1px solid ' + borderColor,
                                                borderRadius: '4px',
                                                backgroundColor: currentPage === 1 ? '#f5f5f5' : backgroundColor,
                                                color: currentPage === 1 ? '#ccc' : paginationColor,
                                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                                fontSize: paginationFontSize
                                            }}
                                        >
                                            Previous
                                        </button>
                                    )}
                                    
                                    {showPageNumbers === "true" && (
                                        <>
                                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                .filter(page => {
                                                    const maxButtons = parseInt(maxPageButtons);
                                                    const start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                                                    const end = Math.min(totalPages, start + maxButtons - 1);
                                                    return page >= start && page <= end;
                                                })
                                                .map(page => (
                                                    <button 
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        style={{
                                                            padding: '8px 12px',
                                                            border: '1px solid ' + borderColor,
                                                            borderRadius: '4px',
                                                            backgroundColor: currentPage === page ? activePageColor : backgroundColor,
                                                            color: currentPage === page ? 'white' : paginationColor,
                                                            cursor: 'pointer',
                                                            fontSize: paginationFontSize,
                                                            fontWeight: currentPage === page ? '600' : '400'
                                                        }}
                                                    >
                                                        {page}
                                                    </button>
                                                ))
                                            }
                                        </>
                                    )}
                                    
                                    {showPrevNext === "true" && (
                                        <button 
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            style={{
                                                padding: '8px 12px',
                                                border: '1px solid ' + borderColor,
                                                borderRadius: '4px',
                                                backgroundColor: currentPage === totalPages ? '#f5f5f5' : backgroundColor,
                                                color: currentPage === totalPages ? '#ccc' : paginationColor,
                                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                                fontSize: paginationFontSize
                                            }}
                                        >
                                            Next
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                }
            `,
            properties: {
                // Content Section
                title: { type: 'text', default: 'Data Table', section: 'Content' },
                showTitle: { type: 'checkbox', default: true, section: 'Content' },
                showSearch: { type: 'checkbox', default: true, section: 'Content' },
                showPagination: { type: 'checkbox', default: true, section: 'Content' },
                searchPlaceholder: { type: 'text', default: 'Search...', section: 'Content' },
                noDataMessage: { type: 'text', default: 'No data available', section: 'Content' },
                column1Header: { type: 'text', default: 'Name', section: 'Content' },
                column2Header: { type: 'text', default: 'Role', section: 'Content' },
                column3Header: { type: 'text', default: 'Status', section: 'Content' },
                column4Header: { type: 'text', default: 'Actions', section: 'Content' },
                showColumn4: { type: 'checkbox', default: true, section: 'Content' },
                row1Col1: { type: 'text', default: 'John Doe', section: 'Content' },
                row1Col2: { type: 'text', default: 'Developer', section: 'Content' },
                row1Col3: { type: 'text', default: 'Active', section: 'Content' },
                row2Col1: { type: 'text', default: 'Jane Smith', section: 'Content' },
                row2Col2: { type: 'text', default: 'Designer', section: 'Content' },
                row2Col3: { type: 'text', default: 'Active', section: 'Content' },
                row3Col1: { type: 'text', default: 'Bob Wilson', section: 'Content' },
                row3Col2: { type: 'text', default: 'Manager', section: 'Content' },
                row3Col3: { type: 'text', default: 'Inactive', section: 'Content' },
                
                // Colors Section
                backgroundColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                headerBackgroundColor: { type: 'color', default: '#f8fafc', section: 'Colors' },
                borderColor: { type: 'color', default: '#e2e8f0', section: 'Colors' },
                textColor: { type: 'color', default: '#1a202c', section: 'Colors' },
                headerTextColor: { type: 'color', default: '#2d3748', section: 'Colors' },
                hoverBackgroundColor: { type: 'color', default: '#f7fafc', section: 'Colors' },
                searchBackgroundColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                paginationColor: { type: 'color', default: '#4a5568', section: 'Colors' },
                activePageColor: { type: 'color', default: '#667eea', section: 'Colors' },
                actionButtonColor: { type: 'color', default: '#667eea', section: 'Colors' },
                actionButtonHoverColor: { type: 'color', default: '#5a67d8', section: 'Colors' },
                
                // Typography Section
                titleFontSize: { type: 'select', options: ['18px', '20px', '24px', '28px', '32px'], default: '24px', section: 'Typography' },
                titleFontWeight: { type: 'select', options: ['400', '500', '600', '700', '800'], default: '700', section: 'Typography' },
                headerFontSize: { type: 'select', options: ['12px', '14px', '16px', '18px'], default: '14px', section: 'Typography' },
                headerFontWeight: { type: 'select', options: ['400', '500', '600', '700'], default: '600', section: 'Typography' },
                bodyFontSize: { type: 'select', options: ['12px', '14px', '16px', '18px'], default: '14px', section: 'Typography' },
                bodyFontWeight: { type: 'select', options: ['400', '500', '600'], default: '400', section: 'Typography' },
                searchFontSize: { type: 'select', options: ['12px', '14px', '16px'], default: '14px', section: 'Typography' },
                paginationFontSize: { type: 'select', options: ['12px', '14px', '16px'], default: '14px', section: 'Typography' },
                
                // Dimensions Section  
                tableWidth: { type: 'select', options: ['100%', '800px', '1000px', '1200px'], default: '100%', section: 'Dimensions' },
                tableMaxWidth: { type: 'select', options: ['800px', '1000px', '1200px', '1400px'], default: '1200px', section: 'Dimensions' },
                cellPadding: { type: 'select', options: ['8px', '12px', '16px', '20px'], default: '12px', section: 'Dimensions' },
                headerHeight: { type: 'select', options: ['40px', '48px', '56px', '64px'], default: '48px', section: 'Dimensions' },
                rowHeight: { type: 'select', options: ['48px', '56px', '64px', '72px'], default: '56px', section: 'Dimensions' },
                searchWidth: { type: 'select', options: ['200px', '250px', '300px', '350px'], default: '300px', section: 'Dimensions' },
                searchHeight: { type: 'select', options: ['32px', '36px', '40px', '44px'], default: '40px', section: 'Dimensions' },
                
                // Spacing Section
                titleMarginBottom: { type: 'select', options: ['8px', '12px', '16px', '20px', '24px'], default: '16px', section: 'Spacing' },
                searchMarginBottom: { type: 'select', options: ['8px', '12px', '16px', '20px'], default: '16px', section: 'Spacing' },
                tableMarginBottom: { type: 'select', options: ['8px', '12px', '16px', '20px'], default: '16px', section: 'Spacing' },
                paginationMarginTop: { type: 'select', options: ['8px', '12px', '16px', '20px'], default: '16px', section: 'Spacing' },
                columnSpacing: { type: 'select', options: ['8px', '12px', '16px', '20px', '24px'], default: '16px', section: 'Spacing' },
                
                // Border Section
                borderRadius: { type: 'select', options: ['0px', '4px', '6px', '8px', '12px'], default: '8px', section: 'Border' },
                borderWidth: { type: 'select', options: ['0px', '1px', '2px'], default: '1px', section: 'Border' },
                borderStyle: { type: 'select', options: ['solid', 'dashed', 'dotted'], default: 'solid', section: 'Border' },
                cellBorderWidth: { type: 'select', options: ['0px', '1px', '2px'], default: '1px', section: 'Border' },
                cellBorderColor: { type: 'color', default: '#e2e8f0', section: 'Border' },
                cellBorderStyle: { type: 'select', options: ['solid', 'dashed', 'dotted'], default: 'solid', section: 'Border' },
                
                // Shadow Section
                showShadow: { type: 'checkbox', default: true, section: 'Shadow' },
                shadowBlur: { type: 'select', options: ['4px', '8px', '10px', '15px', '20px'], default: '10px', section: 'Shadow' },
                shadowOpacity: { type: 'select', options: ['0.05', '0.1', '0.15', '0.2'], default: '0.05', section: 'Shadow' },
                shadowColor: { type: 'color', default: '#000000', section: 'Shadow' },
                
                // Actions Section
                actionButtonSize: { type: 'select', options: ['24px', '28px', '32px', '36px'], default: '32px', section: 'Actions' },
                actionButtonSpacing: { type: 'select', options: ['4px', '6px', '8px', '12px'], default: '8px', section: 'Actions' },
                
                // Pagination Section
                itemsPerPage: { type: 'select', options: ['2', '3', '5', '10', '20'], default: '3', section: 'Pagination' },
                showPageNumbers: { type: 'checkbox', default: true, section: 'Pagination' },
                showPrevNext: { type: 'checkbox', default: true, section: 'Pagination' },
                maxPageButtons: { type: 'select', options: ['3', '5', '7', '10'], default: '5', section: 'Pagination' },
                
                // Visibility Section
                showHeaderBorder: { type: 'checkbox', default: true, section: 'Visibility' },
                showRowBorders: { type: 'checkbox', default: true, section: 'Visibility' },
                showHoverEffect: { type: 'checkbox', default: true, section: 'Visibility' },
                allowSorting: { type: 'checkbox', default: true, section: 'Visibility' }
            }
        }
    ],
    
    // Feedback Category
    feedback: [
        {
            id: 'alert-banner',
            name: 'Alert Banner',
            category: 'feedback',
            description: 'Customizable alert banner for notifications, warnings, and messages',
            code: `
                function AlertBanner({ 
                    // Content Section
                    message = "This is an important alert message",
                    title = "Alert",
                    showTitle = "true",
                    showIcon = "true",
                    showCloseButton = "true",
                    actionText = "Learn More",
                    showAction = "false",
                    
                    // Alert Type
                    type = "info",
                    customIcon = "",
                    
                    // Colors Section
                    backgroundColor = "#dbeafe",
                    textColor = "#1e40af",
                    titleColor = "#1e3a8a",
                    borderColor = "#93c5fd",
                    iconColor = "#3b82f6",
                    closeButtonColor = "#6b7280",
                    closeButtonHoverColor = "#374151",
                    actionButtonColor = "#3b82f6",
                    actionButtonHoverColor = "#2563eb",
                    actionButtonTextColor = "#ffffff",
                    
                    // Typography Section
                    titleFontSize = "16px",
                    titleFontWeight = "600",
                    messageFontSize = "14px",
                    messageFontWeight = "400",
                    actionFontSize = "14px",
                    actionFontWeight = "500",
                    
                    // Dimensions Section
                    width = "100%",
                    maxWidth = "800px",
                    minHeight = "60px",
                    padding = "16px",
                    iconSize = "20px",
                    closeButtonSize = "24px",
                    
                    // Spacing Section
                    titleMarginBottom = "4px",
                    iconMarginRight = "12px",
                    actionMarginLeft = "16px",
                    itemSpacing = "8px",
                    
                    // Border Section
                    borderRadius = "8px",
                    borderWidth = "1px",
                    borderStyle = "solid",
                    borderPosition = "all",
                    
                    // Layout Section
                    alignment = "left",
                    verticalAlignment = "center",
                    fullWidth = "false",
                    position = "static",
                    
                    // Animation Section
                    showAnimation = "true",
                    animationType = "slideDown",
                    animationDuration = "0.3s",
                    
                    // Shadow Section
                    showShadow = "false",
                    shadowBlur = "10px",
                    shadowOpacity = "0.1",
                    shadowColor = "#000000",
                    
                    // Behavior Section
                    dismissible = "true",
                    autoHide = "false",
                    autoHideDelay = "5000",
                    
                    // Visibility Section
                    showBorder = "true",
                    sticky = "false",
                    zIndex = "1000"
                }) {
                    const [isVisible, setIsVisible] = React.useState(true);
                    const [isAnimating, setIsAnimating] = React.useState(false);
                    
                    React.useEffect(() => {
                        if (showAnimation === "true") {
                            setIsAnimating(true);
                            const timer = setTimeout(() => setIsAnimating(false), parseFloat(animationDuration) * 1000);
                            return () => clearTimeout(timer);
                        }
                    }, []);
                    
                    React.useEffect(() => {
                        if (autoHide === "true" && isVisible) {
                            const timer = setTimeout(() => {
                                handleClose();
                            }, parseInt(autoHideDelay));
                            return () => clearTimeout(timer);
                        }
                    }, [isVisible, autoHide, autoHideDelay]);
                    
                    const handleClose = () => {
                        setIsVisible(false);
                    };
                    
                    const handleAction = () => {
                        console.log('Alert action clicked');
                    };
                    
                    if (!isVisible) return null;
                    
                    // Type-specific styling
                    const getTypeStyles = () => {
                        switch (type) {
                            case 'success':
                                return {
                                    bg: '#d1fae5',
                                    text: '#065f46',
                                    title: '#064e3b',
                                    border: '#86efac',
                                    icon: '#10b981',
                                    iconSymbol: '✓'
                                };
                            case 'warning':
                                return {
                                    bg: '#fef3c7',
                                    text: '#92400e',
                                    title: '#78350f',
                                    border: '#fcd34d',
                                    icon: '#f59e0b',
                                    iconSymbol: '⚠'
                                };
                            case 'error':
                                return {
                                    bg: '#fee2e2',
                                    text: '#dc2626',
                                    title: '#b91c1c',
                                    border: '#fca5a5',
                                    icon: '#ef4444',
                                    iconSymbol: '✕'
                                };
                            default: // info
                                return {
                                    bg: '#dbeafe',
                                    text: '#1e40af',
                                    title: '#1e3a8a',
                                    border: '#93c5fd',
                                    icon: '#3b82f6',
                                    iconSymbol: 'ℹ'
                                };
                        }
                    };
                    
                    const typeStyles = getTypeStyles();
                    const finalBackgroundColor = backgroundColor === '#dbeafe' ? typeStyles.bg : backgroundColor;
                    const finalTextColor = textColor === '#1e40af' ? typeStyles.text : textColor;
                    const finalTitleColor = titleColor === '#1e3a8a' ? typeStyles.title : titleColor;
                    const finalBorderColor = borderColor === '#93c5fd' ? typeStyles.border : borderColor;
                    const finalIconColor = iconColor === '#3b82f6' ? typeStyles.icon : iconColor;
                    
                    const shadowStyle = showShadow === 'true' ? 
                        '0 4px ' + shadowBlur + ' rgba(' + 
                        parseInt(shadowColor.slice(1, 3), 16) + ', ' + 
                        parseInt(shadowColor.slice(3, 5), 16) + ', ' + 
                        parseInt(shadowColor.slice(5, 7), 16) + ', ' + shadowOpacity + ')' : 'none';
                    
                    const animationStyles = showAnimation === "true" ? {
                        slideDown: {
                            transform: isAnimating ? 'translateY(-20px)' : 'translateY(0)',
                            opacity: isAnimating ? '0' : '1'
                        },
                        fadeIn: {
                            opacity: isAnimating ? '0' : '1'
                        },
                        slideRight: {
                            transform: isAnimating ? 'translateX(-20px)' : 'translateX(0)',
                            opacity: isAnimating ? '0' : '1'
                        }
                    }[animationType] || {} : {};
                    
                    return (
                        <div style={{
                            width: fullWidth === "true" ? '100vw' : width,
                            maxWidth: fullWidth === "true" ? 'none' : maxWidth,
                            minHeight: minHeight,
                            backgroundColor: finalBackgroundColor,
                            color: finalTextColor,
                            border: showBorder === "true" ? borderWidth + ' ' + borderStyle + ' ' + finalBorderColor : 'none',
                            borderRadius: fullWidth === "true" ? '0' : borderRadius,
                            padding: padding,
                            display: 'flex',
                            alignItems: verticalAlignment === 'center' ? 'center' : verticalAlignment === 'top' ? 'flex-start' : 'flex-end',
                            justifyContent: 'space-between',
                            gap: itemSpacing,
                            boxShadow: shadowStyle,
                            position: sticky === "true" ? 'sticky' : position,
                            top: sticky === "true" ? '0' : 'auto',
                            zIndex: sticky === "true" ? zIndex : 'auto',
                            margin: fullWidth === "true" ? '0' : '0 auto',
                            transition: 'all ' + animationDuration + ' ease',
                            ...animationStyles
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: verticalAlignment === 'center' ? 'center' : verticalAlignment === 'top' ? 'flex-start' : 'flex-end',
                                flex: '1',
                                gap: itemSpacing,
                                textAlign: alignment
                            }}>
                                {showIcon === "true" && (
                                    <div style={{
                                        fontSize: iconSize,
                                        color: finalIconColor,
                                        marginRight: iconMarginRight,
                                        flexShrink: '0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: iconSize,
                                        height: iconSize
                                    }}>
                                        {customIcon || typeStyles.iconSymbol}
                                    </div>
                                )}
                                
                                <div style={{ 
                                    flex: '1',
                                    minWidth: '0'
                                }}>
                                    {showTitle === "true" && (
                                        <div style={{
                                            fontSize: titleFontSize,
                                            fontWeight: titleFontWeight,
                                            color: finalTitleColor,
                                            marginBottom: titleMarginBottom,
                                            lineHeight: '1.4'
                                        }}>
                                            {title}
                                        </div>
                                    )}
                                    
                                    <div style={{
                                        fontSize: messageFontSize,
                                        fontWeight: messageFontWeight,
                                        color: finalTextColor,
                                        lineHeight: '1.5'
                                    }}>
                                        {message}
                                    </div>
                                </div>
                                
                                {showAction === "true" && (
                                    <button
                                        onClick={handleAction}
                                        style={{
                                            marginLeft: actionMarginLeft,
                                            padding: '6px 12px',
                                            backgroundColor: actionButtonColor,
                                            color: actionButtonTextColor,
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: actionFontSize,
                                            fontWeight: actionFontWeight,
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s',
                                            flexShrink: '0'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = actionButtonHoverColor;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = actionButtonColor;
                                        }}
                                    >
                                        {actionText}
                                    </button>
                                )}
                            </div>
                            
                            {dismissible === "true" && showCloseButton === "true" && (
                                <button
                                    onClick={handleClose}
                                    style={{
                                        width: closeButtonSize,
                                        height: closeButtonSize,
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: closeButtonColor,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px',
                                        transition: 'color 0.2s',
                                        fontSize: '16px',
                                        flexShrink: '0'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.color = closeButtonHoverColor;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.color = closeButtonColor;
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    );
                }
            `,
            properties: {
                // Content Section
                message: { type: 'text', default: 'This is an important alert message', section: 'Content' },
                title: { type: 'text', default: 'Alert', section: 'Content' },
                showTitle: { type: 'checkbox', default: true, section: 'Content' },
                showIcon: { type: 'checkbox', default: true, section: 'Content' },
                showCloseButton: { type: 'checkbox', default: true, section: 'Content' },
                actionText: { type: 'text', default: 'Learn More', section: 'Content' },
                showAction: { type: 'checkbox', default: false, section: 'Content' },
                type: { type: 'select', options: ['info', 'success', 'warning', 'error'], default: 'info', section: 'Content' },
                customIcon: { type: 'text', default: '', section: 'Content' },
                
                // Colors Section
                backgroundColor: { type: 'color', default: '#dbeafe', section: 'Colors' },
                textColor: { type: 'color', default: '#1e40af', section: 'Colors' },
                titleColor: { type: 'color', default: '#1e3a8a', section: 'Colors' },
                borderColor: { type: 'color', default: '#93c5fd', section: 'Colors' },
                iconColor: { type: 'color', default: '#3b82f6', section: 'Colors' },
                closeButtonColor: { type: 'color', default: '#6b7280', section: 'Colors' },
                closeButtonHoverColor: { type: 'color', default: '#374151', section: 'Colors' },
                actionButtonColor: { type: 'color', default: '#3b82f6', section: 'Colors' },
                actionButtonHoverColor: { type: 'color', default: '#2563eb', section: 'Colors' },
                actionButtonTextColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                
                // Typography Section
                titleFontSize: { type: 'select', options: ['14px', '16px', '18px', '20px'], default: '16px', section: 'Typography' },
                titleFontWeight: { type: 'select', options: ['400', '500', '600', '700'], default: '600', section: 'Typography' },
                messageFontSize: { type: 'select', options: ['12px', '14px', '16px', '18px'], default: '14px', section: 'Typography' },
                messageFontWeight: { type: 'select', options: ['400', '500', '600'], default: '400', section: 'Typography' },
                actionFontSize: { type: 'select', options: ['12px', '14px', '16px'], default: '14px', section: 'Typography' },
                actionFontWeight: { type: 'select', options: ['400', '500', '600'], default: '500', section: 'Typography' },
                
                // Dimensions Section
                width: { type: 'select', options: ['100%', '600px', '800px', '1000px'], default: '100%', section: 'Dimensions' },
                maxWidth: { type: 'select', options: ['600px', '800px', '1000px', '1200px'], default: '800px', section: 'Dimensions' },
                minHeight: { type: 'select', options: ['50px', '60px', '70px', '80px'], default: '60px', section: 'Dimensions' },
                padding: { type: 'select', options: ['12px', '16px', '20px', '24px'], default: '16px', section: 'Dimensions' },
                iconSize: { type: 'select', options: ['16px', '18px', '20px', '24px'], default: '20px', section: 'Dimensions' },
                closeButtonSize: { type: 'select', options: ['20px', '24px', '28px', '32px'], default: '24px', section: 'Dimensions' },
                
                // Spacing Section
                titleMarginBottom: { type: 'select', options: ['0px', '2px', '4px', '6px', '8px'], default: '4px', section: 'Spacing' },
                iconMarginRight: { type: 'select', options: ['8px', '10px', '12px', '16px'], default: '12px', section: 'Spacing' },
                actionMarginLeft: { type: 'select', options: ['12px', '16px', '20px', '24px'], default: '16px', section: 'Spacing' },
                itemSpacing: { type: 'select', options: ['4px', '6px', '8px', '12px'], default: '8px', section: 'Spacing' },
                
                // Border Section
                borderRadius: { type: 'select', options: ['0px', '4px', '6px', '8px', '12px'], default: '8px', section: 'Border' },
                borderWidth: { type: 'select', options: ['0px', '1px', '2px', '3px'], default: '1px', section: 'Border' },
                borderStyle: { type: 'select', options: ['solid', 'dashed', 'dotted'], default: 'solid', section: 'Border' },
                borderPosition: { type: 'select', options: ['all', 'top', 'bottom', 'left', 'right'], default: 'all', section: 'Border' },
                
                // Layout Section
                alignment: { type: 'select', options: ['left', 'center', 'right'], default: 'left', section: 'Layout' },
                verticalAlignment: { type: 'select', options: ['top', 'center', 'bottom'], default: 'center', section: 'Layout' },
                fullWidth: { type: 'checkbox', default: false, section: 'Layout' },
                position: { type: 'select', options: ['static', 'relative', 'absolute', 'fixed'], default: 'static', section: 'Layout' },
                
                // Animation Section
                showAnimation: { type: 'checkbox', default: true, section: 'Animation' },
                animationType: { type: 'select', options: ['fadeIn', 'slideDown', 'slideRight'], default: 'slideDown', section: 'Animation' },
                animationDuration: { type: 'select', options: ['0.2s', '0.3s', '0.4s', '0.5s'], default: '0.3s', section: 'Animation' },
                
                // Shadow Section
                showShadow: { type: 'checkbox', default: false, section: 'Shadow' },
                shadowBlur: { type: 'select', options: ['5px', '10px', '15px', '20px'], default: '10px', section: 'Shadow' },
                shadowOpacity: { type: 'select', options: ['0.05', '0.1', '0.15', '0.2'], default: '0.1', section: 'Shadow' },
                shadowColor: { type: 'color', default: '#000000', section: 'Shadow' },
                
                // Behavior Section
                dismissible: { type: 'checkbox', default: true, section: 'Behavior' },
                autoHide: { type: 'checkbox', default: false, section: 'Behavior' },
                autoHideDelay: { type: 'select', options: ['3000', '5000', '7000', '10000'], default: '5000', section: 'Behavior' },
                
                // Visibility Section
                showBorder: { type: 'checkbox', default: true, section: 'Visibility' },
                sticky: { type: 'checkbox', default: false, section: 'Visibility' },
                zIndex: { type: 'select', options: ['100', '500', '1000', '9999'], default: '1000', section: 'Visibility' }
            }
        }
    ],
    
    // Overlays Category
    overlays: [
        {
            id: 'modal-dialog',
            name: 'Modal Dialog',
            category: 'overlays',
            description: 'Customizable modal dialog with overlay, animations, and flexible content',
            code: `
                function ModalDialog({ 
                    // Content Section
                    title = "Modal Title",
                    content = "This is the modal content. You can customize everything about this modal.",
                    primaryButtonText = "Confirm",
                    secondaryButtonText = "Cancel",
                    showTitle = "true",
                    showCloseButton = "true",
                    showPrimaryButton = "true",
                    showSecondaryButton = "true",
                    showHeader = "true",
                    showFooter = "true",
                    
                    // Modal State
                    isOpen = "true",
                    closeOnOverlayClick = "true",
                    closeOnEscape = "true",
                    
                    // Colors Section
                    overlayColor = "#000000",
                    overlayOpacity = "0.5",
                    backgroundColor = "#ffffff",
                    headerBackgroundColor = "#ffffff",
                    footerBackgroundColor = "#f9fafb",
                    titleColor = "#1f2937",
                    contentColor = "#4b5563",
                    borderColor = "#e5e7eb",
                    closeButtonColor = "#6b7280",
                    closeButtonHoverColor = "#374151",
                    primaryButtonColor = "#3b82f6",
                    primaryButtonHoverColor = "#2563eb",
                    primaryButtonTextColor = "#ffffff",
                    secondaryButtonColor = "#f3f4f6",
                    secondaryButtonHoverColor = "#e5e7eb",
                    secondaryButtonTextColor = "#374151",
                    
                    // Typography Section
                    titleFontSize = "20px",
                    titleFontWeight = "600",
                    contentFontSize = "16px",
                    contentFontWeight = "400",
                    buttonFontSize = "14px",
                    buttonFontWeight = "500",
                    
                    // Dimensions Section
                    modalWidth = "500px",
                    modalMaxWidth = "90vw",
                    modalMinHeight = "200px",
                    modalMaxHeight = "80vh",
                    headerPadding = "20px",
                    contentPadding = "20px",
                    footerPadding = "20px",
                    closeButtonSize = "32px",
                    
                    // Spacing Section
                    titleMarginBottom = "16px",
                    contentMarginBottom = "24px",
                    buttonSpacing = "12px",
                    headerBorderWidth = "1px",
                    footerBorderWidth = "1px",
                    
                    // Border Section
                    borderRadius = "12px",
                    borderWidth = "0px",
                    borderStyle = "solid",
                    
                    // Animation Section
                    showAnimation = "true",
                    animationType = "fade",
                    animationDuration = "0.3s",
                    
                    // Shadow Section
                    showShadow = "true",
                    shadowBlur = "40px",
                    shadowOpacity = "0.15",
                    shadowColor = "#000000",
                    
                    // Layout Section
                    position = "center",
                    verticalAlignment = "center",
                    headerAlignment = "space-between",
                    footerAlignment = "flex-end",
                    contentAlignment = "left",
                    
                    // Behavior Section
                    preventScroll = "true",
                    focusTrap = "true",
                    autoFocus = "true",
                    
                    // Visibility Section
                    showHeaderBorder = "true",
                    showFooterBorder = "true",
                    backdropBlur = "false",
                    zIndex = "9999"
                }) {
                    const [modalOpen, setModalOpen] = React.useState(isOpen === "true");
                    const [isAnimating, setIsAnimating] = React.useState(false);
                    const modalRef = React.useRef(null);
                    const previouslyFocusedElement = React.useRef(null);
                    
                    React.useEffect(() => {
                        if (modalOpen && showAnimation === "true") {
                            setIsAnimating(true);
                            const timer = setTimeout(() => setIsAnimating(false), parseFloat(animationDuration) * 1000);
                            return () => clearTimeout(timer);
                        }
                    }, [modalOpen, showAnimation, animationDuration]);
                    
                    React.useEffect(() => {
                        if (modalOpen && preventScroll === "true") {
                            document.body.style.overflow = 'hidden';
                            return () => {
                                document.body.style.overflow = 'unset';
                            };
                        }
                    }, [modalOpen, preventScroll]);
                    
                    React.useEffect(() => {
                        const handleEscape = (e) => {
                            if (e.key === 'Escape' && closeOnEscape === "true" && modalOpen) {
                                handleClose();
                            }
                        };
                        
                        if (modalOpen) {
                            document.addEventListener('keydown', handleEscape);
                            if (autoFocus === "true" && modalRef.current) {
                                previouslyFocusedElement.current = document.activeElement;
                                modalRef.current.focus();
                            }
                            
                            return () => {
                                document.removeEventListener('keydown', handleEscape);
                                if (previouslyFocusedElement.current && autoFocus === "true") {
                                    previouslyFocusedElement.current.focus();
                                }
                            };
                        }
                    }, [modalOpen, closeOnEscape, autoFocus]);
                    
                    const handleClose = () => {
                        setModalOpen(false);
                    };
                    
                    const handleOverlayClick = (e) => {
                        if (e.target === e.currentTarget && closeOnOverlayClick === "true") {
                            handleClose();
                        }
                    };
                    
                    const handlePrimaryAction = () => {
                        console.log('Primary button clicked');
                        handleClose();
                    };
                    
                    const handleSecondaryAction = () => {
                        console.log('Secondary button clicked');
                        handleClose();
                    };
                    
                    if (!modalOpen) {
                        return (
                            <div style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: '#6b7280',
                                border: '2px dashed #d1d5db',
                                borderRadius: '8px',
                                backgroundColor: '#f9fafb'
                            }}>
                                Modal is closed. In a real application, you would have a button to open it.
                            </div>
                        );
                    }
                    
                    const shadowStyle = showShadow === 'true' ? 
                        '0 20px ' + shadowBlur + ' rgba(' + 
                        parseInt(shadowColor.slice(1, 3), 16) + ', ' + 
                        parseInt(shadowColor.slice(3, 5), 16) + ', ' + 
                        parseInt(shadowColor.slice(5, 7), 16) + ', ' + shadowOpacity + ')' : 'none';
                    
                    const getAnimationStyles = () => {
                        if (showAnimation !== "true") return {};
                        
                        const baseTransition = 'all ' + animationDuration + ' ease';
                        
                        switch (animationType) {
                            case 'scale':
                                return {
                                    transform: isAnimating ? 'scale(0.8)' : 'scale(1)',
                                    opacity: isAnimating ? '0' : '1',
                                    transition: baseTransition
                                };
                            case 'slideUp':
                                return {
                                    transform: isAnimating ? 'translateY(20px)' : 'translateY(0)',
                                    opacity: isAnimating ? '0' : '1',
                                    transition: baseTransition
                                };
                            case 'slideDown':
                                return {
                                    transform: isAnimating ? 'translateY(-20px)' : 'translateY(0)',
                                    opacity: isAnimating ? '0' : '1',
                                    transition: baseTransition
                                };
                            default: // fade
                                return {
                                    opacity: isAnimating ? '0' : '1',
                                    transition: baseTransition
                                };
                        }
                    };
                    
                    return (
                        <div 
                            style={{
                                position: 'fixed',
                                top: '0',
                                left: '0',
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'rgba(' + 
                                    parseInt(overlayColor.slice(1, 3), 16) + ', ' + 
                                    parseInt(overlayColor.slice(3, 5), 16) + ', ' + 
                                    parseInt(overlayColor.slice(5, 7), 16) + ', ' + overlayOpacity + ')',
                                display: 'flex',
                                alignItems: verticalAlignment === 'center' ? 'center' : verticalAlignment === 'top' ? 'flex-start' : 'flex-end',
                                justifyContent: position === 'center' ? 'center' : position === 'left' ? 'flex-start' : 'flex-end',
                                zIndex: zIndex,
                                backdropFilter: backdropBlur === "true" ? 'blur(4px)' : 'none',
                                padding: '20px'
                            }}
                            onClick={handleOverlayClick}
                        >
                            <div 
                                ref={modalRef}
                                tabIndex="-1"
                                style={{
                                    width: modalWidth,
                                    maxWidth: modalMaxWidth,
                                    minHeight: modalMinHeight,
                                    maxHeight: modalMaxHeight,
                                    backgroundColor: backgroundColor,
                                    borderRadius: borderRadius,
                                    border: borderWidth !== "0px" ? borderWidth + ' ' + borderStyle + ' ' + borderColor : 'none',
                                    boxShadow: shadowStyle,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                    outline: 'none',
                                    ...getAnimationStyles()
                                }}
                            >
                                {showHeader === "true" && (
                                    <div style={{
                                        padding: headerPadding,
                                        backgroundColor: headerBackgroundColor,
                                        borderBottom: showHeaderBorder === "true" ? headerBorderWidth + 'px solid ' + borderColor : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: headerAlignment,
                                        flexShrink: '0'
                                    }}>
                                        {showTitle === "true" && (
                                            <h2 style={{
                                                margin: '0',
                                                fontSize: titleFontSize,
                                                fontWeight: titleFontWeight,
                                                color: titleColor,
                                                flex: showCloseButton === "true" ? '1' : 'none'
                                            }}>
                                                {title}
                                            </h2>
                                        )}
                                        
                                        {showCloseButton === "true" && (
                                            <button
                                                onClick={handleClose}
                                                style={{
                                                    width: closeButtonSize,
                                                    height: closeButtonSize,
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    color: closeButtonColor,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '16px',
                                                    transition: 'color 0.2s, background-color 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.color = closeButtonHoverColor;
                                                    e.target.style.backgroundColor = '#f3f4f6';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.color = closeButtonColor;
                                                    e.target.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                )}
                                
                                <div style={{
                                    padding: contentPadding,
                                    flex: '1',
                                    overflowY: 'auto',
                                    fontSize: contentFontSize,
                                    fontWeight: contentFontWeight,
                                    color: contentColor,
                                    lineHeight: '1.6',
                                    textAlign: contentAlignment
                                }}>
                                    {content}
                                </div>
                                
                                {showFooter === "true" && (showPrimaryButton === "true" || showSecondaryButton === "true") && (
                                    <div style={{
                                        padding: footerPadding,
                                        backgroundColor: footerBackgroundColor,
                                        borderTop: showFooterBorder === "true" ? footerBorderWidth + 'px solid ' + borderColor : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: footerAlignment,
                                        gap: buttonSpacing,
                                        flexShrink: '0'
                                    }}>
                                        {showSecondaryButton === "true" && (
                                            <button
                                                onClick={handleSecondaryAction}
                                                style={{
                                                    padding: '8px 16px',
                                                    backgroundColor: secondaryButtonColor,
                                                    color: secondaryButtonTextColor,
                                                    border: '1px solid ' + borderColor,
                                                    borderRadius: '6px',
                                                    fontSize: buttonFontSize,
                                                    fontWeight: buttonFontWeight,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.backgroundColor = secondaryButtonHoverColor;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.backgroundColor = secondaryButtonColor;
                                                }}
                                            >
                                                {secondaryButtonText}
                                            </button>
                                        )}
                                        
                                        {showPrimaryButton === "true" && (
                                            <button
                                                onClick={handlePrimaryAction}
                                                style={{
                                                    padding: '8px 16px',
                                                    backgroundColor: primaryButtonColor,
                                                    color: primaryButtonTextColor,
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: buttonFontSize,
                                                    fontWeight: buttonFontWeight,
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.backgroundColor = primaryButtonHoverColor;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.backgroundColor = primaryButtonColor;
                                                }}
                                            >
                                                {primaryButtonText}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                }
            `,
            properties: {
                // Content Section
                title: { type: 'text', default: 'Modal Title', section: 'Content' },
                content: { type: 'textarea', default: 'This is the modal content. You can customize everything about this modal.', section: 'Content' },
                primaryButtonText: { type: 'text', default: 'Confirm', section: 'Content' },
                secondaryButtonText: { type: 'text', default: 'Cancel', section: 'Content' },
                showTitle: { type: 'checkbox', default: true, section: 'Content' },
                showCloseButton: { type: 'checkbox', default: true, section: 'Content' },
                showPrimaryButton: { type: 'checkbox', default: true, section: 'Content' },
                showSecondaryButton: { type: 'checkbox', default: true, section: 'Content' },
                showHeader: { type: 'checkbox', default: true, section: 'Content' },
                showFooter: { type: 'checkbox', default: true, section: 'Content' },
                
                // Modal State
                isOpen: { type: 'checkbox', default: true, section: 'Modal State' },
                closeOnOverlayClick: { type: 'checkbox', default: true, section: 'Modal State' },
                closeOnEscape: { type: 'checkbox', default: true, section: 'Modal State' },
                
                // Colors Section
                overlayColor: { type: 'color', default: '#000000', section: 'Colors' },
                overlayOpacity: { type: 'select', options: ['0.3', '0.4', '0.5', '0.6', '0.7'], default: '0.5', section: 'Colors' },
                backgroundColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                headerBackgroundColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                footerBackgroundColor: { type: 'color', default: '#f9fafb', section: 'Colors' },
                titleColor: { type: 'color', default: '#1f2937', section: 'Colors' },
                contentColor: { type: 'color', default: '#4b5563', section: 'Colors' },
                borderColor: { type: 'color', default: '#e5e7eb', section: 'Colors' },
                closeButtonColor: { type: 'color', default: '#6b7280', section: 'Colors' },
                closeButtonHoverColor: { type: 'color', default: '#374151', section: 'Colors' },
                primaryButtonColor: { type: 'color', default: '#3b82f6', section: 'Colors' },
                primaryButtonHoverColor: { type: 'color', default: '#2563eb', section: 'Colors' },
                primaryButtonTextColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                secondaryButtonColor: { type: 'color', default: '#f3f4f6', section: 'Colors' },
                secondaryButtonHoverColor: { type: 'color', default: '#e5e7eb', section: 'Colors' },
                secondaryButtonTextColor: { type: 'color', default: '#374151', section: 'Colors' },
                
                // Typography Section
                titleFontSize: { type: 'select', options: ['16px', '18px', '20px', '24px'], default: '20px', section: 'Typography' },
                titleFontWeight: { type: 'select', options: ['400', '500', '600', '700'], default: '600', section: 'Typography' },
                contentFontSize: { type: 'select', options: ['14px', '15px', '16px', '18px'], default: '16px', section: 'Typography' },
                contentFontWeight: { type: 'select', options: ['400', '500'], default: '400', section: 'Typography' },
                buttonFontSize: { type: 'select', options: ['12px', '14px', '16px'], default: '14px', section: 'Typography' },
                buttonFontWeight: { type: 'select', options: ['400', '500', '600'], default: '500', section: 'Typography' },
                
                // Dimensions Section
                modalWidth: { type: 'select', options: ['400px', '500px', '600px', '800px'], default: '500px', section: 'Dimensions' },
                modalMaxWidth: { type: 'select', options: ['80vw', '85vw', '90vw', '95vw'], default: '90vw', section: 'Dimensions' },
                modalMinHeight: { type: 'select', options: ['150px', '200px', '250px', '300px'], default: '200px', section: 'Dimensions' },
                modalMaxHeight: { type: 'select', options: ['70vh', '75vh', '80vh', '85vh', '90vh'], default: '80vh', section: 'Dimensions' },
                headerPadding: { type: 'select', options: ['16px', '20px', '24px', '28px'], default: '20px', section: 'Dimensions' },
                contentPadding: { type: 'select', options: ['16px', '20px', '24px', '28px'], default: '20px', section: 'Dimensions' },
                footerPadding: { type: 'select', options: ['16px', '20px', '24px', '28px'], default: '20px', section: 'Dimensions' },
                closeButtonSize: { type: 'select', options: ['28px', '32px', '36px', '40px'], default: '32px', section: 'Dimensions' },
                
                // Spacing Section
                titleMarginBottom: { type: 'select', options: ['8px', '12px', '16px', '20px'], default: '16px', section: 'Spacing' },
                contentMarginBottom: { type: 'select', options: ['16px', '20px', '24px', '28px'], default: '24px', section: 'Spacing' },
                buttonSpacing: { type: 'select', options: ['8px', '10px', '12px', '16px'], default: '12px', section: 'Spacing' },
                headerBorderWidth: { type: 'select', options: ['0px', '1px', '2px'], default: '1px', section: 'Spacing' },
                footerBorderWidth: { type: 'select', options: ['0px', '1px', '2px'], default: '1px', section: 'Spacing' },
                
                // Border Section
                borderRadius: { type: 'select', options: ['0px', '6px', '8px', '12px', '16px'], default: '12px', section: 'Border' },
                borderWidth: { type: 'select', options: ['0px', '1px', '2px'], default: '0px', section: 'Border' },
                borderStyle: { type: 'select', options: ['solid', 'dashed', 'dotted'], default: 'solid', section: 'Border' },
                
                // Animation Section
                showAnimation: { type: 'checkbox', default: true, section: 'Animation' },
                animationType: { type: 'select', options: ['fade', 'scale', 'slideUp', 'slideDown'], default: 'fade', section: 'Animation' },
                animationDuration: { type: 'select', options: ['0.2s', '0.3s', '0.4s', '0.5s'], default: '0.3s', section: 'Animation' },
                
                // Shadow Section
                showShadow: { type: 'checkbox', default: true, section: 'Shadow' },
                shadowBlur: { type: 'select', options: ['20px', '30px', '40px', '50px'], default: '40px', section: 'Shadow' },
                shadowOpacity: { type: 'select', options: ['0.1', '0.15', '0.2', '0.25'], default: '0.15', section: 'Shadow' },
                shadowColor: { type: 'color', default: '#000000', section: 'Shadow' },
                
                // Layout Section
                position: { type: 'select', options: ['center', 'left', 'right'], default: 'center', section: 'Layout' },
                verticalAlignment: { type: 'select', options: ['top', 'center', 'bottom'], default: 'center', section: 'Layout' },
                headerAlignment: { type: 'select', options: ['flex-start', 'center', 'space-between'], default: 'space-between', section: 'Layout' },
                footerAlignment: { type: 'select', options: ['flex-start', 'center', 'flex-end'], default: 'flex-end', section: 'Layout' },
                contentAlignment: { type: 'select', options: ['left', 'center', 'right'], default: 'left', section: 'Layout' },
                
                // Behavior Section
                preventScroll: { type: 'checkbox', default: true, section: 'Behavior' },
                focusTrap: { type: 'checkbox', default: true, section: 'Behavior' },
                autoFocus: { type: 'checkbox', default: true, section: 'Behavior' },
                
                // Visibility Section
                showHeaderBorder: { type: 'checkbox', default: true, section: 'Visibility' },
                showFooterBorder: { type: 'checkbox', default: true, section: 'Visibility' },
                backdropBlur: { type: 'checkbox', default: false, section: 'Visibility' },
                zIndex: { type: 'select', options: ['1000', '5000', '9999'], default: '9999', section: 'Visibility' }
            }
        }
    ],
    
    // Search Components Category  
    search: [
        {
            id: 'search-bar',
            name: 'Search Bar',
            category: 'search',
            description: 'Powerful search bar with suggestions, filters, and customizable styling',
            code: `
                function SearchBar({ 
                    // Content Section
                    placeholder = "Search for anything...",
                    buttonText = "Search",
                    clearText = "Clear",
                    noResultsText = "No results found",
                    showButton = "true",
                    showClearButton = "true",
                    showIcon = "true",
                    showSuggestions = "true",
                    enableFilters = "false",
                    
                    // Search Data
                    suggestion1 = "React Components",
                    suggestion2 = "JavaScript Tutorial",
                    suggestion3 = "CSS Grid Layout",
                    suggestion4 = "Node.js Guide",
                    suggestion5 = "TypeScript Basics",
                    maxSuggestions = "5",
                    
                    // Colors Section
                    backgroundColor = "#ffffff",
                    borderColor = "#d1d5db",
                    focusBorderColor = "#3b82f6",
                    textColor = "#1f2937",
                    placeholderColor = "#6b7280",
                    buttonBackgroundColor = "#3b82f6",
                    buttonHoverBackgroundColor = "#2563eb",
                    buttonTextColor = "#ffffff",
                    iconColor = "#6b7280",
                    suggestionBackgroundColor = "#ffffff",
                    suggestionHoverColor = "#f3f4f6",
                    suggestionTextColor = "#374151",
                    clearButtonColor = "#6b7280",
                    clearButtonHoverColor = "#374151",
                    
                    // Typography Section
                    fontSize = "16px",
                    fontWeight = "400",
                    buttonFontSize = "14px",
                    buttonFontWeight = "500",
                    suggestionFontSize = "14px",
                    suggestionFontWeight = "400",
                    
                    // Dimensions Section
                    width = "100%",
                    maxWidth = "600px",
                    height = "48px",
                    buttonWidth = "100px",
                    iconSize = "20px",
                    suggestionHeight = "40px",
                    maxSuggestionHeight = "300px",
                    
                    // Spacing Section
                    padding = "12px 16px",
                    buttonPadding = "12px 20px",
                    suggestionPadding = "12px 16px",
                    iconMarginRight = "8px",
                    buttonMarginLeft = "8px",
                    suggestionMarginBottom = "2px",
                    
                    // Border Section
                    borderRadius = "8px",
                    borderWidth = "1px",
                    borderStyle = "solid",
                    buttonBorderRadius = "6px",
                    suggestionBorderRadius = "6px",
                    
                    // Animation Section
                    showAnimation = "true",
                    animationDuration = "0.2s",
                    focusAnimation = "true",
                    suggestionAnimation = "slideDown",
                    
                    // Shadow Section
                    showShadow = "false",
                    shadowBlur = "10px",
                    shadowOpacity = "0.1",
                    shadowColor = "#000000",
                    suggestionShadowBlur = "20px",
                    suggestionShadowOpacity = "0.15",
                    
                    // Layout Section
                    layout = "inline",
                    alignment = "left",
                    suggestionAlignment = "left",
                    
                    // Behavior Section
                    autoComplete = "true",
                    caseSensitive = "false",
                    minSearchLength = "1",
                    searchDelay = "300",
                    closeOnSelect = "true",
                    
                    // Visibility Section
                    showSuggestionsOnFocus = "true",
                    highlightMatch = "true",
                    fullWidth = "false"
                }) {
                    const [searchValue, setSearchValue] = React.useState('');
                    const [showSuggestionList, setShowSuggestionList] = React.useState(false);
                    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
                    const [isFocused, setIsFocused] = React.useState(false);
                    const searchRef = React.useRef(null);
                    
                    const suggestions = [
                        suggestion1, suggestion2, suggestion3, suggestion4, suggestion5
                    ].filter(Boolean);
                    
                    const filteredSuggestions = React.useMemo(() => {
                        if (!searchValue || searchValue.length < parseInt(minSearchLength)) return [];
                        
                        const filtered = suggestions.filter(suggestion => {
                            const comparison = caseSensitive === "true" 
                                ? suggestion.includes(searchValue)
                                : suggestion.toLowerCase().includes(searchValue.toLowerCase());
                            return comparison;
                        });
                        
                        return filtered.slice(0, parseInt(maxSuggestions));
                    }, [searchValue, suggestions, caseSensitive, minSearchLength, maxSuggestions]);
                    
                    const handleSearch = () => {
                        console.log('Search:', searchValue);
                    };
                    
                    const handleClear = () => {
                        setSearchValue('');
                        setShowSuggestionList(false);
                        if (searchRef.current) {
                            searchRef.current.focus();
                        }
                    };
                    
                    const handleInputChange = (e) => {
                        const value = e.target.value;
                        setSearchValue(value);
                        
                        if (showSuggestions === "true") {
                            setShowSuggestionList(value.length >= parseInt(minSearchLength));
                        }
                        setHighlightedIndex(-1);
                    };
                    
                    const handleKeyDown = (e) => {
                        if (!showSuggestionList || filteredSuggestions.length === 0) {
                            if (e.key === 'Enter') {
                                handleSearch();
                            }
                            return;
                        }
                        
                        switch (e.key) {
                            case 'ArrowDown':
                                e.preventDefault();
                                setHighlightedIndex(prev => 
                                    prev < filteredSuggestions.length - 1 ? prev + 1 : prev
                                );
                                break;
                            case 'ArrowUp':
                                e.preventDefault();
                                setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
                                break;
                            case 'Enter':
                                e.preventDefault();
                                if (highlightedIndex >= 0) {
                                    selectSuggestion(filteredSuggestions[highlightedIndex]);
                                } else {
                                    handleSearch();
                                }
                                break;
                            case 'Escape':
                                setShowSuggestionList(false);
                                setHighlightedIndex(-1);
                                break;
                        }
                    };
                    
                    const selectSuggestion = (suggestion) => {
                        setSearchValue(suggestion);
                        if (closeOnSelect === "true") {
                            setShowSuggestionList(false);
                        }
                        setHighlightedIndex(-1);
                    };
                    
                    const handleFocus = () => {
                        setIsFocused(true);
                        if (showSuggestionsOnFocus === "true" && showSuggestions === "true" && searchValue.length >= parseInt(minSearchLength)) {
                            setShowSuggestionList(true);
                        }
                    };
                    
                    const handleBlur = () => {
                        setIsFocused(false);
                        // Delay hiding suggestions to allow clicking on them
                        setTimeout(() => {
                            setShowSuggestionList(false);
                            setHighlightedIndex(-1);
                        }, 150);
                    };
                    
                    const shadowStyle = showShadow === 'true' ? 
                        '0 4px ' + shadowBlur + ' rgba(' + 
                        parseInt(shadowColor.slice(1, 3), 16) + ', ' + 
                        parseInt(shadowColor.slice(3, 5), 16) + ', ' + 
                        parseInt(shadowColor.slice(5, 7), 16) + ', ' + shadowOpacity + ')' : 'none';
                    
                    const suggestionShadowStyle = 
                        '0 10px ' + suggestionShadowBlur + ' rgba(' + 
                        parseInt(shadowColor.slice(1, 3), 16) + ', ' + 
                        parseInt(shadowColor.slice(3, 5), 16) + ', ' + 
                        parseInt(shadowColor.slice(5, 7), 16) + ', ' + suggestionShadowOpacity + ')';
                    
                    const getHighlightedText = (text, highlight) => {
                        if (highlightMatch !== "true" || !highlight) return text;
                        
                        // Simple text highlighting without complex regex
                        const searchTerm = caseSensitive === "true" ? highlight : highlight.toLowerCase();
                        const textToSearch = caseSensitive === "true" ? text : text.toLowerCase();
                        
                        if (textToSearch.includes(searchTerm)) {
                            const startIndex = textToSearch.indexOf(searchTerm);
                            const beforeMatch = text.substring(0, startIndex);
                            const match = text.substring(startIndex, startIndex + highlight.length);
                            const afterMatch = text.substring(startIndex + highlight.length);
                            
                            return beforeMatch + '<mark style="background: #fbbf24; color: inherit;">' + match + '</mark>' + afterMatch;
                        }
                        
                        return text;
                    };
                    
                    return (
                        <div style={{
                            position: 'relative',
                            width: fullWidth === "true" ? '100%' : width,
                            maxWidth: maxWidth,
                            fontFamily: 'Inter, sans-serif'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: layout === 'stacked' ? '0' : buttonMarginLeft,
                                flexDirection: layout === 'stacked' ? 'column' : 'row'
                            }}>
                                <div style={{
                                    position: 'relative',
                                    flex: layout === 'inline' ? '1' : 'none',
                                    width: layout === 'stacked' ? '100%' : 'auto'
                                }}>
                                    <div style={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        {showIcon === "true" && (
                                            <div style={{
                                                position: 'absolute',
                                                left: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: iconColor,
                                                fontSize: iconSize,
                                                pointerEvents: 'none',
                                                zIndex: 1
                                            }}>
                                                🔍
                                            </div>
                                        )}
                                        
                                        <input
                                            ref={searchRef}
                                            type="text"
                                            value={searchValue}
                                            onChange={handleInputChange}
                                            onKeyDown={handleKeyDown}
                                            onFocus={handleFocus}
                                            onBlur={handleBlur}
                                            placeholder={placeholder}
                                            style={{
                                                width: '100%',
                                                height: height,
                                                padding: showIcon === "true" ? '0 ' + (showClearButton === "true" && searchValue ? '40px' : '16px') + ' 0 40px' : padding,
                                                border: borderWidth + ' ' + borderStyle + ' ' + (isFocused ? focusBorderColor : borderColor),
                                                borderRadius: borderRadius,
                                                backgroundColor: backgroundColor,
                                                color: textColor,
                                                fontSize: fontSize,
                                                fontWeight: fontWeight,
                                                outline: 'none',
                                                boxShadow: shadowStyle,
                                                transition: showAnimation === "true" ? 'all ' + animationDuration + ' ease' : 'none',
                                                transform: focusAnimation === "true" && isFocused ? 'translateY(-1px)' : 'translateY(0)'
                                            }}
                                        />
                                        
                                        {showClearButton === "true" && searchValue && (
                                            <button
                                                onClick={handleClear}
                                                style={{
                                                    position: 'absolute',
                                                    right: '12px',
                                                    width: '20px',
                                                    height: '20px',
                                                    border: 'none',
                                                    background: 'none',
                                                    color: clearButtonColor,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '50%',
                                                    fontSize: '14px',
                                                    transition: 'color 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.color = clearButtonHoverColor;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.color = clearButtonColor;
                                                }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                    
                                    {showSuggestionList && filteredSuggestions.length > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: '0',
                                            right: '0',
                                            backgroundColor: suggestionBackgroundColor,
                                            border: borderWidth + ' ' + borderStyle + ' ' + borderColor,
                                            borderRadius: suggestionBorderRadius,
                                            boxShadow: suggestionShadowStyle,
                                            maxHeight: maxSuggestionHeight,
                                            overflowY: 'auto',
                                            zIndex: 1000,
                                            marginTop: '4px',
                                            animation: showAnimation === "true" && suggestionAnimation === 'slideDown' ? 
                                                'slideDown ' + animationDuration + ' ease' : 'none'
                                        }}>
                                            {filteredSuggestions.map((suggestion, index) => (
                                                <div
                                                    key={index}
                                                    onClick={() => selectSuggestion(suggestion)}
                                                    style={{
                                                        padding: suggestionPadding,
                                                        cursor: 'pointer',
                                                        backgroundColor: index === highlightedIndex ? suggestionHoverColor : 'transparent',
                                                        color: suggestionTextColor,
                                                        fontSize: suggestionFontSize,
                                                        fontWeight: suggestionFontWeight,
                                                        borderBottom: index < filteredSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                                                        transition: 'background-color 0.2s',
                                                        textAlign: suggestionAlignment
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (index !== highlightedIndex) {
                                                            e.target.style.backgroundColor = suggestionHoverColor;
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (index !== highlightedIndex) {
                                                            e.target.style.backgroundColor = 'transparent';
                                                        }
                                                    }}
                                                    dangerouslySetInnerHTML={{
                                                        __html: getHighlightedText(suggestion, searchValue)
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    
                                    {showSuggestionList && filteredSuggestions.length === 0 && searchValue.length >= parseInt(minSearchLength) && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: '0',
                                            right: '0',
                                            backgroundColor: suggestionBackgroundColor,
                                            border: borderWidth + ' ' + borderStyle + ' ' + borderColor,
                                            borderRadius: suggestionBorderRadius,
                                            boxShadow: suggestionShadowStyle,
                                            padding: suggestionPadding,
                                            color: suggestionTextColor,
                                            fontSize: suggestionFontSize,
                                            textAlign: 'center',
                                            zIndex: 1000,
                                            marginTop: '4px'
                                        }}>
                                            {noResultsText}
                                        </div>
                                    )}
                                </div>
                                
                                {showButton === "true" && (
                                    <button
                                        onClick={handleSearch}
                                        style={{
                                            width: layout === 'stacked' ? '100%' : buttonWidth,
                                            height: height,
                                            padding: buttonPadding,
                                            backgroundColor: buttonBackgroundColor,
                                            color: buttonTextColor,
                                            border: 'none',
                                            borderRadius: buttonBorderRadius,
                                            fontSize: buttonFontSize,
                                            fontWeight: buttonFontWeight,
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s',
                                            marginTop: layout === 'stacked' ? '8px' : '0'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = buttonHoverBackgroundColor;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = buttonBackgroundColor;
                                        }}
                                    >
                                        {buttonText}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                }
            `,
            properties: {
                // Content Section
                placeholder: { type: 'text', default: 'Search for anything...', section: 'Content' },
                buttonText: { type: 'text', default: 'Search', section: 'Content' },
                clearText: { type: 'text', default: 'Clear', section: 'Content' },
                noResultsText: { type: 'text', default: 'No results found', section: 'Content' },
                showButton: { type: 'checkbox', default: true, section: 'Content' },
                showClearButton: { type: 'checkbox', default: true, section: 'Content' },
                showIcon: { type: 'checkbox', default: true, section: 'Content' },
                showSuggestions: { type: 'checkbox', default: true, section: 'Content' },
                enableFilters: { type: 'checkbox', default: false, section: 'Content' },
                suggestion1: { type: 'text', default: 'React Components', section: 'Content' },
                suggestion2: { type: 'text', default: 'JavaScript Tutorial', section: 'Content' },
                suggestion3: { type: 'text', default: 'CSS Grid Layout', section: 'Content' },
                suggestion4: { type: 'text', default: 'Node.js Guide', section: 'Content' },
                suggestion5: { type: 'text', default: 'TypeScript Basics', section: 'Content' },
                maxSuggestions: { type: 'select', options: ['3', '5', '7', '10'], default: '5', section: 'Content' },
                
                // Colors Section
                backgroundColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                borderColor: { type: 'color', default: '#d1d5db', section: 'Colors' },
                focusBorderColor: { type: 'color', default: '#3b82f6', section: 'Colors' },
                textColor: { type: 'color', default: '#1f2937', section: 'Colors' },
                placeholderColor: { type: 'color', default: '#6b7280', section: 'Colors' },
                buttonBackgroundColor: { type: 'color', default: '#3b82f6', section: 'Colors' },
                buttonHoverBackgroundColor: { type: 'color', default: '#2563eb', section: 'Colors' },
                buttonTextColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                iconColor: { type: 'color', default: '#6b7280', section: 'Colors' },
                suggestionBackgroundColor: { type: 'color', default: '#ffffff', section: 'Colors' },
                suggestionHoverColor: { type: 'color', default: '#f3f4f6', section: 'Colors' },
                suggestionTextColor: { type: 'color', default: '#374151', section: 'Colors' },
                clearButtonColor: { type: 'color', default: '#6b7280', section: 'Colors' },
                clearButtonHoverColor: { type: 'color', default: '#374151', section: 'Colors' },
                
                // Typography Section
                fontSize: { type: 'select', options: ['14px', '15px', '16px', '18px'], default: '16px', section: 'Typography' },
                fontWeight: { type: 'select', options: ['400', '500'], default: '400', section: 'Typography' },
                buttonFontSize: { type: 'select', options: ['12px', '14px', '16px'], default: '14px', section: 'Typography' },
                buttonFontWeight: { type: 'select', options: ['400', '500', '600'], default: '500', section: 'Typography' },
                suggestionFontSize: { type: 'select', options: ['12px', '14px', '16px'], default: '14px', section: 'Typography' },
                suggestionFontWeight: { type: 'select', options: ['400', '500'], default: '400', section: 'Typography' },
                
                // Dimensions Section
                width: { type: 'select', options: ['100%', '400px', '500px', '600px', '800px'], default: '100%', section: 'Dimensions' },
                maxWidth: { type: 'select', options: ['400px', '500px', '600px', '800px', '1000px'], default: '600px', section: 'Dimensions' },
                height: { type: 'select', options: ['40px', '44px', '48px', '52px', '56px'], default: '48px', section: 'Dimensions' },
                buttonWidth: { type: 'select', options: ['80px', '100px', '120px', '140px'], default: '100px', section: 'Dimensions' },
                iconSize: { type: 'select', options: ['16px', '18px', '20px', '22px', '24px'], default: '20px', section: 'Dimensions' },
                suggestionHeight: { type: 'select', options: ['36px', '40px', '44px', '48px'], default: '40px', section: 'Dimensions' },
                maxSuggestionHeight: { type: 'select', options: ['200px', '250px', '300px', '400px'], default: '300px', section: 'Dimensions' },
                
                // Spacing Section
                padding: { type: 'select', options: ['8px 12px', '10px 14px', '12px 16px', '14px 18px'], default: '12px 16px', section: 'Spacing' },
                buttonPadding: { type: 'select', options: ['8px 16px', '10px 18px', '12px 20px', '14px 24px'], default: '12px 20px', section: 'Spacing' },
                suggestionPadding: { type: 'select', options: ['8px 12px', '10px 14px', '12px 16px', '14px 18px'], default: '12px 16px', section: 'Spacing' },
                iconMarginRight: { type: 'select', options: ['6px', '8px', '10px', '12px'], default: '8px', section: 'Spacing' },
                buttonMarginLeft: { type: 'select', options: ['4px', '6px', '8px', '12px'], default: '8px', section: 'Spacing' },
                suggestionMarginBottom: { type: 'select', options: ['0px', '1px', '2px', '4px'], default: '2px', section: 'Spacing' },
                
                // Border Section
                borderRadius: { type: 'select', options: ['4px', '6px', '8px', '12px'], default: '8px', section: 'Border' },
                borderWidth: { type: 'select', options: ['1px', '2px'], default: '1px', section: 'Border' },
                borderStyle: { type: 'select', options: ['solid', 'dashed'], default: 'solid', section: 'Border' },
                buttonBorderRadius: { type: 'select', options: ['4px', '6px', '8px', '12px'], default: '6px', section: 'Border' },
                suggestionBorderRadius: { type: 'select', options: ['4px', '6px', '8px', '12px'], default: '6px', section: 'Border' },
                
                // Animation Section
                showAnimation: { type: 'checkbox', default: true, section: 'Animation' },
                animationDuration: { type: 'select', options: ['0.1s', '0.2s', '0.3s', '0.4s'], default: '0.2s', section: 'Animation' },
                focusAnimation: { type: 'checkbox', default: true, section: 'Animation' },
                suggestionAnimation: { type: 'select', options: ['slideDown', 'fadeIn'], default: 'slideDown', section: 'Animation' },
                
                // Shadow Section
                showShadow: { type: 'checkbox', default: false, section: 'Shadow' },
                shadowBlur: { type: 'select', options: ['5px', '10px', '15px', '20px'], default: '10px', section: 'Shadow' },
                shadowOpacity: { type: 'select', options: ['0.05', '0.1', '0.15', '0.2'], default: '0.1', section: 'Shadow' },
                shadowColor: { type: 'color', default: '#000000', section: 'Shadow' },
                suggestionShadowBlur: { type: 'select', options: ['10px', '15px', '20px', '25px'], default: '20px', section: 'Shadow' },
                suggestionShadowOpacity: { type: 'select', options: ['0.1', '0.15', '0.2', '0.25'], default: '0.15', section: 'Shadow' },
                
                // Layout Section
                layout: { type: 'select', options: ['inline', 'stacked'], default: 'inline', section: 'Layout' },
                alignment: { type: 'select', options: ['left', 'center', 'right'], default: 'left', section: 'Layout' },
                suggestionAlignment: { type: 'select', options: ['left', 'center', 'right'], default: 'left', section: 'Layout' },
                
                // Behavior Section
                autoComplete: { type: 'checkbox', default: true, section: 'Behavior' },
                caseSensitive: { type: 'checkbox', default: false, section: 'Behavior' },
                minSearchLength: { type: 'select', options: ['0', '1', '2', '3'], default: '1', section: 'Behavior' },
                searchDelay: { type: 'select', options: ['0', '150', '300', '500'], default: '300', section: 'Behavior' },
                closeOnSelect: { type: 'checkbox', default: true, section: 'Behavior' },
                
                // Visibility Section
                showSuggestionsOnFocus: { type: 'checkbox', default: true, section: 'Visibility' },
                highlightMatch: { type: 'checkbox', default: true, section: 'Visibility' },
                fullWidth: { type: 'checkbox', default: false, section: 'Visibility' }
            }
        }
    ],
    
    // Layout Components Category
    layout: [
        {
            id: 'footer',
            name: 'Footer',
            category: 'layout',
            description: 'Professional website footer with links, social media, and company information',
            code: `
                function Footer({ 
                    // Content Section
                    companyName = "CoderOne",
                    companyDescription = "Building the future of AI-powered development tools.",
                    copyrightText = "All rights reserved.",
                    showCopyright = "true",
                    showCompanyInfo = "true",
                    showSocialMedia = "true",
                    showNewsletter = "true",
                    newsletterTitle = "Stay Updated",
                    newsletterDescription = "Subscribe to our newsletter",
                    emailPlaceholder = "Enter your email",
                    subscribeButtonText = "Subscribe",
                    
                    // Links Section
                    showProductLinks = "true",
                    productTitle = "Products",
                    productLink1 = "IDE",
                    productLink2 = "Components",
                    productLink3 = "Templates",
                    productLink4 = "Plugins",
                    
                    showCompanyLinks = "true",
                    companyTitle = "Company",
                    companyLink1 = "About",
                    companyLink2 = "Careers",
                    companyLink3 = "Contact",
                    companyLink4 = "Blog",
                    
                    showSupportLinks = "true",
                    supportTitle = "Support",
                    supportLink1 = "Help Center",
                    supportLink2 = "Documentation",
                    supportLink3 = "Community",
                    supportLink4 = "Status",
                    
                    // Social Media
                    showTwitter = "true",
                    showGithub = "true",
                    showLinkedin = "true",
                    showDiscord = "false",
                    
                    // Colors Section
                    backgroundColor = "#1f2937",
                    textColor = "#d1d5db",
                    headingColor = "#f9fafb",
                    linkColor = "#9ca3af",
                    linkHoverColor = "#f3f4f6",
                    borderColor = "#374151",
                    copyrightBackgroundColor = "#111827",
                    copyrightTextColor = "#9ca3af",
                    socialIconColor = "#9ca3af",
                    socialIconHoverColor = "#f3f4f6",
                    newsletterInputBackground = "#374151",
                    newsletterInputBorder = "#4b5563",
                    newsletterInputText = "#f9fafb",
                    newsletterButtonBackground = "#3b82f6",
                    newsletterButtonHover = "#2563eb",
                    newsletterButtonText = "#ffffff",
                    
                    // Typography Section
                    companyNameFontSize = "24px",
                    companyNameFontWeight = "700",
                    descriptionFontSize = "16px",
                    descriptionFontWeight = "400",
                    headingFontSize = "18px",
                    headingFontWeight = "600",
                    linkFontSize = "14px",
                    linkFontWeight = "400",
                    copyrightFontSize = "14px",
                    copyrightFontWeight = "400",
                    newsletterTitleFontSize = "18px",
                    newsletterTitleFontWeight = "600",
                    newsletterDescriptionFontSize = "14px",
                    newsletterDescriptionFontWeight = "400",
                    
                    // Dimensions Section
                    width = "100%",
                    maxWidth = "1200px",
                    padding = "64px 32px",
                    copyrightPadding = "24px 32px",
                    socialIconSize = "20px",
                    newsletterInputHeight = "44px",
                    newsletterButtonWidth = "120px",
                    
                    // Spacing Section
                    sectionSpacing = "48px",
                    linkSpacing = "12px",
                    companyDescriptionMargin = "16px",
                    headingMarginBottom = "20px",
                    newsletterDescriptionMargin = "8px",
                    newsletterInputMargin = "16px",
                    socialIconSpacing = "16px",
                    copyrightMarginTop = "16px",
                    
                    // Border Section
                    showTopBorder = "true",
                    topBorderWidth = "1px",
                    topBorderStyle = "solid",
                    copyrightBorderWidth = "1px",
                    copyrightBorderStyle = "solid",
                    newsletterInputBorderRadius = "6px",
                    newsletterButtonBorderRadius = "6px",
                    
                    // Layout Section
                    layout = "columns",
                    columnsCount = "4",
                    alignment = "left",
                    copyrightAlignment = "center",
                    socialMediaPosition = "bottom",
                    responsiveBreakpoint = "768px",
                    
                    // Animation Section
                    showHoverEffects = "true",
                    hoverTransition = "0.2s",
                    
                    // Visibility Section
                    showDividers = "false",
                    stickyFooter = "false",
                    fullWidth = "true"
                }) {
                    const [email, setEmail] = React.useState('');
                    const [isSubscribed, setIsSubscribed] = React.useState(false);
                    
                    const handleSubscribe = () => {
                        if (email.trim()) {
                            console.log('Newsletter subscription:', email);
                            setIsSubscribed(true);
                            setTimeout(() => {
                                setIsSubscribed(false);
                                setEmail('');
                            }, 3000);
                        }
                    };
                    
                    const handleKeyPress = (e) => {
                        if (e.key === 'Enter') {
                            handleSubscribe();
                        }
                    };
                    
                    const currentYear = new Date().getFullYear();
                    
                    return (
                        <footer style={{
                            backgroundColor: backgroundColor,
                            color: textColor,
                            width: fullWidth === "true" ? '100%' : width,
                            borderTop: showTopBorder === "true" ? topBorderWidth + ' ' + topBorderStyle + ' ' + borderColor : 'none',
                            fontFamily: 'Inter, sans-serif'
                        }}>
                            <div style={{
                                maxWidth: maxWidth,
                                margin: '0 auto',
                                padding: padding
                            }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: layout === 'columns' ? 'repeat(' + columnsCount + ', 1fr)' : '1fr',
                                    gap: sectionSpacing,
                                    marginBottom: socialMediaPosition === 'top' ? sectionSpacing : '0'
                                }}>
                                    {/* Company Info Section */}
                                    {showCompanyInfo === "true" && (
                                        <div>
                                            <h3 style={{
                                                fontSize: companyNameFontSize,
                                                fontWeight: companyNameFontWeight,
                                                color: headingColor,
                                                margin: '0 0 ' + companyDescriptionMargin,
                                                textAlign: alignment
                                            }}>
                                                {companyName}
                                            </h3>
                                            <p style={{
                                                fontSize: descriptionFontSize,
                                                fontWeight: descriptionFontWeight,
                                                color: textColor,
                                                lineHeight: '1.6',
                                                margin: '0',
                                                textAlign: alignment
                                            }}>
                                                {companyDescription}
                                            </p>
                                            
                                            {socialMediaPosition === 'company' && showSocialMedia === "true" && (
                                                <div style={{
                                                    display: 'flex',
                                                    gap: socialIconSpacing,
                                                    marginTop: '24px',
                                                    justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start'
                                                }}>
                                                    {showTwitter === "true" && (
                                                        <a href="#" style={{
                                                            color: socialIconColor,
                                                            fontSize: socialIconSize,
                                                            textDecoration: 'none',
                                                            transition: showHoverEffects === "true" ? 'color ' + hoverTransition : 'none'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (showHoverEffects === "true") {
                                                                e.target.style.color = socialIconHoverColor;
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (showHoverEffects === "true") {
                                                                e.target.style.color = socialIconColor;
                                                            }
                                                        }}>
                                                            🐦
                                                        </a>
                                                    )}
                                                    {showGithub === "true" && (
                                                        <a href="#" style={{
                                                            color: socialIconColor,
                                                            fontSize: socialIconSize,
                                                            textDecoration: 'none',
                                                            transition: showHoverEffects === "true" ? 'color ' + hoverTransition : 'none'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (showHoverEffects === "true") {
                                                                e.target.style.color = socialIconHoverColor;
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (showHoverEffects === "true") {
                                                                e.target.style.color = socialIconColor;
                                                            }
                                                        }}>
                                                            🐙
                                                        </a>
                                                    )}
                                                    {showLinkedin === "true" && (
                                                        <a href="#" style={{
                                                            color: socialIconColor,
                                                            fontSize: socialIconSize,
                                                            textDecoration: 'none',
                                                            transition: showHoverEffects === "true" ? 'color ' + hoverTransition : 'none'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (showHoverEffects === "true") {
                                                                e.target.style.color = socialIconHoverColor;
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (showHoverEffects === "true") {
                                                                e.target.style.color = socialIconColor;
                                                            }
                                                        }}>
                                                            💼
                                                        </a>
                                                    )}
                                                    {showDiscord === "true" && (
                                                        <a href="#" style={{
                                                            color: socialIconColor,
                                                            fontSize: socialIconSize,
                                                            textDecoration: 'none',
                                                            transition: showHoverEffects === "true" ? 'color ' + hoverTransition : 'none'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (showHoverEffects === "true") {
                                                                e.target.style.color = socialIconHoverColor;
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (showHoverEffects === "true") {
                                                                e.target.style.color = socialIconColor;
                                                            }
                                                        }}>
                                                            💬
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Products Links */}
                                    {showProductLinks === "true" && (
                                        <div>
                                            <h4 style={{
                                                fontSize: headingFontSize,
                                                fontWeight: headingFontWeight,
                                                color: headingColor,
                                                margin: '0 0 ' + headingMarginBottom,
                                                textAlign: alignment
                                            }}>
                                                {productTitle}
                                            </h4>
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: linkSpacing,
                                                textAlign: alignment
                                            }}>
                                                {[productLink1, productLink2, productLink3, productLink4].filter(Boolean).map((link, index) => (
                                                    <a key={index} href="#" style={{
                                                        color: linkColor,
                                                        textDecoration: 'none',
                                                        fontSize: linkFontSize,
                                                        fontWeight: linkFontWeight,
                                                        transition: showHoverEffects === "true" ? 'color ' + hoverTransition : 'none'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (showHoverEffects === "true") {
                                                            e.target.style.color = linkHoverColor;
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (showHoverEffects === "true") {
                                                            e.target.style.color = linkColor;
                                                        }
                                                    }}>
                                                        {link}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Company Links */}
                                    {showCompanyLinks === "true" && (
                                        <div>
                                            <h4 style={{
                                                fontSize: headingFontSize,
                                                fontWeight: headingFontWeight,
                                                color: headingColor,
                                                margin: '0 0 ' + headingMarginBottom,
                                                textAlign: alignment
                                            }}>
                                                {companyTitle}
                                            </h4>
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: linkSpacing,
                                                textAlign: alignment
                                            }}>
                                                {[companyLink1, companyLink2, companyLink3, companyLink4].filter(Boolean).map((link, index) => (
                                                    <a key={index} href="#" style={{
                                                        color: linkColor,
                                                        textDecoration: 'none',
                                                        fontSize: linkFontSize,
                                                        fontWeight: linkFontWeight,
                                                        transition: showHoverEffects === "true" ? 'color ' + hoverTransition : 'none'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (showHoverEffects === "true") {
                                                            e.target.style.color = linkHoverColor;
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (showHoverEffects === "true") {
                                                            e.target.style.color = linkColor;
                                                        }
                                                    }}>
                                                        {link}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Support Links */}
                                    {showSupportLinks === "true" && (
                                        <div>
                                            <h4 style={{
                                                fontSize: headingFontSize,
                                                fontWeight: headingFontWeight,
                                                color: headingColor,
                                                margin: '0 0 ' + headingMarginBottom,
                                                textAlign: alignment
                                            }}>
                                                {supportTitle}
                                            </h4>
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: linkSpacing,
                                                textAlign: alignment
                                            }}>
                                                {[supportLink1, supportLink2, supportLink3, supportLink4].filter(Boolean).map((link, index) => (
                                                    <a key={index} href="#" style={{
                                                        color: linkColor,
                                                        textDecoration: 'none',
                                                        fontSize: linkFontSize,
                                                        fontWeight: linkFontWeight,
                                                        transition: showHoverEffects === "true" ? 'color ' + hoverTransition : 'none'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (showHoverEffects === "true") {
                                                            e.target.style.color = linkHoverColor;
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (showHoverEffects === "true") {
                                                            e.target.style.color = linkColor;
                                                        }
                                                    }}>
                                                        {link}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Newsletter Section */}
                                    {showNewsletter === "true" && (
                                        <div>
                                            <h4 style={{
                                                fontSize: newsletterTitleFontSize,
                                                fontWeight: newsletterTitleFontWeight,
                                                color: headingColor,
                                                margin: '0 0 ' + newsletterDescriptionMargin,
                                                textAlign: alignment
                                            }}>
                                                {newsletterTitle}
                                            </h4>
                                            <p style={{
                                                fontSize: newsletterDescriptionFontSize,
                                                fontWeight: newsletterDescriptionFontWeight,
                                                color: textColor,
                                                margin: '0 0 ' + newsletterInputMargin,
                                                textAlign: alignment
                                            }}>
                                                {newsletterDescription}
                                            </p>
                                            <div style={{
                                                display: 'flex',
                                                gap: '8px',
                                                alignItems: 'center'
                                            }}>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    onKeyPress={handleKeyPress}
                                                    placeholder={emailPlaceholder}
                                                    style={{
                                                        flex: '1',
                                                        height: newsletterInputHeight,
                                                        padding: '0 12px',
                                                        backgroundColor: newsletterInputBackground,
                                                        border: '1px solid ' + newsletterInputBorder,
                                                        borderRadius: newsletterInputBorderRadius,
                                                        color: newsletterInputText,
                                                        fontSize: '14px',
                                                        outline: 'none'
                                                    }}
                                                />
                                                <button
                                                    onClick={handleSubscribe}
                                                    style={{
                                                        width: newsletterButtonWidth,
                                                        height: newsletterInputHeight,
                                                        backgroundColor: isSubscribed ? '#10b981' : newsletterButtonBackground,
                                                        color: newsletterButtonText,
                                                        border: 'none',
                                                        borderRadius: newsletterButtonBorderRadius,
                                                        fontSize: '14px',
                                                        fontWeight: '500',
                                                        cursor: 'pointer',
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isSubscribed && showHoverEffects === "true") {
                                                            e.target.style.backgroundColor = newsletterButtonHover;
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSubscribed && showHoverEffects === "true") {
                                                            e.target.style.backgroundColor = newsletterButtonBackground;
                                                        }
                                                    }}
                                                >
                                                    {isSubscribed ? '✓ Subscribed' : subscribeButtonText}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Bottom Social Media */}
                                {socialMediaPosition === 'bottom' && showSocialMedia === "true" && (
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: copyrightAlignment === 'center' ? 'center' : copyrightAlignment === 'right' ? 'flex-end' : 'flex-start',
                                        gap: socialIconSpacing,
                                        marginTop: sectionSpacing,
                                        paddingTop: sectionSpacing,
                                        borderTop: showDividers === "true" ? '1px solid ' + borderColor : 'none'
                                    }}>
                                        {showTwitter === "true" && (
                                            <a href="#" style={{
                                                color: socialIconColor,
                                                fontSize: socialIconSize,
                                                textDecoration: 'none',
                                                transition: showHoverEffects === "true" ? 'color ' + hoverTransition : 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (showHoverEffects === "true") {
                                                    e.target.style.color = socialIconHoverColor;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (showHoverEffects === "true") {
                                                    e.target.style.color = socialIconColor;
                                                }
                                            }}>
                                                🐦
                                            </a>
                                        )}
                                        {showGithub === "true" && (
                                            <a href="#" style={{
                                                color: socialIconColor,
                                                fontSize: socialIconSize,
                                                textDecoration: 'none',
                                                transition: showHoverEffects === "true" ? 'color ' + hoverTransition : 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (showHoverEffects === "true") {
                                                    e.target.style.color = socialIconHoverColor;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (showHoverEffects === "true") {
                                                    e.target.style.color = socialIconColor;
                                                }
                                            }}>
                                                🐙
                                            </a>
                                        )}
                                        {showLinkedin === "true" && (
                                            <a href="#" style={{
                                                color: socialIconColor,
                                                fontSize: socialIconSize,
                                                textDecoration: 'none',
                                                transition: showHoverEffects === "true" ? 'color ' + hoverTransition : 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (showHoverEffects === "true") {
                                                    e.target.style.color = socialIconHoverColor;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (showHoverEffects === "true") {
                                                    e.target.style.color = socialIconColor;
                                                }
                                            }}>
                                                💼
                                            </a>
                                        )}
                                        {showDiscord === "true" && (
                                            <a href="#" style={{
                                                color: socialIconColor,
                                                fontSize: socialIconSize,
                                                textDecoration: 'none',
                                                transition: showHoverEffects === "true" ? 'color ' + hoverTransition : 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (showHoverEffects === "true") {
                                                    e.target.style.color = socialIconHoverColor;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (showHoverEffects === "true") {
                                                    e.target.style.color = socialIconColor;
                                                }
                                            }}>
                                                💬
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Copyright Section */}
                            {showCopyright === "true" && (
                                <div style={{
                                    backgroundColor: copyrightBackgroundColor,
                                    borderTop: copyrightBorderWidth + ' ' + copyrightBorderStyle + ' ' + borderColor,
                                    padding: copyrightPadding,
                                    textAlign: copyrightAlignment
                                }}>
                                    <p style={{
                                        color: copyrightTextColor,
                                        fontSize: copyrightFontSize,
                                        fontWeight: copyrightFontWeight,
                                        margin: '0'
                                    }}>
                                        © {currentYear} {companyName}. {copyrightText}
                                    </p>
                                </div>
                            )}
                        </footer>
                    );
                }
            `,
            properties: {
                // Content Section
                companyName: { type: 'text', default: 'CoderOne', section: 'Content' },
                companyDescription: { type: 'textarea', default: 'Building the future of AI-powered development tools.', section: 'Content' },
                copyrightText: { type: 'text', default: 'All rights reserved.', section: 'Content' },
                showCopyright: { type: 'checkbox', default: true, section: 'Content' },
                showCompanyInfo: { type: 'checkbox', default: true, section: 'Content' },
                showSocialMedia: { type: 'checkbox', default: true, section: 'Content' },
                showNewsletter: { type: 'checkbox', default: true, section: 'Content' },
                newsletterTitle: { type: 'text', default: 'Stay Updated', section: 'Content' },
                newsletterDescription: { type: 'text', default: 'Subscribe to our newsletter', section: 'Content' },
                emailPlaceholder: { type: 'text', default: 'Enter your email', section: 'Content' },
                subscribeButtonText: { type: 'text', default: 'Subscribe', section: 'Content' },
                
                // Links Section
                showProductLinks: { type: 'checkbox', default: true, section: 'Links' },
                productTitle: { type: 'text', default: 'Products', section: 'Links' },
                productLink1: { type: 'text', default: 'IDE', section: 'Links' },
                productLink2: { type: 'text', default: 'Components', section: 'Links' },
                productLink3: { type: 'text', default: 'Templates', section: 'Links' },
                productLink4: { type: 'text', default: 'Plugins', section: 'Links' },
                showCompanyLinks: { type: 'checkbox', default: true, section: 'Links' },
                companyTitle: { type: 'text', default: 'Company', section: 'Links' },
                companyLink1: { type: 'text', default: 'About', section: 'Links' },
                companyLink2: { type: 'text', default: 'Careers', section: 'Links' },
                companyLink3: { type: 'text', default: 'Contact', section: 'Links' },
                companyLink4: { type: 'text', default: 'Blog', section: 'Links' },
                showSupportLinks: { type: 'checkbox', default: true, section: 'Links' },
                supportTitle: { type: 'text', default: 'Support', section: 'Links' },
                supportLink1: { type: 'text', default: 'Help Center', section: 'Links' },
                supportLink2: { type: 'text', default: 'Documentation', section: 'Links' },
                supportLink3: { type: 'text', default: 'Community', section: 'Links' },
                supportLink4: { type: 'text', default: 'Status', section: 'Links' },
                
                // Social Media
                showTwitter: { type: 'checkbox', default: true, section: 'Social Media' },
                showGithub: { type: 'checkbox', default: true, section: 'Social Media' },
                showLinkedin: { type: 'checkbox', default: true, section: 'Social Media' },
                showDiscord: { type: 'checkbox', default: false, section: 'Social Media' },
                
                // Colors Section
                backgroundColor: { type: 'color', default: '#1f2937', section: 'Colors' },
                textColor: { type: 'color', default: '#d1d5db', section: 'Colors' },
                headingColor: { type: 'color', default: '#f9fafb', section: 'Colors' },
                linkColor: { type: 'color', default: '#9ca3af', section: 'Colors' },
                linkHoverColor: { type: 'color', default: '#f3f4f6', section: 'Colors' },
                borderColor: { type: 'color', default: '#374151', section: 'Colors' },
                copyrightBackgroundColor: { type: 'color', default: '#111827', section: 'Colors' },
                copyrightTextColor: { type: 'color', default: '#9ca3af', section: 'Colors' },
                socialIconColor: { type: 'color', default: '#9ca3af', section: 'Colors' },
                socialIconHoverColor: { type: 'color', default: '#f3f4f6', section: 'Colors' },
                newsletterInputBackground: { type: 'color', default: '#374151', section: 'Colors' },
                newsletterInputBorder: { type: 'color', default: '#4b5563', section: 'Colors' },
                newsletterInputText: { type: 'color', default: '#f9fafb', section: 'Colors' },
                newsletterButtonBackground: { type: 'color', default: '#3b82f6', section: 'Colors' },
                newsletterButtonHover: { type: 'color', default: '#2563eb', section: 'Colors' },
                newsletterButtonText: { type: 'color', default: '#ffffff', section: 'Colors' },
                
                // Typography Section
                companyNameFontSize: { type: 'select', options: ['20px', '22px', '24px', '28px'], default: '24px', section: 'Typography' },
                companyNameFontWeight: { type: 'select', options: ['600', '700', '800'], default: '700', section: 'Typography' },
                descriptionFontSize: { type: 'select', options: ['14px', '15px', '16px', '18px'], default: '16px', section: 'Typography' },
                descriptionFontWeight: { type: 'select', options: ['400', '500'], default: '400', section: 'Typography' },
                headingFontSize: { type: 'select', options: ['16px', '17px', '18px', '20px'], default: '18px', section: 'Typography' },
                headingFontWeight: { type: 'select', options: ['500', '600', '700'], default: '600', section: 'Typography' },
                linkFontSize: { type: 'select', options: ['13px', '14px', '15px', '16px'], default: '14px', section: 'Typography' },
                linkFontWeight: { type: 'select', options: ['400', '500'], default: '400', section: 'Typography' },
                copyrightFontSize: { type: 'select', options: ['12px', '13px', '14px', '15px'], default: '14px', section: 'Typography' },
                copyrightFontWeight: { type: 'select', options: ['400', '500'], default: '400', section: 'Typography' },
                newsletterTitleFontSize: { type: 'select', options: ['16px', '17px', '18px', '20px'], default: '18px', section: 'Typography' },
                newsletterTitleFontWeight: { type: 'select', options: ['500', '600', '700'], default: '600', section: 'Typography' },
                newsletterDescriptionFontSize: { type: 'select', options: ['13px', '14px', '15px', '16px'], default: '14px', section: 'Typography' },
                newsletterDescriptionFontWeight: { type: 'select', options: ['400', '500'], default: '400', section: 'Typography' },
                
                // Dimensions Section
                width: { type: 'select', options: ['100%', '1000px', '1200px', '1400px'], default: '100%', section: 'Dimensions' },
                maxWidth: { type: 'select', options: ['1000px', '1200px', '1400px', '1600px'], default: '1200px', section: 'Dimensions' },
                padding: { type: 'select', options: ['48px 24px', '56px 28px', '64px 32px', '80px 40px'], default: '64px 32px', section: 'Dimensions' },
                copyrightPadding: { type: 'select', options: ['16px 24px', '20px 28px', '24px 32px', '32px 40px'], default: '24px 32px', section: 'Dimensions' },
                socialIconSize: { type: 'select', options: ['16px', '18px', '20px', '24px'], default: '20px', section: 'Dimensions' },
                newsletterInputHeight: { type: 'select', options: ['40px', '42px', '44px', '48px'], default: '44px', section: 'Dimensions' },
                newsletterButtonWidth: { type: 'select', options: ['100px', '110px', '120px', '140px'], default: '120px', section: 'Dimensions' },
                
                // Spacing Section
                sectionSpacing: { type: 'select', options: ['32px', '40px', '48px', '56px'], default: '48px', section: 'Spacing' },
                linkSpacing: { type: 'select', options: ['8px', '10px', '12px', '16px'], default: '12px', section: 'Spacing' },
                companyDescriptionMargin: { type: 'select', options: ['12px', '14px', '16px', '20px'], default: '16px', section: 'Spacing' },
                headingMarginBottom: { type: 'select', options: ['16px', '18px', '20px', '24px'], default: '20px', section: 'Spacing' },
                newsletterDescriptionMargin: { type: 'select', options: ['6px', '8px', '10px', '12px'], default: '8px', section: 'Spacing' },
                newsletterInputMargin: { type: 'select', options: ['12px', '14px', '16px', '20px'], default: '16px', section: 'Spacing' },
                socialIconSpacing: { type: 'select', options: ['12px', '14px', '16px', '20px'], default: '16px', section: 'Spacing' },
                copyrightMarginTop: { type: 'select', options: ['12px', '14px', '16px', '20px'], default: '16px', section: 'Spacing' },
                
                // Border Section
                showTopBorder: { type: 'checkbox', default: true, section: 'Border' },
                topBorderWidth: { type: 'select', options: ['1px', '2px'], default: '1px', section: 'Border' },
                topBorderStyle: { type: 'select', options: ['solid', 'dashed'], default: 'solid', section: 'Border' },
                copyrightBorderWidth: { type: 'select', options: ['1px', '2px'], default: '1px', section: 'Border' },
                copyrightBorderStyle: { type: 'select', options: ['solid', 'dashed'], default: 'solid', section: 'Border' },
                newsletterInputBorderRadius: { type: 'select', options: ['4px', '6px', '8px'], default: '6px', section: 'Border' },
                newsletterButtonBorderRadius: { type: 'select', options: ['4px', '6px', '8px'], default: '6px', section: 'Border' },
                
                // Layout Section
                layout: { type: 'select', options: ['columns', 'stacked'], default: 'columns', section: 'Layout' },
                columnsCount: { type: 'select', options: ['2', '3', '4', '5'], default: '4', section: 'Layout' },
                alignment: { type: 'select', options: ['left', 'center'], default: 'left', section: 'Layout' },
                copyrightAlignment: { type: 'select', options: ['left', 'center', 'right'], default: 'center', section: 'Layout' },
                socialMediaPosition: { type: 'select', options: ['top', 'bottom', 'company'], default: 'bottom', section: 'Layout' },
                responsiveBreakpoint: { type: 'select', options: ['640px', '768px', '1024px'], default: '768px', section: 'Layout' },
                
                // Animation Section
                showHoverEffects: { type: 'checkbox', default: true, section: 'Animation' },
                hoverTransition: { type: 'select', options: ['0.1s', '0.2s', '0.3s'], default: '0.2s', section: 'Animation' },
                
                // Visibility Section
                showDividers: { type: 'checkbox', default: false, section: 'Visibility' },
                stickyFooter: { type: 'checkbox', default: false, section: 'Visibility' },
                fullWidth: { type: 'checkbox', default: true, section: 'Visibility' }
            }
        }
    ]
};

// Tooltip utilities
const TooltipManager = {
    init() {
        // Initialize tooltips with proper positioning
        this.setupTooltipEvents();
    },
    
    setupTooltipEvents() {
        // Handle dynamic tooltip positioning for edge cases
        document.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('tooltip') || e.target.closest('.tooltip')) {
                const tooltip = e.target.classList.contains('tooltip') ? e.target : e.target.closest('.tooltip');
                const rect = tooltip.getBoundingClientRect();
                
                // Reset classes
                tooltip.classList.remove('tooltip-left', 'tooltip-right', 'tooltip-top');
                
                // Special handling for component cards in the left sidebar
                if (tooltip.classList.contains('component-card')) {
                    tooltip.classList.add('tooltip-right');
                    return;
                }
                
                // General positioning logic for other elements
                if (rect.left < 280) { // Left sidebar area
                    tooltip.classList.add('tooltip-right');
                } else if (rect.right > window.innerWidth - 100) {
                    tooltip.classList.add('tooltip-left');
                } else if (rect.top < 60) {
                    tooltip.classList.add('tooltip-top');
                }
            }
        });
    },
    
    addTooltip(element, text, position = '') {
        element.classList.add('tooltip');
        if (position) element.classList.add('tooltip-' + position);
        element.setAttribute('data-tooltip', text);
    }
};

// Component tooltips data
const ComponentTooltips = {
    'nav-bar': 'Responsive navigation bar with dropdown menus and mobile hamburger',
    'sidebar-menu': 'Collapsible sidebar navigation with nested menu items',
    'breadcrumb': 'Breadcrumb navigation showing current page location',
    'pagination': 'Pagination controls for splitting content across multiple pages',
    'faq': 'Expandable FAQ section with question and answer pairs',
    'tab-navigation': 'Tabbed interface for organizing content into sections',
    'mobile-menu': 'Mobile-optimized hamburger menu with slide-out drawer',
    'team-cards': 'Grid of team member cards with photos and descriptions',
    'timeline': 'Vertical timeline component for displaying chronological events',
    'stats-display': 'Statistical display with numbers and labels',
    'animated-button': 'Button with hover animations and gradient effects',
    'glow-button': 'Button with customizable glow and hover effects',
    'gradient-button': 'Button with gradient backgrounds and smooth transitions',
    'glass-card': 'Modern glass morphism card with backdrop blur effect',
    'product-card': 'E-commerce product card with image, price, and actions',
    'login-form': 'Complete login form with validation and styling options',
    'split-hero': 'Split-screen hero section with content and image',
    'video-hero': 'Hero section with background video and overlay content',
    'animated-text-hero': 'Hero with animated text effects and gradients',
    'cta-hero': 'Call-to-action focused hero with prominent buttons',
    'gradient-hero': 'Hero section with gradient backgrounds and animations',
    'feature-grid': 'Grid layout showcasing features with icons and descriptions',
    'testimonials': 'Customer testimonials with ratings and carousel navigation',
    'data-table': 'Professional data table with sorting, pagination, and search',
    'alert-banner': 'Notification banner with different types and auto-dismiss',
    'modal-dialog': 'Overlay modal with customizable content and animations',
    'search-bar': 'Advanced search input with suggestions and filtering',
    'footer': 'Complete website footer with links, social media, and newsletter'
};

// Property section tooltips
const PropertyTooltips = {
    'Content': 'Text, labels, and visible content options',
    'Colors': 'Color scheme and theme customization',
    'Typography': 'Font sizes, weights, and text styling',
    'Dimensions': 'Width, height, and size controls',
    'Spacing': 'Margins, padding, and layout spacing',
    'Border': 'Border styles, radius, and outlines',
    'Shadow': 'Drop shadow and elevation effects',
    'Animation': 'Transitions, hover effects, and motion',
    'Layout': 'Positioning, alignment, and structure',
    'Behavior': 'Interaction states and functionality',
    'Visibility': 'Show/hide toggles and conditional display'
};

// Individual property tooltips for common properties
const PropertyHelpText = {
    'backgroundColor': 'The background color of the component',
    'textColor': 'The color of the text content',
    'borderRadius': 'How rounded the corners should be',
    'padding': 'Internal spacing inside the component',
    'margin': 'External spacing around the component',
    'fontSize': 'Size of the text (px, rem, or em)',
    'fontWeight': 'How bold or light the text appears',
    'width': 'Width of the component (px, %, or auto)',
    'height': 'Height of the component (px, %, or auto)',
    'boxShadow': 'Drop shadow effect around the component',
    'transition': 'Animation timing for hover and state changes',
    'borderWidth': 'Thickness of the border line',
    'opacity': 'Transparency level (0 = invisible, 1 = opaque)',
    'zIndex': 'Stacking order (higher numbers appear on top)',
    'position': 'How the component is positioned in the layout',
    'display': 'How the component is displayed (block, flex, etc.)',
    'alignItems': 'Vertical alignment of child elements',
    'justifyContent': 'Horizontal alignment of child elements',
    'flexDirection': 'Direction of flex layout (row or column)',
    'gap': 'Spacing between child elements in flex layouts'
};

// Initialize the studio
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎨 Magic UI Component Studio initializing...');
    
    // Initialize tooltips
    TooltipManager.init();
    
    // Load components into the library
    loadComponentLibrary();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize recent templates
    updateRecentTemplates();
    
    // Initialize AI features
    initializeAIFeatures();
    
    // Add notification animations
    addNotificationAnimations();
    
    // Initialize revision system
    initRevisionSystem();
    
    console.log('✨ Studio ready!');
});

// Load components into the sidebar
function loadComponentLibrary() {
    const componentList = document.getElementById('component-list');
    const allComponents = [
        ...ComponentLibrary.navigation,
        ...ComponentLibrary.content,
        ...ComponentLibrary.buttons,
        ...ComponentLibrary.cards,
        ...ComponentLibrary.forms,
        ...ComponentLibrary.headers,
        ...ComponentLibrary.heroes,
        ...ComponentLibrary.dataDisplay,
        ...ComponentLibrary.feedback,
        ...ComponentLibrary.overlays,
        ...ComponentLibrary.search,
        ...ComponentLibrary.layout,
        ...(ComponentLibrary['ai-generated'] || [])
    ];
    
    StudioState.components = allComponents;
    
    // Group components by category - AI-generated first for visibility
    const categories = {
        'ai-generated': ComponentLibrary['ai-generated'] || [],
        navigation: ComponentLibrary.navigation,
        headers: ComponentLibrary.headers,
        content: ComponentLibrary.content,
        buttons: ComponentLibrary.buttons,
        cards: ComponentLibrary.cards,
        forms: ComponentLibrary.forms,
        heroes: ComponentLibrary.heroes,
        'data display': ComponentLibrary.dataDisplay,
        feedback: ComponentLibrary.feedback,
        overlays: ComponentLibrary.overlays,
        search: ComponentLibrary.search,
        layout: ComponentLibrary.layout
    };
    
    let html = '';
    
    for (const [category, components] of Object.entries(categories)) {
        // Always show AI-generated category, even when empty
        if (category === 'ai-generated') {
            console.log('🔧 Rendering AI-generated category with', components.length, 'components');
            html += `
                <div class="component-category">
                    <div class="category-title" style="color: #10b981;">🤖 ${category}</div>
            `;
            
            if (components.length === 0) {
                html += `
                    <div style="padding: 12px; color: var(--text-secondary); font-size: 13px; font-style: italic;">
                        No AI-generated components yet. Use the generator above to create one!
                    </div>
                `;
            } else {
                for (const component of components) {
                    const tooltip = ComponentTooltips[component.id] || component.description;
                    html += `
                        <div class="component-card tooltip" data-component-id="${component.id}" data-tooltip="${tooltip}">
                            <div style="font-weight: 500; margin-bottom: 4px;">${component.name}</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">${component.description}</div>
                        </div>
                    `;
                }
            }
            
            html += '</div>';
        } else {
            // Regular categories
            html += `
                <div class="component-category">
                    <div class="category-title">${category}</div>
            `;
            
            for (const component of components) {
                const tooltip = ComponentTooltips[component.id] || component.description;
                html += `
                    <div class="component-card tooltip" data-component-id="${component.id}" data-tooltip="${tooltip}">
                        <div style="font-weight: 500; margin-bottom: 4px;">${component.name}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${component.description}</div>
                    </div>
                `;
            }
            
            html += '</div>';
        }
    }
    
    componentList.innerHTML = html;
    
    // Add click handlers to component cards
    document.querySelectorAll('.component-card').forEach(card => {
        card.addEventListener('click', () => {
            const componentId = card.dataset.componentId;
            selectComponent(componentId);
        });
    });
}

// Select and load a component
function selectComponent(componentId) {
    console.log('🎯 selectComponent called with:', componentId);
    
    // Find the component
    const component = StudioState.components.find(c => c.id === componentId);
    if (!component) {
        console.error('❌ Component not found in selectComponent:', componentId);
        return;
    }
    
    console.log('✅ Component found:', component.name);
    
    // Update state
    StudioState.currentComponent = component;
    StudioState.currentProps = {};
    
    // Reset props to defaults
    for (const [propName, propConfig] of Object.entries(component.props)) {
        StudioState.currentProps[propName] = propConfig.default;
    }
    
    console.log('📝 Props initialized:', StudioState.currentProps);
    
    // Update UI
    document.querySelectorAll('.component-card').forEach(card => {
        card.classList.remove('selected');
    });
    const selectedCard = document.querySelector(`[data-component-id="${componentId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        // Scroll into view if needed
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        console.warn('🔧 Component card not found in DOM for ID:', componentId);
    }
    
    // Load property controls
    loadPropertyControls(component);
    
    // Render preview
    renderPreview();
    
    // Save as new revision
    saveRevision('Component selected: ' + component.name);
}

// Load property controls for the selected component with grouped sections
function loadPropertyControls(component) {
    const propertyControls = document.getElementById('property-controls');
    
    if (!component) {
        propertyControls.innerHTML = '<div class="text-gray-500 text-sm">No component selected</div>';
        return;
    }
    
    // Group properties by section
    const sections = {};
    for (const [propName, propConfig] of Object.entries(component.props)) {
        const section = propConfig.section || 'General';
        if (!sections[section]) {
            sections[section] = [];
        }
        sections[section].push({ propName, propConfig });
    }
    
    let html = '';
    
    // Render each section
    for (const [sectionName, properties] of Object.entries(sections)) {
        const sectionTooltip = PropertyTooltips[sectionName] || `${sectionName} properties and settings`;
        html += `
            <div class="property-section">
                <div class="property-section-header tooltip" onclick="togglePropertySection('${sectionName}')" data-tooltip="${sectionTooltip}">
                    <span class="property-section-title">${sectionName} <span class="property-help">?</span></span>
                    <span class="property-section-toggle" id="toggle-${sectionName}">▼</span>
                </div>
                <div class="property-section-content" id="section-${sectionName}">
        `;
        
        // Render properties in this section
        for (const { propName, propConfig } of properties) {
            const helpText = PropertyHelpText[propName] || `Configure the ${formatPropertyLabel(propName).toLowerCase()} property`;
            html += '<div class="property-control">';
            html += `<label class="property-label tooltip" data-tooltip="${helpText}">${formatPropertyLabel(propName)} <span class="property-help">?</span></label>`;
            
            if (propConfig.type === 'string') {
                html += `
                    <input type="text" 
                        class="property-input" 
                        data-prop="${propName}"
                        value="${StudioState.currentProps[propName] || propConfig.default}"
                        placeholder="${propConfig.default}"
                    />
                `;
            } else if (propConfig.type === 'text') {
                html += `
                    <textarea 
                        class="property-input" 
                        data-prop="${propName}"
                        rows="3"
                        placeholder="${propConfig.default}"
                    >${StudioState.currentProps[propName] || propConfig.default}</textarea>
                `;
            } else if (propConfig.type === 'color') {
                html += `
                    <div class="color-input-container">
                        <input type="color" 
                            class="property-input color-picker" 
                            data-prop="${propName}"
                            value="${StudioState.currentProps[propName] || propConfig.default}"
                        />
                        <input type="text" 
                            class="property-input color-text" 
                            data-prop="${propName}"
                            value="${StudioState.currentProps[propName] || propConfig.default}"
                            placeholder="${propConfig.default}"
                        />
                    </div>
                `;
            } else if (propConfig.type === 'select') {
                html += `
                    <select class="property-input" data-prop="${propName}">
                        ${propConfig.options.map(opt => `
                            <option value="${opt}" ${opt === (StudioState.currentProps[propName] || propConfig.default) ? 'selected' : ''}>
                                ${opt}
                            </option>
                        `).join('')}
                    </select>
                `;
            }
            
            html += '</div>';
        }
        
        html += '</div></div>';
    }
    
    propertyControls.innerHTML = html;
    
    // Add CSS for new property section styling
    addPropertySectionStyles();
    
    // Add change listeners
    propertyControls.querySelectorAll('.property-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const propName = e.target.dataset.prop;
            StudioState.currentProps[propName] = e.target.value;
            
            // Sync color picker and text input
            if (input.type === 'color') {
                const textInput = propertyControls.querySelector(`.color-text[data-prop="${propName}"]`);
                if (textInput) textInput.value = e.target.value;
            } else if (input.classList.contains('color-text')) {
                const colorInput = propertyControls.querySelector(`.color-picker[data-prop="${propName}"]`);
                if (colorInput) colorInput.value = e.target.value;
            }
            
            renderPreview();
            saveRevision(`Changed ${formatPropertyLabel(propName)}`, propName);
        });
    });
}

// Format property labels for better readability
function formatPropertyLabel(propName) {
    return propName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/([a-z])([A-Z])/g, '$1 $2');
}

// Toggle property section visibility
function togglePropertySection(sectionName) {
    const content = document.getElementById(`section-${sectionName}`);
    const toggle = document.getElementById(`toggle-${sectionName}`);
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▼';
    } else {
        content.style.display = 'none';
        toggle.textContent = '▶';
    }
}

// Add CSS styles for property sections
function addPropertySectionStyles() {
    if (document.getElementById('property-section-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'property-section-styles';
    style.textContent = `
        .property-section {
            margin-bottom: 16px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .property-section-header {
            background: var(--bg-tertiary);
            padding: 12px 16px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-color);
            transition: background 0.2s;
        }
        
        .property-section-header:hover {
            background: rgba(139, 92, 246, 0.1);
        }
        
        .property-section-title {
            font-weight: 600;
            font-size: 14px;
            color: var(--text-primary);
        }
        
        .property-section-toggle {
            font-size: 12px;
            color: var(--text-secondary);
            transition: transform 0.2s;
        }
        
        .property-section-content {
            padding: 16px;
        }
        
        .color-input-container {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        .color-picker {
            width: 50px !important;
            height: 36px !important;
            padding: 2px !important;
            border-radius: 6px;
        }
        
        .color-text {
            flex: 1;
            font-family: monospace;
            font-size: 13px;
        }
        
        .property-control {
            margin-bottom: 16px;
        }
        
        .property-control:last-child {
            margin-bottom: 0;
        }
        
        .property-label {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 6px;
            display: block;
        }
    `;
    document.head.appendChild(style);
}

// Render the component preview
function renderPreview() {
    const previewContainer = document.getElementById('preview-container');
    
    if (!StudioState.currentComponent) {
        previewContainer.innerHTML = '';
        previewContainer.classList.remove('has-component');
        return;
    }
    
    // Add the styling class when we have a component
    previewContainer.classList.add('has-component');
    
    try {
        // Create the component code with current props
        let componentCode = StudioState.currentComponent.code.trim();
        
        // Extract the function name from the component code
        const functionNameMatch = componentCode.match(/function\s+(\w+)/);
        const componentName = functionNameMatch ? functionNameMatch[1] : 'Component';
        
        // Create a wrapper that includes the component and returns it
        const fullCode = `
            const useState = React.useState;
            const useEffect = React.useEffect;
            const useRef = React.useRef;
            
            ${componentCode}
            
            const ComponentToRender = ${componentName};
        `;
        
        // Transform JSX to React.createElement calls using Babel
        const transformedCode = Babel.transform(fullCode, {
            presets: ['react']
        }).code;
        
        // Create a function that returns the component
        const createComponent = new Function('React', `
            ${transformedCode}
            return ComponentToRender;
        `);
        
        // Get the component
        const Component = createComponent(React);
        
        // Clear the container first
        previewContainer.innerHTML = '';
        
        // Create a div for React to render into
        const reactRoot = document.createElement('div');
        reactRoot.id = 'react-preview-root';
        previewContainer.appendChild(reactRoot);
        
        // Render using React 18 API
        const root = ReactDOM.createRoot(reactRoot);
        root.render(React.createElement(Component, StudioState.currentProps));
        
        // Show copy code button when component is rendered
        const copyBtn = document.getElementById('copy-code-btn');
        if (copyBtn) {
            copyBtn.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error rendering component:', error);
        console.error('Component details:', {
            id: StudioState.currentComponent?.id,
            name: StudioState.currentComponent?.name,
            category: StudioState.currentComponent?.category,
            code: StudioState.currentComponent?.code?.substring(0, 200) + '...'
        });
        
        previewContainer.innerHTML = `
            <div style="color: #ef4444; padding: 20px; text-align: center;">
                <div style="font-weight: 600; margin-bottom: 8px;">Error rendering ${StudioState.currentComponent?.name || 'component'}</div>
                <div style="font-size: 14px; opacity: 0.8; margin-bottom: 12px;">${error.message}</div>
                <div style="font-size: 12px; opacity: 0.6; background: rgba(239, 68, 68, 0.1); padding: 8px; border-radius: 4px; text-align: left; max-width: 400px; margin: 0 auto;">
                    Component: ${StudioState.currentComponent?.id}<br>
                    Category: ${StudioState.currentComponent?.category}<br>
                    Stack: ${error.stack?.split('\n')[0]}
                </div>
            </div>
        `;
        
        // Hide copy button on error
        const copyBtn = document.getElementById('copy-code-btn');
        if (copyBtn) {
            copyBtn.style.display = 'none';
        }
    }
}

// Copy generated code to clipboard
function copyGeneratedCode() {
    if (!StudioState.currentComponent) return;
    
    // Generate the component code
    const componentCode = generateComponentCode();
    
    // Copy to clipboard
    navigator.clipboard.writeText(componentCode).then(() => {
        // Update button text for feedback
        const btnText = document.getElementById('copy-btn-text');
        const originalText = btnText.textContent;
        btnText.textContent = '✓ Copied!';
        
        // Change button color temporarily
        const btn = document.getElementById('copy-code-btn');
        const originalBg = btn.style.background;
        btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
        
        // Reset after 2 seconds
        setTimeout(() => {
            btnText.textContent = originalText;
            btn.style.background = originalBg;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy code:', err);
        // Fallback - show code in alert
        alert('Copy failed. Here is your code:\n\n' + componentCode);
    });
}

// Make copy function globally available
window.copyGeneratedCode = copyGeneratedCode;

// Theme presets
const themePresets = {
    dark: {
        backgroundColor: '#0f172a',
        textColor: '#f8fafc',
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
        accentColor: '#22c55e',
        borderColor: '#334155'
    },
    light: {
        backgroundColor: '#ffffff',
        textColor: '#1e293b',
        primaryColor: '#3b82f6',
        secondaryColor: '#06b6d4',
        accentColor: '#10b981',
        borderColor: '#e2e8f0'
    },
    vibrant: {
        backgroundColor: '#fef3c7',
        textColor: '#7c2d12',
        primaryColor: '#dc2626',
        secondaryColor: '#f97316',
        accentColor: '#fbbf24',
        borderColor: '#fed7aa'
    },
    minimal: {
        backgroundColor: '#f8fafc',
        textColor: '#475569',
        primaryColor: '#64748b',
        secondaryColor: '#94a3b8',
        accentColor: '#cbd5e1',
        borderColor: '#e2e8f0'
    }
};

// Apply theme preset to current component
function applyTheme(themeName) {
    if (!StudioState.currentComponent) {
        showNotification('Please select a component first', 'warning');
        return;
    }
    
    const theme = themePresets[themeName];
    if (!theme) return;
    
    // Apply theme colors to current props
    const colorMappings = {
        backgroundColor: ['backgroundColor', 'bgColor', 'background'],
        textColor: ['textColor', 'color', 'fontColor'],
        primaryColor: ['primaryColor', 'brandColor', 'accentColor'],
        secondaryColor: ['secondaryColor', 'hoverColor'],
        accentColor: ['accentColor', 'highlightColor', 'activeColor'],
        borderColor: ['borderColor', 'strokeColor']
    };
    
    // Apply theme to component props
    for (const [themeKey, propNames] of Object.entries(colorMappings)) {
        for (const propName of propNames) {
            if (StudioState.currentProps.hasOwnProperty(propName)) {
                StudioState.currentProps[propName] = theme[themeKey];
            }
        }
    }
    
    // Update the preview and UI
    renderPreview();
    updatePropertyEditor();
    updateCodeBlock();
    
    // Show feedback
    showNotification(`${themeName.charAt(0).toUpperCase() + themeName.slice(1)} theme applied!`, 'success');
}

// Make theme function globally available
window.applyTheme = applyTheme;

// Revision system
function initRevisionSystem() {
    // Load existing revisions from localStorage
    const savedRevisions = localStorage.getItem('studio_revisions');
    if (savedRevisions) {
        StudioState.revisions = JSON.parse(savedRevisions);
        updateRevisionTimeline();
    }
}

function saveRevision(description = 'Change', changedProp = null) {
    if (!StudioState.currentComponent) return;
    
    // Detect what changed if not specified
    let changeDetails = {};
    let changeType = 'modify';
    
    if (StudioState.revisions.length === 0 || 
        (StudioState.revisions.length > 0 && 
         StudioState.revisions[StudioState.revisions.length - 1].componentId !== StudioState.currentComponent.id)) {
        changeType = 'new';
    } else if (changedProp) {
        changeDetails = { [changedProp]: StudioState.currentProps[changedProp] };
    } else if (StudioState.revisions.length > 0) {
        const lastRevision = StudioState.revisions[StudioState.revisions.length - 1];
        for (const key in StudioState.currentProps) {
            if (lastRevision.props[key] !== StudioState.currentProps[key]) {
                changeDetails[key] = {
                    from: lastRevision.props[key],
                    to: StudioState.currentProps[key]
                };
            }
        }
    }
    
    const revision = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        componentId: StudioState.currentComponent.id,
        componentName: StudioState.currentComponent.name,
        componentIcon: getComponentIcon(StudioState.currentComponent.category),
        props: { ...StudioState.currentProps },
        description,
        changeDetails,
        changeType,
        thumbnail: capturePreviewThumbnail(),
        starred: false,
        label: null
    };
    
    StudioState.revisions.push(revision);
    StudioState.currentRevision = StudioState.revisions.length - 1;
    
    // Keep only last 50 revisions (preserve starred ones)
    while (StudioState.revisions.length > 50) {
        const firstUnstarred = StudioState.revisions.findIndex(r => !r.starred);
        if (firstUnstarred >= 0 && firstUnstarred < StudioState.revisions.length - 10) {
            StudioState.revisions.splice(firstUnstarred, 1);
            if (StudioState.currentRevision > firstUnstarred) {
                StudioState.currentRevision--;
            }
        } else {
            break;
        }
    }
    
    // Save to localStorage
    localStorage.setItem('studio_revisions', JSON.stringify(StudioState.revisions));
    
    // Update UI
    updateRevisionTimeline();
}

function getComponentIcon(category) {
    const icons = {
        'navigation': '🧭',
        'buttons': '🔘',
        'cards': '🃏',
        'forms': '📝',
        'content': '📄',
        'headers': '🎯'
    };
    return icons[category] || '📦';
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now - then) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
}

function undoRevision() {
    if (StudioState.currentRevision > 0) {
        StudioState.currentRevision--;
        loadRevision(StudioState.currentRevision);
    }
}

function redoRevision() {
    if (StudioState.currentRevision < StudioState.revisions.length - 1) {
        StudioState.currentRevision++;
        loadRevision(StudioState.currentRevision);
    }
}

function toggleCompareMode() {
    // TODO: Implement comparison mode
    alert('Compare mode coming soon! Select two revisions to see differences.');
}

function exportRevisions() {
    const data = {
        exportDate: new Date().toISOString(),
        component: StudioState.currentComponent?.name || 'Unknown',
        revisions: StudioState.revisions,
        currentRevision: StudioState.currentRevision
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studio-revisions-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function toggleStarRevision(index) {
    if (StudioState.revisions[index]) {
        StudioState.revisions[index].starred = !StudioState.revisions[index].starred;
        localStorage.setItem('studio_revisions', JSON.stringify(StudioState.revisions));
        updateRevisionTimeline();
    }
}

function updateRevisionTimeline() {
    const revisionList = document.getElementById('revision-list');
    
    if (StudioState.revisions.length === 0) {
        revisionList.innerHTML = '<div class="text-gray-500 text-sm">No revisions yet</div>';
        return;
    }
    
    let html = '';
    StudioState.revisions.forEach((revision, index) => {
        const timeAgo = getTimeAgo(revision.timestamp);
        const changeCount = Object.keys(revision.changeDetails || {}).length;
        const firstChange = Object.keys(revision.changeDetails || {})[0];
        const changeText = firstChange ? formatPropertyLabel(firstChange) : revision.description;
        
        const revisionTooltip = `${revision.componentName || 'Component'} revision ${index + 1}\\nChanged: ${changeText}\\nCreated: ${timeAgo}\\nChanges: ${changeCount} properties`;
        
        html += `
            <div class="revision-item tooltip ${index === StudioState.currentRevision ? 'active' : ''} ${revision.starred ? 'starred' : ''}" 
                 data-revision-index="${index}" data-tooltip="${revisionTooltip}">
                <div class="revision-header">
                    <div class="revision-number">v${index + 1}</div>
                    <div class="revision-star tooltip" data-star-index="${index}" data-tooltip="Click to star/unstar this revision">
                        ${revision.starred ? '⭐' : '☆'}
                    </div>
                </div>
                <div class="revision-preview">
                    ${revision.componentIcon || '📦'}
                </div>
                <div class="revision-info">
                    <span class="revision-change">${changeText}</span>
                </div>
                <div class="revision-info" style="font-size: 8px;">
                    ${timeAgo}
                </div>
            </div>
        `;
    });
    
    revisionList.innerHTML = html;
    
    // Add click handlers
    revisionList.querySelectorAll('.revision-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Check if star was clicked
            if (e.target.classList.contains('revision-star')) {
                e.stopPropagation();
                const starIndex = parseInt(e.target.dataset.starIndex);
                toggleStarRevision(starIndex);
                return;
            }
            const index = parseInt(item.dataset.revisionIndex);
            restoreRevision(index);
        });
    });
}

function restoreRevision(index) {
    const revision = StudioState.revisions[index];
    if (!revision) return;
    
    // Find and select the component
    const component = StudioState.components.find(c => c.id === revision.componentId);
    if (component) {
        StudioState.currentComponent = component;
        StudioState.currentProps = { ...revision.props };
        StudioState.currentRevision = index;
        
        // Update UI
        document.querySelectorAll('.component-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-component-id="${revision.componentId}"]`)?.classList.add('selected');
        
        loadPropertyControls(component);
        renderPreview();
        updateRevisionTimeline();
    }
}

function capturePreviewThumbnail() {
    // For now, return a placeholder
    // In a real implementation, we'd use html2canvas or similar
    return 'thumbnail_placeholder';
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    document.getElementById('component-search').addEventListener('input', (e) => {
        const search = e.target.value.toLowerCase();
        document.querySelectorAll('.component-card').forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(search) ? 'block' : 'none';
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Undo: Cmd+Z or Ctrl+Z
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undoRevision();
        }
        // Redo: Cmd+Shift+Z or Ctrl+Shift+Z
        else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
            e.preventDefault();
            redoRevision();
        }
        // Save: Cmd+S or Ctrl+S
        else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            exportRevisions();
        }
    });
    
    // Revision control buttons
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const compareBtn = document.getElementById('compare-btn');
    const exportBtn = document.getElementById('export-btn');
    
    if (undoBtn) {
        undoBtn.addEventListener('click', undoRevision);
    }
    if (redoBtn) {
        redoBtn.addEventListener('click', redoRevision);
    }
    if (compareBtn) {
        compareBtn.addEventListener('click', toggleCompareMode);
    }
    if (exportBtn) {
        exportBtn.addEventListener('click', exportRevisions);
    }
    
    // Device selector
    document.querySelectorAll('.device-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const device = btn.dataset.device;
            const previewContainer = document.getElementById('preview-container');
            const previewArea = document.querySelector('.preview-area');
            
            // Remove any existing device classes
            previewContainer.classList.remove('device-mobile', 'device-tablet', 'device-desktop');
            
            if (device === 'mobile') {
                previewContainer.style.maxWidth = '375px';
                previewContainer.style.minWidth = '375px';
                previewContainer.style.width = '375px';
                previewContainer.classList.add('device-mobile');
                // Adjust padding for mobile view
                previewContainer.style.padding = '20px';
            } else if (device === 'tablet') {
                previewContainer.style.maxWidth = '768px';
                previewContainer.style.minWidth = '320px';
                previewContainer.style.width = '768px';
                previewContainer.classList.add('device-tablet');
                // Standard padding for tablet
                previewContainer.style.padding = '30px';
            } else {
                // Desktop - full width
                previewContainer.style.maxWidth = '100%';
                previewContainer.style.minWidth = '320px';
                previewContainer.style.width = 'auto';
                previewContainer.classList.add('device-desktop');
                // Larger padding for desktop
                previewContainer.style.padding = '40px';
            }
            
            // Re-render to ensure proper sizing
            if (StudioState.currentComponent) {
                setTimeout(() => renderPreview(), 50);
            }
        });
    });
    
    // Refresh preview
    document.getElementById('refresh-preview').addEventListener('click', () => {
        console.log('Refreshing preview...');
        
        // Clear and re-render
        const previewContainer = document.getElementById('preview-container');
        previewContainer.innerHTML = '<div class="loading-spinner" style="margin: 0 auto;"></div>';
        
        setTimeout(() => {
            renderPreview();
            
            // Re-apply any active effects
            const hoverEffect = document.getElementById('hover-effect').value;
            if (hoverEffect !== 'none') {
                applyHoverEffect(hoverEffect);
            }
            
            const glowEnabled = document.getElementById('enable-glow').checked;
            if (glowEnabled) {
                toggleGlowEffect(true);
            }
            
            // Visual feedback
            const btn = document.getElementById('refresh-preview');
            const originalText = btn.textContent;
            btn.textContent = '✓ Refreshed';
            btn.style.background = '#10b981';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 1000);
        }, 100);
    });
    
    // Export button
    document.getElementById('export-btn').addEventListener('click', () => {
        exportComponent();
    });
    
    // Animation controls
    document.getElementById('entrance-animation').addEventListener('change', (e) => {
        applyAnimation('entrance', e.target.value);
    });
    
    document.getElementById('hover-effect').addEventListener('change', (e) => {
        applyHoverEffect(e.target.value);
    });
    
    // Glow controls
    document.getElementById('enable-glow').addEventListener('change', (e) => {
        toggleGlowEffect(e.target.checked);
    });
    
    document.getElementById('glow-color').addEventListener('input', (e) => {
        updateGlowColor(e.target.value);
        // Sync with text input
        document.getElementById('glow-color-text').value = e.target.value;
    });
}

// Apply animations
function applyAnimation(type, animation) {
    const reactRoot = document.getElementById('react-preview-root');
    
    if (!reactRoot) {
        console.warn('No component rendered yet');
        return;
    }
    
    // Find the actual button or component element inside the root
    const componentElement = reactRoot.firstElementChild || reactRoot;
    
    if (type === 'entrance') {
        componentElement.style.animation = '';
        
        if (animation === 'fadeIn') {
            componentElement.style.animation = 'fadeIn 0.5s ease-out';
        } else if (animation === 'slideUp') {
            componentElement.style.animation = 'slideUp 0.5s ease-out';
        } else if (animation === 'scale') {
            componentElement.style.animation = 'scaleIn 0.5s ease-out';
        }
    }
    
    // Add CSS animations
    if (!document.getElementById('studio-animations')) {
        const style = document.createElement('style');
        style.id = 'studio-animations';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes scaleIn {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Apply hover effects
function applyHoverEffect(effect) {
    const reactRoot = document.getElementById('react-preview-root');
    
    if (!reactRoot) {
        console.warn('No component rendered yet');
        return;
    }
    
    // Find the actual button or component element inside the root
    const componentElement = reactRoot.firstElementChild || reactRoot;
    
    // Remove existing hover classes
    componentElement.classList.remove('hover-lift', 'hover-scale', 'hover-glow');
    
    // Add new hover class
    if (effect !== 'none') {
        componentElement.classList.add(`hover-${effect}`);
    }
    
    // Ensure hover styles exist
    if (!document.getElementById('studio-hover-styles')) {
        const style = document.createElement('style');
        style.id = 'studio-hover-styles';
        style.textContent = `
            .hover-lift {
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            .hover-lift:hover {
                transform: translateY(-4px);
                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
            }
            
            .hover-scale {
                transition: transform 0.3s ease;
            }
            .hover-scale:hover {
                transform: scale(1.05);
            }
            
            .hover-glow {
                transition: box-shadow 0.3s ease;
            }
            .hover-glow:hover {
                box-shadow: 0 0 20px rgba(139, 92, 246, 0.6);
            }
        `;
        document.head.appendChild(style);
    }
}

// Toggle glow effect
function toggleGlowEffect(enabled) {
    const reactRoot = document.getElementById('react-preview-root');
    
    if (!reactRoot) {
        console.warn('No component rendered yet');
        return;
    }
    
    // Find the actual button or component element inside the root
    const componentElement = reactRoot.firstElementChild || reactRoot;
    
    if (enabled) {
        const glowColor = document.getElementById('glow-color').value;
        componentElement.classList.add('has-glow');
        updateGlowColor(glowColor);
    } else {
        componentElement.classList.remove('has-glow');
        componentElement.style.boxShadow = '';
        componentElement.style.border = '';
    }
}

// Update glow color
function updateGlowColor(color) {
    const reactRoot = document.getElementById('react-preview-root');
    
    if (!reactRoot) {
        return;
    }
    
    // Find the actual button or component element inside the root
    const componentElement = reactRoot.firstElementChild || reactRoot;
    
    if (!componentElement.classList.contains('has-glow')) {
        return;
    }
    
    // Convert hex to rgba for better glow effect
    const r = parseInt(color.substr(1, 2), 16);
    const g = parseInt(color.substr(3, 2), 16);
    const b = parseInt(color.substr(5, 2), 16);
    
    // Apply multi-layer glow for better effect - tighter around the component
    componentElement.style.boxShadow = `
        0 0 8px rgba(${r}, ${g}, ${b}, 0.9),
        0 0 16px rgba(${r}, ${g}, ${b}, 0.7),
        0 0 24px rgba(${r}, ${g}, ${b}, 0.5),
        0 0 32px rgba(${r}, ${g}, ${b}, 0.3)
    `;
    
    // Add a subtle border for definition
    componentElement.style.border = `2px solid ${color}`;
    componentElement.style.borderRadius = '8px';
    componentElement.style.position = 'relative';
}

// Export component
function exportComponent() {
    if (!StudioState.currentComponent) {
        alert('Please select a component first');
        return;
    }
    
    // Generate the export code
    const exportCode = generateExportCode();
    
    // Copy to clipboard
    navigator.clipboard.writeText(exportCode).then(() => {
        // Show success message
        const btn = document.getElementById('export-btn');
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.style.background = '#10b981';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    });
}

function generateExportCode() {
    const component = StudioState.currentComponent;
    const props = StudioState.currentProps;
    
    // Generate clean component code
    let code = component.code.trim();
    
    // Add import statement
    code = `import React from 'react';\n\n${code}\n\nexport default ${component.name};`;
    
    return code;
}

// AI Integration Functions
async function generateComponentWithAI(description, componentType = 'button', style = 'modern') {
    const loadingEl = showLoadingState('Generating component with AI...');
    
    try {
        console.log('🔧 Frontend: Making API request to /api/component-ai/generate');
        const response = await fetch('/api/component-ai/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                description,
                componentType,
                style
            })
        });
        
        console.log('🔧 Frontend: Response status:', response.status, response.statusText);
        console.log('🔧 Frontend: Response ok:', response.ok);
        
        const result = await response.json();
        console.log('🔧 Frontend: Parsed result:', result);
        
        if (result.success && result.component) {
            // Create a new component object
            const newComponent = {
                id: `ai-generated-${Date.now()}`,
                name: result.source === 'fallback' ? `${componentType} (Fallback)` : `AI ${componentType}`,
                category: 'ai-generated',
                description: result.source === 'fallback' ? `Fallback: ${description}` : `AI Generated: ${description}`,
                code: result.component,
                props: extractPropsFromCode(result.component)
            };
            
            // Add to components list
            ComponentLibrary['ai-generated'] = ComponentLibrary['ai-generated'] || [];
            ComponentLibrary['ai-generated'].push(newComponent);
            console.log('🔧 Frontend: Added component to library:', newComponent);
            console.log('🔧 Frontend: AI-generated components:', ComponentLibrary['ai-generated']);
            console.log('🔧 Frontend: Total AI components now:', ComponentLibrary['ai-generated'].length);
            
            // Refresh the component list FIRST before selecting
            console.log('🔧 Frontend: Refreshing component library...');
            loadComponentLibrary();
            
            // Use setTimeout to ensure DOM is updated before selecting
            setTimeout(() => {
                console.log('🔧 Frontend: Selecting new component:', newComponent.id);
                selectComponent(newComponent.id);
            }, 100);
            
            if (result.source === 'fallback') {
                showSuccessMessage(`Component generated using fallback template! ${result.message || ''}`);
            } else {
                showSuccessMessage(`Component generated successfully! (${result.source || 'AI'})`);
            }
            
            if (result.message) {
                console.log('AI Generation:', result.message);
            }
        } else {
            throw new Error(result.error || 'AI generation failed');
        }
        
    } catch (error) {
        console.error('AI Generation Error:', error);
        showErrorMessage('AI generation failed. Please try again.');
        
        // Show fallback component if available
        if (error.fallback) {
            const fallbackComponent = {
                id: `fallback-${Date.now()}`,
                name: `Fallback ${componentType}`,
                category: 'ai-generated',
                description: `Fallback component: ${description}`,
                code: error.fallback,
                props: extractPropsFromCode(error.fallback)
            };
            
            selectComponent(fallbackComponent);
        }
    } finally {
        hideLoadingState(loadingEl);
    }
}

async function enhanceComponentWithAI(enhancementRequest) {
    if (!StudioState.currentComponent) {
        showErrorMessage('Please select a component first');
        return;
    }
    
    const loadingEl = showLoadingState('Enhancing component with AI...');
    
    try {
        const response = await fetch('/api/component-ai/enhance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                componentCode: StudioState.currentComponent.code,
                enhancementRequest
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showEnhancementSuggestions(result.enhancements);
            showSuccessMessage(`Enhancement suggestions generated! (${result.source})`);
        } else {
            throw new Error(result.error || 'Enhancement generation failed');
        }
        
    } catch (error) {
        console.error('AI Enhancement Error:', error);
        showErrorMessage('AI enhancement failed. Please try again.');
    } finally {
        hideLoadingState(loadingEl);
    }
}

function extractPropsFromCode(componentCode) {
    // Simple prop extraction - look for default parameter values
    const propRegex = /(\w+)\s*=\s*([^,}]+)/g;
    const props = {};
    let match;
    
    while ((match = propRegex.exec(componentCode)) !== null) {
        const propName = match[1];
        const defaultValue = match[2].replace(/['"]/g, '').trim();
        
        // Determine prop type based on default value
        let type = 'string';
        if (defaultValue === 'true' || defaultValue === 'false') {
            type = 'boolean';
        } else if (defaultValue.startsWith('#')) {
            type = 'color';
        } else if (!isNaN(parseFloat(defaultValue))) {
            type = 'number';
        }
        
        props[propName] = {
            type,
            default: defaultValue,
            section: 'Generated'
        };
    }
    
    return props;
}

function showLoadingState(message) {
    const loadingEl = document.createElement('div');
    loadingEl.className = 'ai-loading-overlay';
    loadingEl.innerHTML = `
        <div class="ai-loading-content">
            <div class="loading-spinner"></div>
            <p>${message}</p>
        </div>
    `;
    loadingEl.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
    `;
    
    const content = loadingEl.querySelector('.ai-loading-content');
    content.style.cssText = `
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        color: var(--text-primary);
        backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(loadingEl);
    return loadingEl;
}

function hideLoadingState(loadingEl) {
    if (loadingEl && loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
    }
}

function showSuccessMessage(message) {
    showNotification(message, 'success');
}

function showErrorMessage(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10001;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        ${type === 'success' ? 'background: #10b981;' : 'background: #ef4444;'}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

function showEnhancementSuggestions(enhancements) {
    const modal = document.createElement('div');
    modal.className = 'enhancement-modal';
    modal.innerHTML = `
        <div class="enhancement-modal-content">
            <div class="enhancement-modal-header">
                <h3>AI Enhancement Suggestions</h3>
                <button class="enhancement-modal-close">&times;</button>
            </div>
            <div class="enhancement-modal-body">
                ${generateEnhancementHTML(enhancements)}
            </div>
        </div>
    `;
    
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
    `;
    
    const content = modal.querySelector('.enhancement-modal-content');
    content.style.cssText = `
        background: var(--bg-secondary);
        border: 1px solid var(--glass-border);
        border-radius: 15px;
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        color: var(--text-primary);
    `;
    
    const header = modal.querySelector('.enhancement-modal-header');
    header.style.cssText = `
        padding: 20px;
        border-bottom: 1px solid var(--glass-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    const body = modal.querySelector('.enhancement-modal-body');
    body.style.cssText = `
        padding: 20px;
    `;
    
    const closeBtn = modal.querySelector('.enhancement-modal-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    document.body.appendChild(modal);
}

function generateEnhancementHTML(enhancements) {
    let html = '';
    
    if (enhancements.newProps && enhancements.newProps.length > 0) {
        html += `
            <div class="enhancement-section">
                <h4>💡 Suggested New Props</h4>
                <ul>
                    ${enhancements.newProps.map(prop => `
                        <li><strong>${prop.name}</strong> (${prop.type}): ${prop.description}</li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    if (enhancements.styleImprovements && enhancements.styleImprovements.length > 0) {
        html += `
            <div class="enhancement-section">
                <h4>🎨 Style Improvements</h4>
                <ul>
                    ${enhancements.styleImprovements.map(improvement => `<li>${improvement}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    if (enhancements.accessibilityTips && enhancements.accessibilityTips.length > 0) {
        html += `
            <div class="enhancement-section">
                <h4>♿ Accessibility Tips</h4>
                <ul>
                    ${enhancements.accessibilityTips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    if (enhancements.performanceTips && enhancements.performanceTips.length > 0) {
        html += `
            <div class="enhancement-section">
                <h4>⚡ Performance Tips</h4>
                <ul>
                    ${enhancements.performanceTips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    return html;
}

// Vibe Recipe definitions - purpose-driven component combinations
const vibeRecipes = {
    // Quick Vibes - Ship fast with confidence
    'ship-today': {
        name: "Ship Today",
        vibe: "fast",
        timeToShip: "30 seconds",
        confidence: "95% loved by users",
        description: "Landing page ready in 30 seconds",
        components: [
            { type: 'nav-navbar', props: { brandName: 'Launch Fast', backgroundColor: '#ffffff', brandColor: '#6366f1' } },
            { type: 'hero-gradient', props: { title: 'Ship Your Ideas Today', subtitle: 'Stop overthinking. Start shipping.', bgColor: '#6366f1' } },
            { type: 'feature-grid', props: { title: 'Why Choose Us', darkMode: 'false' } },
            { type: 'footer-basic', props: { companyName: 'ShipFast Inc', darkMode: 'false' } }
        ],
        variations: {
            minimal: { primaryColor: '#000000', style: 'clean' },
            balanced: { primaryColor: '#6366f1', style: 'modern' },
            bold: { primaryColor: '#ec4899', style: 'vibrant' }
        }
    },
    'show-tell': {
        name: "Show & Tell",
        vibe: "creative",
        timeToShip: "45 seconds",
        confidence: "Perfect for portfolios",
        description: "Portfolio to show off your work",
        components: [
            { type: 'nav-navbar', props: { brandName: 'Portfolio', backgroundColor: '#0a0a0a', brandColor: '#8b5cf6', linkColor: '#ffffff' } },
            { type: 'hero-gradient', props: { title: 'Creative Developer', subtitle: 'Building digital experiences', bgColor: '#8b5cf6' } },
            { type: 'card-glass', props: { title: 'Featured Project', content: 'Award-winning design', darkMode: 'true' } },
            { type: 'stats-display', props: { title: 'Impact', darkMode: 'true' } }
        ]
    },
    'get-paid': {
        name: "Get Paid",
        vibe: "professional",
        timeToShip: "1 minute",
        confidence: "Converts at 12%",
        description: "Professional service/consulting page",
        components: [
            { type: 'nav-navbar', props: { brandName: 'Consulting', backgroundColor: '#ffffff', brandColor: '#059669', buttonBackgroundColor: '#059669' } },
            { type: 'hero-gradient', props: { title: 'Expert Consulting Services', subtitle: 'Transform your business with proven strategies', bgColor: '#059669' } },
            { type: 'form-contact', props: { title: 'Get Started', darkMode: 'false' } },
            { type: 'stats-display', props: { title: 'Client Success', darkMode: 'false' } }
        ]
    },
    
    // Product Vibes - Launch your next big thing
    'launch-tomorrow': {
        name: "Launch Tomorrow",
        vibe: "hype",
        timeToShip: "1 minute",
        confidence: "Product Hunt ready",
        description: "Product Hunt ready page",
        components: [
            { type: 'nav-navbar', props: { title: '🚀 Launching Soon', darkMode: 'false', bgColor: '#ffffff' } },
            { type: 'hero-gradient', props: { title: 'The Future of Work', subtitle: 'Join 10,000+ early adopters', bgColor: '#f59e0b' } },
            { type: 'alert-banner', props: { message: '🎉 #1 Product of the Day on Product Hunt!', type: 'success' } },
            { type: 'form-signup', props: { title: 'Get Early Access', darkMode: 'false' } }
        ]
    },
    'saas-classic': {
        name: "SaaS Classic",
        vibe: "trusted",
        timeToShip: "45 seconds",
        confidence: "Stripe-inspired",
        description: "Clean, professional SaaS design",
        components: [
            { type: 'nav-navbar', props: { title: 'SaaS Pro', darkMode: 'false', bgColor: '#ffffff' } },
            { type: 'hero-gradient', props: { title: 'Enterprise-Ready Platform', subtitle: 'Trusted by Fortune 500 companies', bgColor: '#6366f1' } },
            { type: 'feature-grid', props: { title: 'Platform Features', darkMode: 'false' } },
            { type: 'stats-display', props: { title: 'By the Numbers', darkMode: 'false' } }
        ]
    },
    'api-docs': {
        name: "API Docs",
        vibe: "developer",
        timeToShip: "2 minutes",
        confidence: "Developer approved",
        description: "Developer-friendly documentation",
        components: [
            { type: 'nav-sidebar', props: { title: 'API Docs', darkMode: 'true' } },
            { type: 'search-bar', props: { placeholder: 'Search documentation...', darkMode: 'true' } },
            { type: 'data-table', props: { title: 'API Endpoints', darkMode: 'true' } },
            { type: 'code-block', props: { title: 'Quick Start', language: 'javascript', darkMode: 'true' } }
        ]
    },
    
    // Commerce Vibes - Start selling immediately
    'sell-anything': {
        name: "Sell Anything",
        vibe: "clean",
        timeToShip: "1 minute",
        confidence: "High conversion",
        description: "Clean product showcase",
        components: [
            { type: 'nav-navbar', props: { title: 'Store', darkMode: 'false', bgColor: '#ffffff' } },
            { type: 'hero-gradient', props: { title: 'Premium Products', subtitle: 'Curated for quality', bgColor: '#10b981' } },
            { type: 'card-product', props: { productName: 'Featured Item', price: '$149', darkMode: 'false' } },
            { type: 'alert-banner', props: { message: 'Free shipping worldwide', type: 'info' } }
        ]
    },
    'drop-shop': {
        name: "Drop Shop",
        vibe: "exclusive",
        timeToShip: "1 minute", 
        confidence: "Creates urgency",
        description: "Limited edition/exclusive vibe",
        components: [
            { type: 'nav-navbar', props: { title: 'DROP', darkMode: 'true', bgColor: '#000000' } },
            { type: 'hero-gradient', props: { title: 'Limited Drop', subtitle: 'Only 100 available', bgColor: '#dc2626' } },
            { type: 'countdown-timer', props: { title: 'Drop Ends In', darkMode: 'true' } },
            { type: 'card-product', props: { productName: 'Exclusive Edition', price: '$999', darkMode: 'true' } }
        ]
    },
    'digital-goods': {
        name: "Digital Goods",
        vibe: "modern",
        timeToShip: "1 minute",
        confidence: "Perfect for creators",
        description: "Courses/downloads/NFTs",
        components: [
            { type: 'nav-navbar', props: { title: 'Digital Store', darkMode: 'false', bgColor: '#ffffff' } },
            { type: 'hero-gradient', props: { title: 'Digital Downloads', subtitle: 'Instant access to premium content', bgColor: '#8b5cf6' } },
            { type: 'card-glass', props: { title: 'Premium Course', content: '$49 - Lifetime Access', darkMode: 'false' } },
            { type: 'form-checkout', props: { title: 'Secure Checkout', darkMode: 'false' } }
        ]
    }
};

// Keep old recipes for backwards compatibility
const componentRecipes = vibeRecipes;

// Show recipe category
function showRecipeCategory(category) {
    // Hide all categories
    document.querySelectorAll('.recipe-category').forEach(cat => {
        cat.style.display = 'none';
    });
    
    // Show selected category
    const categoryMap = {
        'quick': 'quick-vibes',
        'product': 'product-vibes',
        'commerce': 'commerce-vibes'
    };
    
    const categoryEl = document.getElementById(categoryMap[category]);
    if (categoryEl) {
        categoryEl.style.display = 'grid';
    }
    
    // Update tab styles
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
        tab.style.background = 'var(--glass-bg)';
        tab.style.color = 'var(--text-primary)';
        tab.style.border = '1px solid var(--glass-border)';
    });
    
    // Use the button that was clicked, not event.target
    const activeTab = document.querySelector(`.category-tab[onclick*="${category}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.style.background = 'var(--accent-primary)';
        activeTab.style.color = 'white';
        activeTab.style.border = 'none';
    }
}

// Shuffle current vibe - randomize colors while keeping good design
function shuffleVibe() {
    if (!StudioState.currentComponent) {
        // If no component selected, generate a random recipe
        const recipeKeys = Object.keys(vibeRecipes);
        const randomRecipe = recipeKeys[Math.floor(Math.random() * recipeKeys.length)];
        generateRecipe(randomRecipe);
        return;
    }
    
    // Shuffle colors for current component
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Apply to relevant color properties
    if (StudioState.currentProps.bgColor) {
        StudioState.currentProps.bgColor = randomColor;
    }
    if (StudioState.currentProps.primaryColor) {
        StudioState.currentProps.primaryColor = randomColor;
    }
    
    renderPreview();
    showNotification('Vibe shuffled! 🎲', 'success');
}

// Surprise me - generate something unexpected
function surpriseMe() {
    const surpriseRecipes = [
        { recipe: 'drop-shop', message: '🔥 Limited drop vibe incoming!' },
        { recipe: 'launch-tomorrow', message: '🚀 Product Hunt ready!' },
        { recipe: 'show-tell', message: '🎨 Creative portfolio mode!' },
        { recipe: 'api-docs', message: '📚 Developer documentation style!' }
    ];
    
    const surprise = surpriseRecipes[Math.floor(Math.random() * surpriseRecipes.length)];
    generateRecipe(surprise.recipe);
    
    setTimeout(() => {
        showNotification(surprise.message, 'success');
    }, 500);
}

// Generate recipe function with vibe awareness
function generateRecipe(recipeType) {
    try {
        const recipe = vibeRecipes[recipeType] || componentRecipes[recipeType];
        if (!recipe) {
            showNotification('Recipe not found', 'error');
            return;
        }
        
        console.log(`🎨 Generating ${recipe.name} - ${recipe.vibe} vibe`);
        
        // Show confidence indicator
        if (recipe.confidence) {
            console.log(`✨ ${recipe.confidence}`);
        }
        
        // Clear any existing state first
        StudioState.currentComponent = null;
        StudioState.currentProps = {};
        
        // Clear the preview
        const previewContainer = document.getElementById('preview-container');
        if (previewContainer) {
            previewContainer.innerHTML = '';
            previewContainer.classList.remove('has-component');
        }
        
        // Generate the first component in the recipe
        if (recipe.components.length > 0) {
            const firstComponent = recipe.components[0];
            
            // Use a slight delay to ensure UI updates
            setTimeout(() => {
                generateComponentFromRecipe(firstComponent.type, firstComponent.props);
            }, 50);
        }
        
        // Show vibe-aware notification
        const vibeEmoji = {
            fast: '⚡',
            creative: '🎨',
            professional: '💼',
            hype: '🚀',
            trusted: '✨',
            developer: '👨‍💻',
            clean: '🧹',
            exclusive: '🔥',
            modern: '💎'
        };
        
        const emoji = vibeEmoji[recipe.vibe] || '✨';
        showNotification(`${emoji} ${recipe.name} ready! (${recipe.timeToShip || '30s'})`, 'success');
        
    } catch (error) {
        console.error('Recipe generation error:', error);
        showNotification('Error generating recipe', 'error');
    }
}

// Generate component from recipe
function generateComponentFromRecipe(componentId, props) {
    console.log('🔧 Looking for component:', componentId);
    console.log('🔧 Available components:', StudioState.components.map(c => c.id));
    
    // Find component in StudioState.components (which is populated from ComponentLibrary)
    const component = StudioState.components.find(comp => comp.id === componentId);
    
    if (!component) {
        console.error(`❌ Component ${componentId} not found in StudioState.components`);
        console.log('🔧 Attempting to reload component library...');
        
        // Force reload the component library
        loadComponentLibrary();
        
        // Try again after reload
        setTimeout(() => {
            const reloadedComponent = StudioState.components.find(comp => comp.id === componentId);
            if (reloadedComponent) {
                console.log('✅ Found after reload:', componentId);
                selectComponent(componentId);
                if (props) {
                    setTimeout(() => applyPropsToComponent(props), 100);
                }
            } else {
                console.error('❌ Still not found after reload:', componentId);
                showNotification(`Component ${componentId} not found`, 'error');
            }
        }, 100);
        return;
    }
    
    console.log('✅ Found component, selecting:', component.id);
    
    // Select the component to load it
    selectComponent(component.id);
    
    // Apply custom props if provided
    if (props) {
        setTimeout(() => {
            applyPropsToComponent(props);
        }, 100);
    }
}

// Apply props to the currently selected component
function applyPropsToComponent(props) {
    console.log('🔧 Applying props:', props);
    console.log('🔧 Current component:', StudioState.currentComponent?.name);
    console.log('🔧 Available component props:', Object.keys(StudioState.currentComponent?.props || {}));
    
    if (!StudioState.currentComponent) {
        console.warn('🔧 No current component to apply props to');
        return;
    }
    
    for (const [propName, propValue] of Object.entries(props)) {
        if (StudioState.currentComponent.props && StudioState.currentComponent.props[propName]) {
            console.log(`🔧 Setting ${propName} = ${propValue}`);
            StudioState.currentProps[propName] = propValue;
            
            // Update the property input if it exists
            const input = document.querySelector(`[data-prop="${propName}"]`);
            if (input) {
                input.value = propValue;
                input.dispatchEvent(new Event('change'));
            }
        } else {
            console.warn(`🔧 Property ${propName} not found in component props`);
        }
    }
    
    console.log('🔧 Final props applied:', StudioState.currentProps);
    
    // Trigger a re-render
    renderPreview();
}

// Find component by ID in the library
function findComponentById(componentId) {
    for (const category of Object.values(ComponentLibrary)) {
        const component = category.find(comp => comp.id === componentId);
        if (component) return component;
    }
    return null;
}

// Initialize AI generation event listeners
function initializeAIFeatures() {
    // AI Component Generation
    const generateBtn = document.getElementById('generate-ai-component');
    const enhanceBtn = document.getElementById('enhance-component');
    const descriptionInput = document.getElementById('ai-description');
    const componentTypeSelect = document.getElementById('ai-component-type');
    
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const description = descriptionInput.value.trim();
            const componentType = componentTypeSelect.value;
            
            if (!description) {
                showErrorMessage('Please describe the component you want to generate');
                return;
            }
            
            await generateComponentWithAI(description, componentType, 'modern');
        });
    }
    
    if (enhanceBtn) {
        enhanceBtn.addEventListener('click', async () => {
            const enhancementRequest = prompt('What would you like to enhance about this component?');
            if (enhancementRequest) {
                await enhanceComponentWithAI(enhancementRequest);
            }
        });
    }
    
    // Allow Enter key to trigger generation
    if (descriptionInput) {
        descriptionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                generateBtn.click();
            }
        });
    }
}

// Add CSS animations for notifications
function addNotificationAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .enhancement-section {
            margin-bottom: 20px;
            padding: 15px;
            background: rgba(139, 92, 246, 0.05);
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 8px;
        }
        
        .enhancement-section h4 {
            margin-bottom: 10px;
            color: var(--accent-primary);
            font-size: 16px;
        }
        
        .enhancement-section ul {
            list-style: none;
            margin: 0;
            padding: 0;
        }
        
        .enhancement-section li {
            margin-bottom: 8px;
            padding-left: 16px;
            position: relative;
            line-height: 1.4;
        }
        
        .enhancement-section li::before {
            content: '•';
            color: var(--accent-secondary);
            position: absolute;
            left: 0;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
}

// Combined initialization moved to main DOMContentLoaded handler above

// Track recently used templates
function trackRecentTemplate(recipeId, recipeName) {
    let recentTemplates = JSON.parse(localStorage.getItem('recentTemplates') || '[]');
    
    // Remove if already exists (to move to front)
    recentTemplates = recentTemplates.filter(t => t.id !== recipeId);
    
    // Add to front
    recentTemplates.unshift({ id: recipeId, name: recipeName, timestamp: Date.now() });
    
    // Keep only last 3
    recentTemplates = recentTemplates.slice(0, 3);
    
    // Save to localStorage
    localStorage.setItem('recentTemplates', JSON.stringify(recentTemplates));
    
    // Update UI
    updateRecentTemplates();
}

// Update recent templates UI
function updateRecentTemplates() {
    const recentTemplates = JSON.parse(localStorage.getItem('recentTemplates') || '[]');
    const container = document.getElementById('recent-templates');
    const list = document.getElementById('recent-templates-list');
    
    if (!container || !list) return;
    
    if (recentTemplates.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    list.innerHTML = '';
    
    recentTemplates.forEach(template => {
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.onclick = () => generateRecipe(template.id);
        btn.style.cssText = `
            background: rgba(51, 65, 85, 0.5);
            border: 1px solid #475569;
            color: #cbd5e1;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        btn.onmouseover = () => {
            btn.style.background = 'rgba(71, 85, 105, 0.7)';
            btn.style.borderColor = '#64748b';
        };
        btn.onmouseout = () => {
            btn.style.background = 'rgba(51, 65, 85, 0.5)';
            btn.style.borderColor = '#475569';
        };
        btn.textContent = template.name;
        list.appendChild(btn);
    });
}

// Store original function reference to avoid circular calls
const originalGenerateRecipe = generateRecipe;

// Enhanced generateRecipe with debug logging
function generateRecipeWithDebug(recipeType) {
    console.log('🔥 Button clicked for recipe:', recipeType);
    console.log('🔥 Recipe exists:', !!vibeRecipes[recipeType]);
    console.log('🔥 Current component before:', StudioState.currentComponent?.name);
    
    try {
        // Track recently used template
        const recipe = vibeRecipes[recipeType];
        if (recipe) {
            trackRecentTemplate(recipeType, recipe.name);
        }
        
        const result = originalGenerateRecipe(recipeType);
        console.log('🔥 Current component after:', StudioState.currentComponent?.name);
        console.log('🔥 Recipe generation completed successfully');
        
        // Add visual feedback - pulse the preview
        const preview = document.getElementById('preview-container');
        if (preview) {
            preview.style.transition = 'all 0.3s ease';
            preview.style.transform = 'scale(1.02)';
            preview.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.5)';
            setTimeout(() => {
                preview.style.transform = 'scale(1)';
                preview.style.boxShadow = 'none';
            }, 300);
        }
        
        return result;
    } catch (error) {
        console.error('🔥 Detailed error in generateRecipeWithDebug:', error);
        console.error('🔥 Error stack:', error.stack);
        showNotification(`Recipe generation failed: ${error.message}`, 'error');
    }
}

// Make vibe functions globally accessible
window.showRecipeCategory = showRecipeCategory;
window.generateRecipe = generateRecipeWithDebug;
window.shuffleVibe = shuffleVibe;
window.surpriseMe = surpriseMe;
window.vibeRecipes = vibeRecipes; // For debugging

// Log studio ready
console.log('✨ Magic UI Component Studio loaded with AI capabilities - VERSION 2025-08-19-22:45');