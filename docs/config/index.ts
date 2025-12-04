export default {
  /**
   * Nextra metadata configuration
   * @see https://nextra.vercel.app/docs/metadata
   */
  metadata: {
    title: {
      default: 'ZAUNCHPAD Documentation',
      template: '%s | ZAUNCHPAD Docs',
    },
    description: 'Privacy-first cross-chain token launchpad enabling anonymous participation in crypto token launches using Zcash shielded pools. Create, launch, and manage tokens across multiple blockchains with zero-knowledge proofs.',
    metadataBase: new URL('https://docs.zaunchpad.com/'),
    keywords: [
      'token launch',
      'cryptocurrency',
      'blockchain',
      'privacy',
      'anonymous',
      'Zcash',
      'zero-knowledge',
      'Solana',
      'NEAR',
      'cross-chain',
      'DeFi',
      'token creation',
      'IDO',
      'web3',
      'decentralized',
      'Meteora',
      'NEAR Intents',
      'OFT',
    ],
    generator: 'Next.js',
    applicationName: 'ZAUNCHPAD',
    appleWebApp: {
      title: 'ZAUNCHPAD',
    },
    openGraph: {
      url: './',
      siteName: 'ZAUNCHPAD',
      locale: 'en_US',
      type: 'website',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: 'ZAUNCHPAD - Privacy-first cross-chain token launch platform',
        },
      ],
    },
    other: {
      'msapplication-TileColor': '#000000',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@zaunchpad',
      creator: '@zaunchpad',
      images: ['/og-image.png'],
    },
    alternates: {
      canonical: './',
    },
  },
  /**
   * Nextra Layout component configuration
   */
  nextraLayout: {
    docsRepositoryBase: 'https://github.com/zaunchpad/zaunchpad/tree/main/docs/',
    sidebar: {
      defaultMenuCollapseLevel: 1,
    },
  },
  /**
   * Main Layout head configuration
   */
  head: {
    mantine: {
      defaultColorScheme: 'dark',
      nonce: '8IBTHwOdqNKAWeKl7plt8g==',
    },
  },
  /**
   * GitHub API configuration
   * @see https://docs.github.com/en/rest/reference/repos#releases
   */
  gitHub: {
    repo: 'zaunchpad/zaunchpad',
    apiUrl: 'https://api.github.com',
    releasesUrl: 'https://api.github.com/repos/zaunchpad/zaunchpad/releases',
  },

  /**
   * Release notes configuration
   */
  releaseNotes: {
    url: 'https://github.com/zaunchpad/zaunchpad/releases',
    maxReleases: 10,
  },

  /**
   * Search configuration (for pagefind)
   * @see /app/api/search/route.ts
   */
  search: {
    queryKeyword: 'q',
    minQueryLength: 3,
    limitKeyword: 'limit',
    defaultMaxResults: 5,
    excerptLengthKeyword: 'excerptLength',
    defaultExcerptLength: 30,
    defaultLanguage: 'en',
  },
} as const;
