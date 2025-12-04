'use client';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { formatNumberToCurrency, formatTinyPrice } from '@/utils';
import { triggerProgressBar } from './layout/PageProgressBar';
import { useCallback, useEffect, useState } from 'react';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { CalendarClock } from 'lucide-react';

interface ExploreTokenCardProps {
  id: string;
  mint: string;
  decimals: number;
  totalSupply: string | number;
  tokenUri: string;
  name: string;
  symbol: string;
  description: string;
  className?: string;
  // Launch-specific data
  pricePerToken?: number | bigint;
  amountToSell?: number | bigint;
  minAmountToSell?: number | bigint;
  totalClaimed?: number | bigint;
  tokensPerProof?: number | bigint;
  startTime?: string | number | bigint;
  endTime?: string | number | bigint;
}

export default function ExploreTokenCard({
  mint,
  decimals,
  totalSupply,
  tokenUri,
  name,
  symbol,
  description,
  className,
  pricePerToken = 0,
  amountToSell = 0,
  minAmountToSell = 0,
  totalClaimed = 0,
  tokensPerProof = 0,
  startTime,
  endTime,
}: ExploreTokenCardProps) {
  const navigate = useRouter();
  const { prices, getExchangeRate } = useCryptoPrices();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fetchTokenUri = useCallback(async () => {
    try {
      const re = await fetch(tokenUri);
      const data = await re.json();
      setImageUrl(data.image);
    } catch (e) {
      return null;
    }
  }, [tokenUri]);

  useEffect(() => {
    fetchTokenUri();
  }, [fetchTokenUri]);

  const supply = typeof totalSupply === 'string' ? parseFloat(totalSupply) : totalSupply;
  const totalClaimedNum =
    typeof totalClaimed === 'bigint' ? Number(totalClaimed) : totalClaimed || 0;
  const amountToSellNum =
    typeof amountToSell === 'bigint' ? Number(amountToSell) : amountToSell || 0;
  const pricePerTokenNum =
    typeof pricePerToken === 'bigint' ? Number(pricePerToken) : pricePerToken || 0;
  const tokensPerProofNum =
    typeof tokensPerProof === 'bigint' ? Number(tokensPerProof) : tokensPerProof || 0;

  const sold = totalClaimedNum / 10 ** decimals;
  const goal = amountToSellNum / 10 ** decimals;
  const progressPercent = goal > 0 ? (sold / goal) * 100 : 0;

  // Calculate participants
  const tokensPerProofDecimal = tokensPerProofNum / 10 ** decimals;
  const participants =
    tokensPerProofDecimal > 0.001
      ? Math.floor(sold / tokensPerProofDecimal)
      : Math.max(1, Math.floor(sold / Math.max(pricePerTokenNum / 1e9, 0.001)));

  // Convert SOL price to ZEC price
  const priceInSol = pricePerTokenNum / 1e9;
  const solToZecRate = getExchangeRate('solana', 'zcash');
  const priceInZec = solToZecRate ? priceInSol * solToZecRate : 0;
  const priceInUsd = prices.zcash ? priceInZec * prices.zcash : 0;

  // Calculate sold and goal in ZEC
  const soldInZec = sold * priceInZec;
  const goalInZec = goal * priceInZec;
  
  // Calculate USD values
  const soldInUsd = prices.zcash ? soldInZec * prices.zcash : 0;
  const goalInUsd = prices.zcash ? goalInZec * prices.zcash : 0;

  const getStatus = () => {
    if (!startTime || !endTime) return { label: 'LIVE', color: '#34c759' };
    const now = Date.now();
    let start: number;
    let end: number;

    if (typeof startTime === 'bigint') {
      start = Number(startTime) * 1000;
    } else if (typeof startTime === 'string') {
      const parsed = Number(startTime);
      if (!isNaN(parsed)) {
        start = parsed * 1000;
      } else {
        start = new Date(startTime).getTime();
      }
    } else {
      start = Number(startTime) * 1000;
    }

    if (typeof endTime === 'bigint') {
      end = Number(endTime) * 1000;
    } else if (typeof endTime === 'string') {
      const parsed = Number(endTime);
      if (!isNaN(parsed)) {
        end = parsed * 1000;
      } else {
        end = new Date(endTime).getTime();
      }
    } else {
      end = Number(endTime) * 1000;
    }

    if (now < start) {
      return { label: 'UPCOMING', color: '#3b82f6' };
    } else if (now >= start && now <= end) {
      return { label: 'LIVE', color: '#34c759' };
    } else {
      return { label: 'ENDED', color: '#ef4444' }; // Red
    }
  };

  const status = getStatus();

  // Calculate claim type: Vested or Immediate based on time (similar to status)
  const getClaimType = (): { label: 'Vested' | 'Immediate'; color: string } => {
    if (!endTime) return { label: 'Immediate', color: '#34c759' };
    
    const now = Date.now();
    let end: number;

    if (typeof endTime === 'bigint') {
      end = Number(endTime) * 1000;
    } else if (typeof endTime === 'string') {
      const parsed = Number(endTime);
      if (!isNaN(parsed)) {
        end = parsed * 1000;
      } else {
        end = new Date(endTime).getTime();
      }
    } else {
      end = Number(endTime) * 1000;
    }

    if (now > end) {
      return { label: 'Vested', color: '#475569' };
    } else {
      return { label: 'Immediate', color: '#34c759' };
    }
  };

  const claimType = getClaimType();

  return (
    <motion.div
      whileHover={{
        scale: 1.02,
        y: -4,
        transition: { duration: 0.2, ease: 'easeOut' },
      }}
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1, ease: 'easeIn' },
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`backdrop-blur-[2px] backdrop-filter bg-[#000000] border border-[rgba(255,255,255,0.1)] border-solid relative cursor-pointer w-full max-w-[408px] min-h-[455px] ${className}`}
    >
      <div className="h-full overflow-hidden relative">
        {/* Corner decorations */}
        <div className="absolute border-[#d08700] border-b-0 border-l-2 border-r-0 border-solid border-t-2 left-[-0.33px] w-[14px] h-[14px] top-[-0.33px]" />
        <div className="absolute border-[#d08700] border-b-0 border-l-0 border-r-2 border-solid border-t-2 right-[-0.33px] w-[14px] h-[14px] top-[-0.33px]" />
        <div className="absolute border-[#d08700] border-b-2 border-l-2 border-r-0 border-solid border-t-0 bottom-[-0.33px] left-[-0.33px] w-[14px] h-[14px]" />
        <div className="absolute border-[#d08700] border-b-2 border-l-0 border-r-2 border-solid border-t-0 bottom-[-0.33px] right-[-0.33px] w-[14px] h-[14px]" />

        <div className="absolute left-[20.67px] top-[20.67px] w-[364.67px] flex flex-col gap-[21px]">
          <div className="flex items-start justify-between w-full">
            <div className="border border-[rgba(255,255,255,0.1)] border-solid rounded-[7px] w-14 h-14 shrink-0">
              {imageUrl && (
                <motion.img
                  src={imageUrl}
                  alt={name}
                  className="w-full h-full object-cover rounded-[7px]"
                />
              )}
            </div>
            <div className="flex items-center gap-[10px] shrink-0 pr-3">
              <div className="border border-solid box-border flex flex-col items-start px-[11.167px] py-[4.167px] shrink-0" style={{ borderColor: status.color }}>
                <span className="font-rajdhani font-medium text-sm leading-[14px]" style={{ color: status.color }}>
                  {status.label}
                </span>
              </div>
              <div className="bg-[rgba(248,250,252,0.06)] border border-solid box-border flex gap-[3px] items-center px-[11.167px] py-[4.167px] shrink-0 w-[144.333px]" style={{ borderColor: claimType.color }}>
                <div className="relative shrink-0 w-4 h-4">
                  <CalendarClock className="w-full h-full" style={{ color: claimType.color }} strokeWidth={1.5} />
                </div>
                <span className="font-rajdhani font-medium text-sm leading-[14px] whitespace-nowrap" style={{ color: claimType.color }}>
                  Claims: {claimType.label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 w-full">
            <h3 className="font-rajdhani font-bold text-2xl text-white leading-[28px] whitespace-nowrap">{name}</h3>
            <span className="font-rajdhani font-medium text-sm text-[#d08700] leading-[17.5px] whitespace-nowrap">${symbol}</span>
          </div>
        </div>

        <div className="absolute left-[20.67px] right-[20.66px] top-[160.67px] h-[35px] overflow-hidden">
          <p className="font-rajdhani text-sm text-gray-400 leading-[17.5px] whitespace-pre-wrap">
            {description}
          </p>
        </div>

        <div className="absolute left-[calc(50%+0.34px)] top-[207px] translate-x-[-50%] w-[364.67px] border border-[rgba(255,255,255,0.09)] border-solid box-border flex flex-col gap-4 items-start px-[11px] py-4">
          <div className="flex flex-col gap-[7px] items-start w-full">
            <div className="flex items-start justify-between w-full">
              <div className="flex flex-col items-start self-stretch shrink-0">
                <span className="font-rajdhani text-sm text-gray-500 leading-[14px] whitespace-nowrap">
                  TOTAL RAISED
                </span>
              </div>
              <div className="flex flex-col items-start self-stretch shrink-0">
                <span className="font-rajdhani text-sm text-gray-500 leading-[14px] whitespace-nowrap">
                  GOAL
                </span>
              </div>
            </div>
            <div className="flex items-start justify-between w-full">
              <div className="flex flex-col items-start self-stretch shrink-0">
                <span className="font-rajdhani text-sm text-gray-500 leading-[14px] whitespace-nowrap">
                  <span className="font-rajdhani font-bold text-white">
                    {formatNumberToCurrency(soldInZec)} ZEC
                  </span>
                  {prices.zcash && soldInUsd > 0 && (
                    <span>{` ($${formatNumberToCurrency(soldInUsd)})`}</span>
                  )}
                </span>
              </div>
              <div className="flex flex-col items-start self-stretch shrink-0">
                <span className="font-rajdhani text-sm text-gray-500 leading-[14px] whitespace-nowrap">
                  <span className="font-rajdhani font-bold text-white">
                    {formatNumberToCurrency(goalInZec)} ZEC
                  </span>
                  {prices.zcash && goalInUsd > 0 && (
                    <span>(${formatNumberToCurrency(goalInUsd)})</span>
                  )}
                </span>
              </div>
            </div>
            <div className="bg-gray-800 flex flex-col h-[7px] items-start justify-center overflow-hidden w-full relative">
              <div
                className="bg-[#d08700] flex-[1_0_0] min-h-px min-w-px relative shrink-0 transition-all duration-300"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              >
                <div className="absolute bg-white bottom-0 right-[-0.06px] shadow-[0px_0px_10px_0px_#ffffff] top-0 w-[3.5px]" />
              </div>
              <div className="absolute inset-0 opacity-20" />
            </div>
          </div>
          <div className="border-[rgba(255,255,255,0.12)] border-b-0 border-l-0 border-r-0 border-solid border-t-[0.667px] box-border flex items-center justify-between pb-0 pl-0 pr-0 pt-2 w-full">
            <div className="flex flex-col gap-[7px] items-start shrink-0 w-[117px]">
              <span className="font-rajdhani text-xs text-gray-500 leading-[14px] whitespace-nowrap">
                TOKEN PRICE
              </span>
              <div className="flex flex-col h-[14px] items-start justify-between w-full">
                <span className="font-rajdhani font-bold text-[#d08700] text-base leading-[24px] whitespace-nowrap">
                  {priceInZec > 0 ? formatTinyPrice(priceInZec) : '---'} ZEC
                  {prices.zcash && priceInUsd > 0 && (
                    <span className="font-rajdhani font-normal text-sm text-gray-500">
                      {' '}({formatTinyPrice(priceInUsd)} USD)
                    </span>
                  )}
                </span>
              </div>
            </div>
            <div className="flex flex-row items-center self-stretch">
              <div className="flex flex-col gap-[7px] h-full items-start justify-center shrink-0 w-[117px]">
                <span className="font-rajdhani text-xs text-gray-500 leading-[14px] text-right w-full whitespace-pre-wrap">
                  PARTICIPANTS
                </span>
                <div className="flex flex-col h-[14px] items-end justify-between w-full">
                  <span className="font-rajdhani font-bold text-[#d08700] text-base leading-[24px] whitespace-nowrap">
                    {participants.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            triggerProgressBar();
            navigate.push(`/token/${mint}`);
          }}
          className="absolute left-[20.67px] right-[20.66px] top-[375px] bg-[rgba(255,255,255,0)] border-2 border-[#d08700] border-solid box-border flex items-start justify-center px-[23px] py-[12.5px] shadow-[0px_0px_10px_0px_rgba(0,243,255,0.2)] cursor-pointer"
        >
          <div className="flex gap-[7px] items-center justify-center w-[318.67px]">
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="#d08700"
              viewBox="0 0 24 24"
              className="w-5 h-5 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <span className="font-share-tech-mono text-sm text-[#d08700] text-center tracking-[0.7px] uppercase whitespace-nowrap leading-[21px]">
              VIEW PROTOCOL
            </span>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}
