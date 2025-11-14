import React from 'react';
import { DocsThemeConfig } from 'nextra-theme-docs';
import { useRouter } from 'next/router';

const config: DocsThemeConfig = {
  logo: (
    <div className="flex items-center gap-2">
      <img src="/Coder1-Logo-Sharp.svg" alt="Coder1" className="h-[4.6rem]" />
    </div>
  ),
  navbar: {
    extraContent: (
      <a
        href="http://localhost:3001/ide"
        className="nx-text-sm nx-font-medium nx-text-gray-500 hover:nx-text-gray-900 dark:nx-text-gray-400 dark:hover:nx-text-gray-100 nx-transition-colors nx-px-3 nx-py-1.5 nx-rounded-md nx-border nx-border-cyan-500 hover:nx-border-orange-500 hover:nx-shadow-lg"
        style={{
          boxShadow: '0 0 12px rgba(0, 217, 255, 0.5)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 0 20px rgba(251, 146, 60, 0.7)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 217, 255, 0.5)';
        }}
      >
        ← Back to IDE
      </a>
    )
  },
  project: {
    link: 'https://github.com/MichaelrKraft/coder1-ide',
  },
  chat: {
    link: 'https://discord.gg/coder1',
  },
  docsRepositoryBase: 'https://github.com/MichaelrKraft/coder1-ide/tree/main/coder1-ide-next/docs',
  footer: {
    text: (
      <div className="flex w-full flex-col items-center sm:items-start">
        <div className="mb-2 flex items-center gap-2">
          <img src="/Coder1-Logo-Sharp.svg" alt="Coder1" className="h-12" />
        </div>
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} Coder1. The only AI IDE that costs nothing and forgets nothing.
        </p>
      </div>
    ),
  },
  head: () => {
    const { asPath, defaultLocale, locale } = useRouter();
    const url =
      'https://docs.coder1.ai' +
      (defaultLocale === locale ? asPath : `/${locale}${asPath}`);
 
    return (
      <>
        <meta property="og:url" content={url} />
        <meta property="og:title" content="Coder1 IDE Documentation" />
        <meta property="og:description" content="The only AI IDE that costs nothing and forgets nothing. Built for Claude Code." />
        <meta name="description" content="Coder1 IDE - Official documentation for the AI-powered development environment built for Claude Code." />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@Coder1IDE" />
        <link rel="icon" href="/favicon.ico" />
      </>
    );
  },
  useNextSeoProps() {
    const { asPath } = useRouter();
    if (asPath !== '/') {
      return {
        titleTemplate: '%s – Coder1 Docs'
      };
    }
    return {
      titleTemplate: 'Coder1 IDE Documentation'
    };
  },
  primaryHue: 210, // Blue hue matching Coder1
  darkMode: true,
  nextThemes: {
    defaultTheme: 'dark',
    forcedTheme: 'dark'
  },
  sidebar: {
    titleComponent({ title, type }) {
      if (type === 'separator') {
        return <div className="text-xs font-bold uppercase text-gray-500 mt-4 mb-2">{title}</div>;
      }
      return <>{title}</>;
    },
    defaultMenuCollapseLevel: 1,
    toggleButton: true
  },
  toc: {
    float: true,
    title: 'On This Page',
    backToTop: true
  },
  editLink: {
    text: 'Edit this page on GitHub →'
  },
  feedback: {
    content: 'Question? Give us feedback →',
    labels: 'feedback'
  },
  navigation: {
    prev: true,
    next: true
  },
  gitTimestamp: ({ timestamp }) => (
    <div className="text-xs text-gray-500">
      Last updated: {timestamp.toLocaleDateString()}
    </div>
  ),
  banner: {
    key: 'alpha-release',
    text: (
      <a href="https://coder1.ai" target="_blank">
        🎉 Coder1 IDE is now in Alpha! Try it free →
      </a>
    )
  }
};

export default config;
