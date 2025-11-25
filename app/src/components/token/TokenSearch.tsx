"use client"

import { X } from "lucide-react";
import { TokenCardSkeleton } from "@/components/TokenCardSkeleton";
import { NoTokensFound } from "@/components/NoTokensFound";
import ExploreTokenCard from "@/components/ExploreTokenCard";
import { useState, useMemo } from "react";
import { TAG_OPTIONS, TAG_ICONS } from "@/components/modal/TagsSelectModal";
import type { Token } from "@/types/api";

type TimeRangeType = "all" | "24h" | "7d" | "30d" | "90d" | "custom";

// Dummy token data
const DUMMY_TOKENS: Token[] = [
  {
    id: "1",
    name: "Ghost Protocol",
    symbol: "GHST",
    description: "A decentralized VPN and mixnet built on Solana with Zcash-based subscription payments.",
    totalSupply: "1000000000",
    decimals: 9,
    mintAddress: "So11111111111111111111111111111111111111112",
    owner: "11111111111111111111111111111111",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ["privacy", "vpn"],
    metadata: {
      tokenUri: "https://via.placeholder.com/100",
      bannerUri: "https://via.placeholder.com/400x200",
      website: "https://ghostprotocol.io",
      twitter: "https://twitter.com/ghostprotocol",
      telegram: "https://t.me/ghostprotocol",
      metadataUri: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    dbcConfig: {} as any,
  },
  {
    id: "2",
    name: "DarkFi DEX",
    symbol: "DARK",
    description: "First completely anonymous AMM using MPC and threshold signatures.",
    totalSupply: "500000000",
    decimals: 9,
    mintAddress: "So11111111111111111111111111111111111111113",
    owner: "11111111111111111111111111111111",
    status: "active",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ["defi", "dex"],
    metadata: {
      tokenUri: "https://via.placeholder.com/100",
      bannerUri: "https://via.placeholder.com/400x200",
      website: "https://darkfi.com",
      twitter: "https://twitter.com/darkfi",
      telegram: "https://t.me/darkfi",
      metadataUri: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    dbcConfig: {} as any,
  },
  {
    id: "3",
    name: "ZeroMail",
    symbol: "ZMAIL",
    description: "Encrypted, metadata-free email service stored on Arweave.",
    totalSupply: "2000000000",
    decimals: 9,
    mintAddress: "So11111111111111111111111111111111111111114",
    owner: "11111111111111111111111111111111",
    status: "ended",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ["privacy", "communication"],
    metadata: {
      tokenUri: "https://via.placeholder.com/100",
      bannerUri: "https://via.placeholder.com/400x200",
      website: "https://zeromail.io",
      twitter: "https://twitter.com/zeromail",
      telegram: "https://t.me/zeromail",
      metadataUri: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    dbcConfig: {} as any,
  },
  {
    id: "4",
    name: "Solana AI",
    symbol: "SAI",
    description: "AI-powered DeFi protocol on Solana blockchain.",
    totalSupply: "750000000",
    decimals: 9,
    mintAddress: "So11111111111111111111111111111111111111115",
    owner: "11111111111111111111111111111111",
    status: "active",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ["ai", "defi"],
    metadata: {
      tokenUri: "https://via.placeholder.com/100",
      bannerUri: "https://via.placeholder.com/400x200",
      website: "https://solanai.io",
      twitter: "https://twitter.com/solanai",
      telegram: "https://t.me/solanai",
      metadataUri: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    dbcConfig: {} as any,
  },
  {
    id: "5",
    name: "Privacy Coin",
    symbol: "PRIV",
    description: "Next-generation privacy coin with zero-knowledge proofs.",
    totalSupply: "10000000000",
    decimals: 9,
    mintAddress: "So11111111111111111111111111111111111111116",
    owner: "11111111111111111111111111111111",
    status: "upcoming",
    createdAt: new Date(Date.now() + 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ["privacy", "zk"],
    metadata: {
      tokenUri: "https://via.placeholder.com/100",
      bannerUri: "https://via.placeholder.com/400x200",
      website: "https://privacycoin.io",
      twitter: "https://twitter.com/privacycoin",
      telegram: "https://t.me/privacycoin",
      metadataUri: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    dbcConfig: {} as any,
  },
  {
    id: "6",
    name: "Meme Token",
    symbol: "MEME",
    description: "The ultimate meme token for the Solana ecosystem.",
    totalSupply: "1000000000000",
    decimals: 9,
    mintAddress: "So11111111111111111111111111111111111111117",
    owner: "11111111111111111111111111111111",
    status: "active",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ["meme"],
    metadata: {
      tokenUri: "https://via.placeholder.com/100",
      bannerUri: "https://via.placeholder.com/400x200",
      website: "https://memetoken.io",
      twitter: "https://twitter.com/memetoken",
      telegram: "https://t.me/memetoken",
      metadataUri: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    dbcConfig: {} as any,
  },
];

export default function TokenSearch() {
  const tokens = DUMMY_TOKENS;
  const isLoading = false;
  const [searchQuery, setSearchQuery] = useState("");
  const [tag, setTag] = useState<string | undefined>(undefined);
  const [timeRange, setTimeRange] = useState<string | undefined>(undefined);
  const isSearching = false;

  const clearSearch = () => {
    setSearchQuery("");
  };

  // Simple search filter for dummy data
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return tokens.filter(token => 
      token.name.toLowerCase().includes(query) ||
      token.symbol.toLowerCase().includes(query) ||
      token.description?.toLowerCase().includes(query)
    );
  }, [searchQuery, tokens]);

  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeType>("all");

  const handleTimeRangeChange = (range: TimeRangeType) => {
    setSelectedTimeRange(range);
    
    if (range === "all") {
      setTimeRange(undefined);
    } else if (range === "24h") {
      const date = new Date();
      date.setHours(date.getHours() - 24);
      setTimeRange(date.toISOString());
    } else if (range === "7d") {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      setTimeRange(date.toISOString());
    } else if (range === "30d") {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      setTimeRange(date.toISOString());
    } else if (range === "90d") {
      const date = new Date();
      date.setDate(date.getDate() - 90);
      setTimeRange(date.toISOString());
    }
  };

  const handleTagChange = (selectedTag: string) => {
    if (tag === selectedTag) {
      setTag(undefined);
    } else {
      setTag(selectedTag);
    }
  };

  const getTimeRangeLabel = (range: TimeRangeType): string => {
    switch (range) {
      case "24h":
        return "24 Hours";
      case "7d":
        return "7 Days";
      case "30d":
        return "30 Days";
      case "90d":
        return "90 Days";
      case "custom":
        return "Custom";
      default:
        return "All Time";
    }
  };

  const clearFilters = () => {
    setSelectedTimeRange("all");
    setTimeRange(undefined);
    setTag(undefined);
  };

  const getFilteredTokens = useMemo(() => {
    let filtered = [...tokens];

    if (tag) {
      filtered = filtered.filter(token => 
        token.tags && token.tags.some(t => t.toLowerCase() === tag.toLowerCase())
      );
    }

    if (timeRange) {
      const filterDate = new Date(timeRange);
      filtered = filtered.filter(token => {
        const tokenDate = new Date(token.createdAt);
        return tokenDate.getTime() >= filterDate.getTime();
      });
    }

    return filtered;
  }, [tokens, tag, timeRange, selectedTimeRange]);

  const getFilteredSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    let filtered = [...searchResults];

    if (timeRange) {
      const filterDate = new Date(timeRange);
      filtered = filtered.filter(token => {
        const tokenDate = new Date(token.createdAt);
        return tokenDate.getTime() >= filterDate.getTime();
      });
    }

    return filtered;
  }, [searchResults, timeRange, searchQuery, selectedTimeRange]);

  const displayTokens = searchQuery.trim() ? getFilteredSearchResults : getFilteredTokens;

  return (
    <>
      <div className="flex flex-col gap-4 mb-8">
        {/* Search and Filters Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 w-full sm:max-w-[727px]">
            <div className="relative">
              <input
                type="text"
                placeholder="SEARCH"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-3 pr-6 py-[10px] bg-transparent border border-[rgba(255,255,255,0.1)] text-sm font-share-tech-mono text-gray-500 placeholder-gray-500 uppercase tracking-[0.7px] focus:outline-none focus:border-[rgba(255,255,255,0.2)]"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-[14px]">
            <button
              className={`px-[14.667px] py-[7.667px] border font-share-tech-mono text-[12.3px] leading-[17.5px] transition-colors ${
                true ? 'bg-[rgba(208,135,0,0.05)] border-[#d08700] text-[#d08700]' : 'border-[rgba(255,255,255,0.1)] text-gray-500'
              }`}
            >
              LIVE
            </button>
            <button
              className="px-[14.667px] py-[7.667px] border border-[rgba(255,255,255,0.1)] font-share-tech-mono text-[12.3px] leading-[17.5px] text-gray-500 hover:text-gray-400 transition-colors"
            >
              UPCOMING
            </button>
            <button
              className="px-[14.667px] py-[7.667px] border border-[rgba(255,255,255,0.1)] font-share-tech-mono text-[12.3px] leading-[17.5px] text-gray-500 hover:text-gray-400 transition-colors"
            >
              ENDED
            </button>
          </div>
        </div>
        { (selectedTimeRange !== "all" || tag) && (
          <div className="flex flex-wrap items-center gap-2">
            {selectedTimeRange !== "all" && (
              <button
                onClick={() => handleTimeRangeChange("all")}
                className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm text-blue-700 transition hover:bg-blue-100"
              >
                <span>{getTimeRangeLabel(selectedTimeRange)}</span>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {tag && (
              <button
                onClick={() => setTag(undefined)}
                className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm text-blue-700 transition hover:bg-blue-100"
              >
                <span className="capitalize flex items-center gap-2">
                  <span>{TAG_ICONS[tag]}</span>
                  <span>{tag}</span>
                </span>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {(selectedTimeRange !== "all" || tag) && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100 cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>
      
      {
        isSearching || isLoading ? (
          <div className="text-center">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, index) => (
                <TokenCardSkeleton key={index} />
              ))}
            </div>
          </div>
        ) : displayTokens.length === 0 ? (
          <NoTokensFound 
            searchQuery={searchQuery} 
            className="pt-10"
            width="170px" 
            height="170px"
            titleSize="text-[2rem]"
            subTitleSize="text-base"
          />
        ) : displayTokens.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayTokens.map((token) => (
              <ExploreTokenCard  
                key={token.id}
                className="lg:max-w-[400px]"
                id={token.id.toString()}
                mint={token.mintAddress}
                banner={token.metadata.bannerUri}
                avatar={token.metadata.tokenUri}
                name={token.name}
                symbol={token.symbol}
                description={token.description}
                decimals={token.decimals}
                totalSupply={token.totalSupply}
                actionButton={{
                  text: `Buy $${token.symbol}`,
                  variant: 'presale' as const
                }}
              />
            ))}
          </div>
        ) : null
      }
    </>
  );
}
