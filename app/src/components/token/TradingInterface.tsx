"use client"

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TransactionAction, TransactionStatus, TransactionChain } from "@/types/api";
import { formatNumberToCurrency, formatTokenPrice } from "@/utils";

// Token interface that matches what's actually passed to the component
interface Token {
  name: string;
  symbol: string;
  description?: string;
  decimals?: number;
  totalSupply?: bigint | string | number;
  metadata?: {
    tokenUri?: string;
    bannerUri?: string;
  };
  // Also support Token type from @/types/token
  tokenSymbol?: string;
  tokenUri?: string;
  tokenName?: string;
}
import { ChevronDown, Copy, Download, ExternalLink, Wallet, Loader2, CheckCircle2, XCircle, Clock, Info } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useReducer, useTransition, useDeferredValue, memo, useRef } from "react";
import { getRpcSOLEndpoint, getSolPrice, getSolBalance, getTokenBalanceOnSOL } from "@/lib/sol";
import { calculateDbcSwapQuote, approximateSwapQuote } from "@/lib/meteora";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { Connection, Transaction, PublicKey } from "@solana/web3.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { SOL_NETWORK } from "@/configs/env.config";
import { getIpfsUrl } from "@/lib/utils";
import { useNearIntents } from "@/hooks/useNearIntents";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { QRCodeSVG } from "qrcode.react";

// Convert NEAR to yoctoNEAR: 1 NEAR = 10^24 yoctoNEAR
const parseNearAmount = (amount: string): string => {
  if (!amount || parseFloat(amount) <= 0) return "0";
  const amountNum = parseFloat(amount);
  return (amountNum * Math.pow(10, 24)).toFixed(0);
};

interface TradingInterfaceProps {
  token: Token;
  address: string;
}

interface TokenData {
  price: number;
  holders: number;
  marketCap: number;
  targetRaise: number;
  poolAddress: string;
  migrationProgress: number;
}

interface UserBalances {
  sol: number;
  token: number;
}

interface TradingState {
  tokenData: TokenData;
  userBalances: UserBalances;
  loading: boolean;
  loadingBalances: boolean;
  isBuying: boolean;
  amountPay: string;
  amountReceive: string;
  baseReserve: number;
  quoteReserve: number;
  payIsSol: boolean;
}

type TradingAction =
  | { type: 'SET_TOKEN_DATA'; payload: TokenData }
  | { type: 'SET_USER_BALANCES'; payload: UserBalances }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOADING_BALANCES'; payload: boolean }
  | { type: 'SET_IS_BUYING'; payload: boolean }
  | { type: 'SET_AMOUNT_PAY'; payload: string }
  | { type: 'SET_AMOUNT_RECEIVE'; payload: string }
  | { type: 'SET_RESERVES'; payload: { base: number; quote: number } }
  | { type: 'SET_PAY_IS_SOL'; payload: boolean }
  | { type: 'RESET_AMOUNTS' }
  | { type: 'SWITCH_TOKEN'; payload: boolean };

const tradingReducer = (state: TradingState, action: TradingAction): TradingState => {
  switch (action.type) {
    case 'SET_TOKEN_DATA':
      return { ...state, tokenData: action.payload, loading: false };
    case 'SET_USER_BALANCES':
      return { ...state, userBalances: action.payload, loadingBalances: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_LOADING_BALANCES':
      return { ...state, loadingBalances: action.payload };
    case 'SET_IS_BUYING':
      return { ...state, isBuying: action.payload };
    case 'SET_AMOUNT_PAY':
      return { ...state, amountPay: action.payload };
    case 'SET_AMOUNT_RECEIVE':
      return { ...state, amountReceive: action.payload };
    case 'SET_RESERVES':
      return { ...state, baseReserve: action.payload.base, quoteReserve: action.payload.quote };
    case 'SET_PAY_IS_SOL':
      return { ...state, payIsSol: action.payload };
    case 'RESET_AMOUNTS':
      return { ...state, amountPay: '', amountReceive: '' };
    case 'SWITCH_TOKEN':
      return { ...state, payIsSol: action.payload, amountPay: '', amountReceive: '' };
    default:
      return state;
  }
};

const GAS_RESERVE = 0.001; // Reserve SOL for gas fees
const SLIPPAGE_BPS = 50;
const COMPUTE_UNIT_PRICE = 100000;
const MAX_FRACTION_DIGITS = 6;
const LAMPORTS_PER_SOL = 1_000_000_000;
const TOTAL_FEE_PERCENT = 0.003; // 0.3% total fee (protocol + partner + creator)

// Migration Progress Enum
enum MigrationProgress {
  PreBondingCurve = 0,
  PostBondingCurve = 1,
  LockedVesting = 2,
  CreatedPool = 3
}

// Get user-friendly phase information
const getPhaseInfo = (migrationProgress: number) => {
  switch (migrationProgress) {
    case MigrationProgress.PreBondingCurve:
      return {
        label: 'BONDING CURVE',
        color: 'orange',
        description: 'Initial fundraising phase'
      };
    case MigrationProgress.PostBondingCurve:
      return {
        label: 'FUNDRAISING COMPLETE',
        color: 'green',
        description: 'Preparing for migration'
      };
    case MigrationProgress.LockedVesting:
      return {
        label: 'VESTING PERIOD',
        color: 'purple',
        description: 'Locked vesting in progress'
      };
    case MigrationProgress.CreatedPool:
      return {
        label: 'LIVE TRADING',
        color: 'emerald',
        description: 'Pool created and migrated'
      };
    default:
      return {
        label: 'UNKNOWN',
        color: 'gray',
        description: 'Status unknown'
      };
  }
};

const hexToNumber = (hex: string): number => {
  return !hex || hex === "00" ? 0 : parseInt(hex, 16);
};

const formatBalance = (balance: number, decimals: number = 4): string => {
  return balance.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

// Deposit workflow state interface
interface DepositState {
  depositAmount: string;
  depositAddress: string | null;
  depositMemo: string | null;
  purchaseInfo: any | null;
  swapStatus: any | null;
  isGeneratingAddress: boolean;
  isSettling: boolean;
  isLoadingPurchaseInfo: boolean;
  isSendingNear: boolean;
  nearTxHash: string | null;
}

function TradingInterfaceComponent({ token, address }: TradingInterfaceProps) {
  const { publicKey, sendTransaction } = useWallet()
  const { signedAccountId, walletSelector } = useWalletSelector();
  const nearIntents = useNearIntents();

  const [state, dispatch] = useReducer(tradingReducer, {
    tokenData: {
      price: 0,
      holders: 0,
      marketCap: 0,
      targetRaise: 0,
      poolAddress: '',
      migrationProgress: 0
    },
    userBalances: {
      sol: 0,
      token: 0
    },
    loading: true,
    loadingBalances: false,
    isBuying: false,
    amountPay: '',
    amountReceive: '',
    baseReserve: 0,
    quoteReserve: 0,
    payIsSol: true
  });

  // Deposit workflow state
  const [depositState, setDepositState] = useState<DepositState>({
    depositAmount: '',
    depositAddress: null,
    depositMemo: null,
    purchaseInfo: null,
    swapStatus: null,
    isGeneratingAddress: false,
    isSettling: false,
    isLoadingPurchaseInfo: false,
    isSendingNear: false,
    nearTxHash: null,
  });

  const [isPending, startTransition] = useTransition();
  const statusPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deferredAmountPay = useDeferredValue(state.amountPay);
  const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to get token symbol (supports both old and new token formats)
  // Memoized to prevent unnecessary callback recreations
  const getTokenSymbol = useCallback(() => token.symbol || token.tokenSymbol || '', [token.symbol, token.tokenSymbol]);
  const getTokenUri = useCallback(() => token.metadata?.tokenUri || token.tokenUri || '', [token.metadata?.tokenUri, token.tokenUri]);

  const tokenOptions = [
    { name: 'SOL', icon: '/chains/sol.jpeg' },
    { name: getTokenSymbol(), icon: getTokenUri() }
  ];

  const fetchUserBalances = useCallback(async () => {
    if (!publicKey) {
      dispatch({ type: 'SET_USER_BALANCES', payload: { sol: 0, token: 0 } });
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING_BALANCES', payload: true });

      const [solBalance, tokenBalance] = await Promise.all([
        getSolBalance(publicKey.toString()),
        getTokenBalanceOnSOL(address, publicKey.toString())
      ]);

      startTransition(() => {
        dispatch({
          type: 'SET_USER_BALANCES',
          payload: { sol: solBalance, token: tokenBalance }
        });
      });
    } catch (error) {
      console.error('Error fetching user balances:', error);
      dispatch({ type: 'SET_USER_BALANCES', payload: { sol: 0, token: 0 } });
    }
  }, [publicKey, address]);

  const fetchTokenData = useCallback(async () => {
    const solPrice = await getSolPrice();
    if(!solPrice) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const connection = new Connection(getRpcSOLEndpoint());
      const client = new DynamicBondingCurveClient(connection, 'confirmed');
      
      // Try to find pool by mint address
      // Note: This assumes the pool address is stored in token data or we need to derive it
      // For now, we'll use the address as the pool address if it's a valid PublicKey
      let poolAddress: PublicKey;
      try {
        poolAddress = new PublicKey(address);
      } catch {
        // If address is not a valid pool address, we can't fetch pool data
        console.warn('Invalid pool address:', address);
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      // Fetch pool state and config using Meteora SDK
      let virtualPoolState;
      let poolConfigState;
      
      try {
        virtualPoolState = await client.state.getPool(poolAddress);
        if (!virtualPoolState) {
          console.warn('Pool not found:', address);
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        poolConfigState = await client.state.getPoolConfig(virtualPoolState.config);
        if (!poolConfigState) {
          console.warn('Pool config not found');
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }
      } catch (error) {
        // Handle invalid pool address or account discriminator errors
        // This can happen with manually created tokens that aren't real Meteora pools
        console.warn('Error fetching pool data (token may not be a valid Meteora pool):', error);
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      // Extract reserves from pool state
      const quoteReserve = virtualPoolState.quoteReserve?.toNumber() || 0;
      const baseReserve = virtualPoolState.baseReserve?.toNumber() || 0;

      const quote = quoteReserve / LAMPORTS_PER_SOL;
      const tokenDecimals = token.decimals || 9;
      const base = baseReserve / Math.pow(10, tokenDecimals);

      // Get pre-migration token supply from config
      const preMigrationTokenSupply = poolConfigState.preMigrationTokenSupply?.toNumber() || 0;
      const preMigrationSupply = preMigrationTokenSupply / Math.pow(10, tokenDecimals);

      const price = base > 0 ? quote / base : 0;

      const totalSupply = preMigrationSupply + base;
      const circulating = totalSupply - base;
      const marketCap = price * circulating;

      // Get migration threshold from config
      const migrationQuoteThreshold = poolConfigState.migrationQuoteThreshold?.toNumber() || 0;
      const targetRaise = (migrationQuoteThreshold / LAMPORTS_PER_SOL) * solPrice;

      // Get holders count - this would need to be fetched separately
      // For now, we'll use a placeholder or fetch from token accounts
      const holders: string[] = []; // TODO: Implement holder fetching if needed

      dispatch({ type: 'SET_RESERVES', payload: { base, quote } });

      startTransition(() => {
        dispatch({
          type: 'SET_TOKEN_DATA',
          payload: {
            price: price * solPrice,
            holders: holders.length,
            marketCap: marketCap * solPrice,
            targetRaise,
            poolAddress: poolAddress.toString(),
            migrationProgress: virtualPoolState.migrationProgress || 0
          }
        });
      });
    } catch (error) {
      console.error('Error fetching token data:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [address, token.decimals]);
  
  // Effects
  useEffect(() => {
    fetchTokenData();
  }, [fetchTokenData]);

  useEffect(() => {
    fetchUserBalances();
  }, [fetchUserBalances]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (quoteTimeoutRef.current) {
        clearTimeout(quoteTimeoutRef.current);
      }
    };
  }, []);

  const hasInsufficientBalance = useMemo(() => {
    if (!deferredAmountPay || deferredAmountPay.trim() === '') return false;

    const amountPayNum = parseFloat(deferredAmountPay.replace(/,/g, ''));
    if (isNaN(amountPayNum) || amountPayNum <= 0) return false;

    if (state.payIsSol) {
      return amountPayNum > (state.userBalances.sol - GAS_RESERVE);
    } else {
      return amountPayNum > state.userBalances.token;
    }
  }, [deferredAmountPay, state.payIsSol, state.userBalances]);

  const currentBalance = useMemo(() => {
    return state.payIsSol ? state.userBalances.sol : state.userBalances.token;
  }, [state.payIsSol, state.userBalances]);

  const handleAmountPayChange = useCallback((value: string) => {
    dispatch({ type: 'SET_AMOUNT_PAY', payload: value });

    // Clear any pending quote calculation
    if (quoteTimeoutRef.current) {
      clearTimeout(quoteTimeoutRef.current);
    }

    if (value.trim() === '') {
      dispatch({ type: 'SET_AMOUNT_RECEIVE', payload: '' });
      return;
    }

    const amountPayNum = parseFloat(value);

    if (!state.baseReserve || !state.quoteReserve || isNaN(amountPayNum) || amountPayNum <= 0) {
      dispatch({ type: 'SET_AMOUNT_RECEIVE', payload: '' });
      return;
    }

    // Debounce the API call by 300ms
    quoteTimeoutRef.current = setTimeout(async () => {
      // If no pool address or reserves, use approximation
      if (!state.tokenData.poolAddress || !state.baseReserve || !state.quoteReserve) {
        const outputAmount = approximateSwapQuote(
          state.baseReserve || 0,
          state.quoteReserve || 0,
          amountPayNum,
          !state.payIsSol,
          TOTAL_FEE_PERCENT
        );
        dispatch({ type: 'SET_AMOUNT_RECEIVE', payload: outputAmount.toFixed(MAX_FRACTION_DIGITS) });
        return;
      }

      try {
        // Use Meteora SDK for accurate DBC quote calculation
        const connection = new Connection(getRpcSOLEndpoint());
        const outputAmount = await calculateDbcSwapQuote(
          connection,
          state.tokenData.poolAddress,
          amountPayNum,
          !state.payIsSol, // swapBaseForQuote: true when selling tokens (payIsSol=false)
          token.decimals,
          SLIPPAGE_BPS
        );

        dispatch({ type: 'SET_AMOUNT_RECEIVE', payload: outputAmount.toFixed(MAX_FRACTION_DIGITS) });
      } catch (error) {
        console.error('Error calculating DBC quote, using approximation:', error);

        // Fallback to approximation if SDK call fails
        const outputAmount = approximateSwapQuote(
          state.baseReserve,
          state.quoteReserve,
          amountPayNum,
          !state.payIsSol,
          TOTAL_FEE_PERCENT
        );

        dispatch({ type: 'SET_AMOUNT_RECEIVE', payload: outputAmount.toFixed(MAX_FRACTION_DIGITS) });
      }
    }, 300);
  }, [state.baseReserve, state.quoteReserve, state.payIsSol, state.tokenData.poolAddress, token.decimals]);


  const handleBuyAndSell = useCallback(async () => {
    // Validation checks
    if (!publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!state.amountPay || state.amountPay.trim() === '') {
      toast.error(`Please enter an amount to ${state.payIsSol ? 'buy' : 'sell'}`);
      return;
    }

    if (hasInsufficientBalance) {
      const assetName = state.payIsSol ? 'SOL' : getTokenSymbol();
      toast.error(`Insufficient ${assetName} balance. You have ${formatBalance(currentBalance)} ${assetName}`);
      return;
    }

    const actionText = state.payIsSol ? "Buying" : "Selling";
    const toastId = toast.loading(`${actionText} ${getTokenSymbol()}...`);
    dispatch({ type: 'SET_IS_BUYING', payload: true });

    try {
      const connection = new Connection(getRpcSOLEndpoint());
      const amountNum = parseFloat(state.amountPay.replace(/,/g, ''));

      const swapParams = {
        baseMint: address,
        signer: publicKey.toString(),
        amount: amountNum,
        slippageBps: SLIPPAGE_BPS,
        swapBaseForQuote: !state.payIsSol,
        computeUnitPriceMicroLamports: COMPUTE_UNIT_PRICE,
      };

      // Use Meteora SDK to perform swap
      const client = new DynamicBondingCurveClient(connection, 'confirmed');
      const poolAddress = state.tokenData.poolAddress || address;
      let poolPubkey: PublicKey;
      
      try {
        poolPubkey = new PublicKey(poolAddress);
      } catch (error) {
        toast.dismiss(toastId);
        toast.error('Invalid pool address. This token may not have a valid trading pool.');
        dispatch({ type: 'SET_IS_BUYING', payload: false });
        return;
      }

      // Fetch pool state and config
      let virtualPoolState;
      let poolConfigState;
      
      try {
        virtualPoolState = await client.state.getPool(poolPubkey);
        if (!virtualPoolState) {
          throw new Error('Pool not found');
        }

        poolConfigState = await client.state.getPoolConfig(virtualPoolState.config);
        if (!poolConfigState) {
          throw new Error('Pool config not found');
        }
      } catch (error) {
        // Handle invalid pool address or account discriminator errors
        // This can happen with manually created tokens that aren't real Meteora pools
        toast.dismiss(toastId);
        const errorMessage = error instanceof Error && error.message.includes('discriminator')
          ? 'This token does not have a valid trading pool. SOL trading is not available for manually created tokens.'
          : 'Failed to fetch pool data. This token may not be available for trading.';
        toast.error(errorMessage);
        dispatch({ type: 'SET_IS_BUYING', payload: false });
        return;
      }

      // Prepare swap parameters
      const swapBaseForQuote = !state.payIsSol; // true when selling tokens
      const inputDecimals = swapBaseForQuote ? (token.decimals || 9) : 9;
      const { BN } = await import('@coral-xyz/anchor');
      const amountIn = new BN(Math.floor(amountNum * 10 ** inputDecimals));

      // Build swap transaction using Meteora SDK
      // Note: The exact method signature may vary - this needs to be verified with the SDK documentation
      const swapTx = await (client.pool as any).buildSwapTransaction({
        virtualPool: virtualPoolState,
        config: poolConfigState,
        user: publicKey,
        swapBaseForQuote,
        amountIn,
        slippageBps: SLIPPAGE_BPS,
        hasReferral: false,
        computeUnitPriceMicroLamports: COMPUTE_UNIT_PRICE,
      });

      // Send transaction
      const signatureSwap = await sendTransaction(swapTx, connection, {
        skipPreflight: false,
        preflightCommitment: "processed",
      });

      // Note: Transaction tracking (createTransaction/updateTransactionStatus) removed
      // as the API no longer exists. Transactions are still executed successfully.

      await connection.confirmTransaction(signatureSwap, "confirmed");

      toast.dismiss(toastId);
      const receiveSymbol = state.payIsSol ? getTokenSymbol() : "SOL";
      toast.success(`Successfully ${state.payIsSol ? "bought" : "sold"} ${getTokenSymbol()}! Received ${state.amountReceive} ${receiveSymbol}`);
      console.log("Swap Transaction Signature:", signatureSwap);

      await Promise.all([fetchTokenData(), fetchUserBalances()]);
      dispatch({ type: 'RESET_AMOUNTS' });
    } catch (error) {
      console.error("Error during swap:", error);
      toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : "Failed to execute swap. Please try again.");
    } finally {
      dispatch({ type: 'SET_IS_BUYING', payload: false });
    }
  }, [publicKey, sendTransaction, address, state, hasInsufficientBalance, currentBalance, token, fetchTokenData, fetchUserBalances, getTokenSymbol]);

  // ============================================================================
  // DEPOSIT WORKFLOW FUNCTIONS
  // ============================================================================

  // ============================================================================
  // STEP 1: Fetch purchase information (CORRECTED)
  // ============================================================================
  const fetchPurchaseInfo = useCallback(async (amount: string) => {
    if (!amount || parseFloat(amount) <= 0 || !signedAccountId || !publicKey) {
      setDepositState(prev => ({ ...prev, purchaseInfo: null }));
      return;
    }

    if (!nearIntents) {
      // NEAR Intents not configured, skip purchase info fetch
      setDepositState(prev => ({ ...prev, purchaseInfo: null, isLoadingPurchaseInfo: false }));
      return;
    }

    try {
      setDepositState(prev => ({ ...prev, isLoadingPurchaseInfo: true }));
      
      const tokenSymbol = getTokenSymbol();
      
      // Check if token is supported by NearIntents before attempting to estimate
      const tokenSupport = await nearIntents.checkNearIntentSupport(tokenSymbol);
      if (!tokenSupport.supported) {
        // Token is not supported for NEAR payments (e.g., custom tokens like "DARK")
        // Silently fail - this is expected for custom tokens that aren't in the supported list
        console.warn(`Token ${tokenSymbol} is not supported for NEAR payments. Only SOL payments are available.`);
        setDepositState(prev => ({ ...prev, purchaseInfo: null, isLoadingPurchaseInfo: false }));
        return;
      }
      
      const amountInYoctoNEAR = parseNearAmount(amount) || "0";
      
      // Use estimatePayment for price preview (dry=true, no deposit address generated)
      const estimate = await nearIntents.estimatePayment({
        amount: amountInYoctoNEAR,
        paymentToken: "wNEAR",
        receiveToken: tokenSymbol,
        recipientAddress: publicKey.toString(),
        refundAddress: signedAccountId,
        slippage: 1.0
      });

      // Format estimate to match expected structure
      const purchaseInfo = {
        expectedOut: estimate.expectedReceiveAmount,
        minAmountOut: estimate.expectedReceiveAmount, // estimatePayment doesn't return minAmountOut
        timeEstimate: estimate.estimatedTimeSeconds,
        slippageBps: 100,
        estimatedValueUsd: estimate.estimatedValueUsd
      };

      setDepositState(prev => ({ ...prev, purchaseInfo, isLoadingPurchaseInfo: false }));
    } catch (error) {
      console.error("Error fetching purchase info:", error);
      // Only show error toast if it's not a "not supported" error (which we handle above)
      if (error instanceof Error && !error.message.includes("not supported")) {
        toast.error("Failed to fetch purchase info. Please try again.");
      }
      setDepositState(prev => ({ ...prev, purchaseInfo: null, isLoadingPurchaseInfo: false }));
    }
  }, [signedAccountId, publicKey, getTokenSymbol, nearIntents]);

  // ============================================================================
  // STEP 3: Poll for swap status (CORRECTED)
  // ============================================================================
  const startStatusPolling = useCallback((depositAddress: string) => {
    // Clear any existing interval
    if (statusPollIntervalRef.current) {
      clearInterval(statusPollIntervalRef.current);
    }

    if (!nearIntents) {
      // NEAR Intents not configured, cannot poll status
      console.warn('Cannot poll payment status: NEAR Intents not configured');
      return;
    }

    // Poll every 5 seconds
    statusPollIntervalRef.current = setInterval(async () => {
      try {
        if (!nearIntents) {
          // Stop polling if nearIntents becomes unavailable
          if (statusPollIntervalRef.current) {
            clearInterval(statusPollIntervalRef.current);
            statusPollIntervalRef.current = null;
          }
          return;
        }
        const status = await nearIntents.getPaymentStatus(depositAddress);
        
        setDepositState(prev => ({ ...prev, swapStatus: status }));

        // Log status for debugging
        console.log(`[Deposit Status] ${status.status}`, status);

        // Stop polling if swap is complete
        if (status.isComplete) {
          if (statusPollIntervalRef.current) {
            clearInterval(statusPollIntervalRef.current);
            statusPollIntervalRef.current = null;
          }

          if (status.isSuccess) {
            toast.success(`Successfully received ${status.receivedAmountFormatted} ${getTokenSymbol()}!`);
            // Refresh user balances
            await fetchUserBalances();
          } else if (status.isFailed) {
            toast.error(`Swap failed with status: ${status.status}`);
          } else if (status.status === 'REFUNDED') {
            toast.info("Payment was refunded to your NEAR wallet.");
          }

          // Reset deposit state after completion
          setTimeout(() => {
            setDepositState(prev => ({
              ...prev,
              depositAmount: '',
              depositAddress: null,
              depositMemo: null,
              nearTxHash: null,
            }));
          }, 5000);
        }
      } catch (error) {
        console.error("Error polling swap status:", error);
        // Don't stop polling on error, just log it
      }
    }, 5000); // Poll every 5 seconds
  }, [nearIntents, getTokenSymbol, fetchUserBalances]);

  // ============================================================================
  // STEP 2: Generate deposit address (CORRECTED)
  // ============================================================================
  const handleGenerateDepositAddress = useCallback(async () => {
    if (!depositState.depositAmount || parseFloat(depositState.depositAmount) <= 0) {
      toast.error("Please enter an amount to deposit");
      return;
    }

    if (!signedAccountId) {
      toast.error("Please connect your NEAR wallet");
      return;
    }

    if (!publicKey) {
      toast.error("Please connect your Solana wallet");
      return;
    }

    if (!nearIntents) {
      toast.error("NEAR Intents is not configured. Please set NEXT_PUBLIC_ONECLICK_JWT in your environment variables.");
      return;
    }

    try {
      setDepositState(prev => ({ ...prev, isGeneratingAddress: true }));
      
      const tokenSymbol = getTokenSymbol();
      
      // Check if token is supported by NearIntents before attempting to get quote
      const tokenSupport = await nearIntents.checkNearIntentSupport(tokenSymbol);
      if (!tokenSupport.supported) {
        // Token is not supported for NEAR payments (e.g., custom tokens like "DARK")
        toast.error(`Token ${tokenSymbol} is not supported for NEAR payments. Please use SOL to purchase this token.`);
        setDepositState(prev => ({ ...prev, isGeneratingAddress: false }));
        return;
      }
      
      const amountInYoctoNEAR = parseNearAmount(depositState.depositAmount) || "0";
      
      // Get payment quote with deposit address (dry=false)
      const quote = await nearIntents.getPaymentQuote({
        amount: amountInYoctoNEAR,
        paymentToken: "wNEAR",
        receiveToken: tokenSymbol,
        recipientAddress: publicKey.toString(),
        refundAddress: signedAccountId,
        slippage: 1.0
      });

      // Update state with quote details
      const purchaseInfo = {
        expectedOut: quote.expectedReceiveAmount,
        minAmountOut: quote.minReceiveAmount,
        timeEstimate: quote.estimatedTimeSeconds,
        slippageBps: quote.slippageBps,
        estimatedValueUsd: quote.estimatedValueUsd
      };

      setDepositState(prev => ({
        ...prev,
        depositAddress: quote.depositAddress,
        depositMemo: quote.depositMemo || null,
        purchaseInfo,
        isGeneratingAddress: false,
      }));

      // Start polling for status
      startStatusPolling(quote.depositAddress);
      
      toast.success("Deposit address generated! You can now send NEAR to this address.");
    } catch (error) {
      console.error("Error generating deposit address:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate deposit address");
      setDepositState(prev => ({ ...prev, isGeneratingAddress: false }));
    }
  }, [depositState.depositAmount, signedAccountId, publicKey, getTokenSymbol, nearIntents, startStatusPolling]);

  // ============================================================================
  // STEP 5: Manual status check (OPTIONAL - for "Check Status" button)
  // ============================================================================
  const handleCheckStatus = useCallback(async () => {
    if (!depositState.depositAddress) {
      toast.error("No deposit address found");
      return;
    }

    if (!nearIntents) {
      toast.error("NEAR Intents is not configured. Please set NEXT_PUBLIC_ONECLICK_JWT in your environment variables.");
      return;
    }

    try {
      setDepositState(prev => ({ ...prev, isSettling: true }));
      
      const status = await nearIntents.getPaymentStatus(depositState.depositAddress);
      
      setDepositState(prev => ({ 
        ...prev, 
        swapStatus: status,
        isSettling: false 
      }));

      // Show appropriate message based on status
      if (status.isSuccess) {
        toast.success(`Swap completed! Received ${status.receivedAmountFormatted} ${getTokenSymbol()}`);
        await fetchUserBalances();
      } else if (status.isFailed) {
        toast.error(`Swap failed: ${status.status}`);
      } else if (status.status === 'REFUNDED') {
        toast.info("Payment was refunded");
      } else {
        toast.info(`Current status: ${status.status}`);
      }
    } catch (error) {
      console.error("Error checking status:", error);
      toast.error("Failed to check status");
      setDepositState(prev => ({ ...prev, isSettling: false }));
    }
  }, [depositState.depositAddress, getTokenSymbol, nearIntents, fetchUserBalances]);

  // ============================================================================
  // STEP 4: Send NEAR transaction (CORRECTED)
  // ============================================================================
  const handleSendNearTransaction = useCallback(async () => {
    if (!depositState.depositAddress || !walletSelector || !signedAccountId) {
      toast.error("Please connect your NEAR wallet and generate a deposit address");
      return;
    }

    if (!depositState.depositAmount || parseFloat(depositState.depositAmount) <= 0) {
      toast.error("Please enter an amount to send");
      return;
    }

    try {
      setDepositState(prev => ({ ...prev, isSendingNear: true }));
      
      const selector = await walletSelector;
      const wallet = await selector.wallet();
      const amountInYoctoNEAR = parseNearAmount(depositState.depositAmount) || "0";

      console.log(`[NEAR Transfer] Sending ${depositState.depositAmount} NEAR (${amountInYoctoNEAR} yoctoNEAR) to ${depositState.depositAddress}`);

      // Send NEAR transfer using wallet selector
      // For simple NEAR transfers, we use the Transfer action type
      const result = await wallet.signAndSendTransactions({
        transactions: [
          {
            signerId: signedAccountId,
            receiverId: depositState.depositAddress,
            actions: [
              {
                type: "Transfer",
                params: {
                  deposit: amountInYoctoNEAR,
                },
              } as any, // Type assertion needed as wallet selector types may be incomplete
            ],
          },
        ],
      });

      // Extract transaction hash from result
      // Wallet selector can return different formats depending on wallet
      let txHash = "";
      
      if (Array.isArray(result)) {
        // Some wallets return array of results
        const firstResult = result[0];
        txHash = firstResult?.transaction?.hash || 
                 firstResult?.transaction_outcome?.id ||
                 "";
      } else {
        // Single result object
        txHash = (result as any)?.transaction?.hash || 
                 (result as any)?.transaction_outcome?.id ||
                 "";
      }

      if (!txHash) {
        console.warn("Transaction hash not found in result:", result);
        toast.warning("Transaction sent but hash not detected. Please wait for confirmation.");
      } else {
        console.log(`[NEAR Transfer] Transaction hash: ${txHash}`);
      }
      
      setDepositState(prev => ({ 
        ...prev, 
        nearTxHash: txHash || "pending",
        isSendingNear: false 
      }));

      toast.success("NEAR transaction sent! Processing payment...");

      // Notify 1Click if we have a transaction hash
      if (txHash && nearIntents) {
        try {
          await nearIntents.notifyPayment(
            depositState.depositAddress,
            txHash,
            depositState.depositMemo || undefined
          );
          console.log(`[1Click] Notified of payment: ${txHash}`);
        } catch (notifyError) {
          console.error("Error notifying 1Click:", notifyError);
          // Continue anyway - polling will detect the deposit
        }
      }
    } catch (error: any) {
      console.error("Error sending NEAR transaction:", error);
      
      // Handle specific error cases
      if (error?.message?.includes("User rejected")) {
        toast.error("Transaction cancelled by user");
      } else if (error?.message?.includes("balance")) {
        toast.error("Insufficient NEAR balance");
      } else {
        toast.error(error?.message || "Failed to send NEAR transaction");
      }
      
      setDepositState(prev => ({ ...prev, isSendingNear: false }));
    }
  }, [
    depositState.depositAddress, 
    depositState.depositAmount, 
    depositState.depositMemo,
    walletSelector, 
    signedAccountId, 
    nearIntents
  ]);

  // ============================================================================
  // HELPER: Format status for display
  // ============================================================================
  const getStatusDisplay = useCallback((status: string) => {
    const statusMap: Record<string, { icon: string; color: string; label: string }> = {
      'PENDING_DEPOSIT': { icon: '⏳', color: 'text-yellow-500', label: 'Waiting for deposit' },
      'PROCESSING': { icon: '🔄', color: 'text-blue-500', label: 'Processing swap' },
      'SUCCESS': { icon: '✅', color: 'text-green-500', label: 'Swap completed' },
      'INCOMPLETE_DEPOSIT': { icon: '⚠️', color: 'text-orange-500', label: 'Incomplete deposit' },
      'REFUNDED': { icon: '↩️', color: 'text-gray-500', label: 'Payment refunded' },
      'FAILED': { icon: '❌', color: 'text-red-500', label: 'Swap failed' }
    };
    
    return statusMap[status] || { icon: '❓', color: 'text-gray-500', label: status };
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (statusPollIntervalRef.current) {
        clearInterval(statusPollIntervalRef.current);
      }
    };
  }, []);

  // Handle deposit amount change
  const handleDepositAmountChange = useCallback((value: string) => {
    const raw = value.replace(/,/g, '');
    if (/^\d*\.?\d*$/.test(raw)) {
      setDepositState(prev => ({ ...prev, depositAmount: raw }));
      // Fetch purchase info when amount changes
      if (raw && parseFloat(raw) > 0) {
        fetchPurchaseInfo(raw);
      } else {
        setDepositState(prev => ({ ...prev, purchaseInfo: null }));
      }
    }
  }, [fetchPurchaseInfo]);

  // Copy deposit address to clipboard
  const handleCopyDepositAddress = useCallback(() => {
    if (depositState.depositAddress) {
      navigator.clipboard.writeText(depositState.depositAddress);
      toast.success("Deposit address copied to clipboard");
    }
  }, [depositState.depositAddress]);

  // Format address for display
  const formatAddress = useCallback((address: string | null) => {
    if (!address) return "";
    if (address.length <= 20) return address;
    return `${address.slice(0, 10)}...${address.slice(-10)}`;
  }, []);

  const phaseInfo = getPhaseInfo(state.tokenData.migrationProgress);

  // Get appropriate Tailwind classes based on phase color
  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { dot: string; text: string }> = {
      orange: { dot: 'bg-orange-600', text: 'text-orange-600' },
      blue: { dot: 'bg-blue-700', text: 'text-blue-700' },
      green: { dot: 'bg-green-600', text: 'text-green-600' },
      purple: { dot: 'bg-purple-600', text: 'text-purple-600' },
      emerald: { dot: 'bg-emerald-600', text: 'text-emerald-600' },
      gray: { dot: 'bg-gray-600', text: 'text-gray-600' }
    };
    return colorMap[color] || colorMap.gray;
  };

  const colorClasses = getColorClasses(phaseInfo.color);

  return (
    <div className="border border-[rgba(255,255,255,0.1)] rounded-lg relative block bg-[#0A0A0A] md:max-h-[950px]">
      <div className="flex flex-col gap-3 p-3 md:p-4 rounded-t-lg rounded-b-none">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-2.5 h-2.5 rounded-full ${colorClasses.dot} animate-pulse`}></div>
          <span className={`font-share-tech-mono font-medium ${colorClasses.text}`}>{phaseInfo.label}</span>
        </div>
        <div className="flex flex-col">
            <div className="font-rajdhani text-3xl font-bold text-[#d08700]">
              {state.loading || isPending ? '...' : `$${formatNumberToCurrency(state.tokenData.marketCap)}`}
            </div>
            <div className="font-share-tech-mono text-xs text-gray-500">MARKET CAP</div>
        </div>

        <div className="grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-4 xl:gap-10 w-full">
            <div>
                <div className="font-rajdhani text-lg font-semibold text-white">
                  {state.loading || isPending ? '...' : `$${formatTokenPrice(state.tokenData.price)}`}
                </div>
                <div className="font-share-tech-mono text-sm text-gray-500">CURRENT PRICE</div>
            </div>
            <div>
                <div className="font-rajdhani text-lg font-semibold text-white">
                  {state.loading || isPending ? '...' : state.tokenData.holders}
                </div>
                <div className="font-share-tech-mono text-sm text-gray-500">HOLDERS</div>
            </div>
            <div className="col-span-2 md:col-span-1">
                <div className="font-rajdhani text-lg font-semibold text-white">
                  {state.loading || isPending ? '...' : `$${formatNumberToCurrency(state.tokenData.targetRaise)}`}
                </div>
                <div className="font-share-tech-mono text-sm text-gray-500">TARGET RAISE</div>
            </div>
        </div>
      </div>

      <div className="border border-[rgba(255,255,255,0.1)] p-3 rounded-t-2xl bg-[#111111] w-full">
        <Tabs className="w-full rounded-lg" defaultValue="trade">
          <TabsList className="w-full bg-[#1A1A1A] p-1">
            <TabsTrigger 
              value="trade" 
              className="w-full rounded-lg flex gap-2 items-center data-[state=active]:bg-[#2A2A2A] data-[state=active]:text-white text-gray-400"
            >
              <img src="/icons/trade-up.svg" alt="Trade" className="w-5 h-5 invert" />
              <span>Trade</span>
            </TabsTrigger>
            <TabsTrigger 
              value="deposit" 
              className="w-full rounded-lg flex gap-2 items-center data-[state=active]:bg-[#2A2A2A] data-[state=active]:text-white text-gray-400"
            >
              <Download className="w-4 h-4" />
              <span>Deposit</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="trade">
            <div className="relative">
              <div className="bg-[#1A1A1A] rounded-lg p-4 mb-4 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-400">You Pay</div>
                  {publicKey && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Wallet className="w-3 h-3" />
                      <span>
                        {state.loadingBalances ? '...' : `${formatBalance(currentBalance)} ${state.payIsSol ? 'SOL' : getTokenSymbol()}`}
                      </span>
                      <button
                        onClick={() => {
                          const maxAmount = state.payIsSol
                            ? Math.max(0, currentBalance - GAS_RESERVE)
                            : currentBalance;
                          if (maxAmount > 0) {
                            handleAmountPayChange(maxAmount.toString());
                          }
                        }}
                        className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium hover:bg-blue-500/30 transition-colors"
                      >
                        MAX
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={state.amountPay}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, '');
                      if (/^\d*\.?\d*$/.test(raw)) {
                        handleAmountPayChange(raw);
                      }
                    }}
                    onBlur={() => {
                      if (state.amountPay) {
                        const formatted = parseFloat(state.amountPay).toLocaleString('en-US', {
                          maximumFractionDigits: MAX_FRACTION_DIGITS,
                        });
                        dispatch({ type: 'SET_AMOUNT_PAY', payload: formatted });
                      }
                    }}
                    inputMode="decimal"
                    className={`w-full text-3xl font-semibold bg-transparent border-none focus:ring-0 focus:ring-offset-0 focus:border-none focus:outline-none text-white placeholder:text-gray-600 ${
                      hasInsufficientBalance ? 'text-red-500' : ''
                    }`}
                    placeholder="0.00"
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 bg-[#2A2A2A] border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-[#333333] transition-colors text-white">
                        <div className="w-6 h-6">
                          <img src={state.payIsSol ? "/chains/solana_light.svg" : getIpfsUrl(getTokenUri())} alt={state.payIsSol ? "Solana" : getTokenSymbol()} className="w-full h-full rounded-full" />
                        </div>
                        <span>{state.payIsSol ? 'SOL' : getTokenSymbol()}</span>
                        <div className="relative w-4 h-4">
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px] bg-[#1A1A1A] border-white/10 text-white">
                      {tokenOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.name}
                          className="cursor-pointer hover:bg-[#2A2A2A] focus:bg-[#2A2A2A] focus:text-white"
                          onClick={() => {
                            dispatch({ type: 'SWITCH_TOKEN', payload: option.name === 'SOL' });
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <img src={option.name !== 'SOL' ? getIpfsUrl(option.icon) : '/chains/solana_light.svg'} alt={option.name} className="w-5 h-5 rounded-full" />
                            <span>{option.name}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {hasInsufficientBalance && (
                  <div className="text-xs text-red-500 mt-1">
                    Insufficient balance. You need {formatBalance(
                      Math.abs(currentBalance - parseFloat(state.amountPay.replace(/,/g, '') || '0') - (state.payIsSol ? GAS_RESERVE : 0))
                    )} more {state.payIsSol ? 'SOL' : getTokenSymbol()}
                  </div>
                )}
                {!hasInsufficientBalance && (
                  <div className="text-sm text-gray-500 mt-1">-</div>
                )}
              </div>

              <div className="bg-[#1A1A1A] rounded-lg p-4 mb-6 border border-white/5">
                <div className="text-sm text-gray-400 mb-2">You Receive</div>
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={state.amountReceive ? parseFloat(state.amountReceive).toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: MAX_FRACTION_DIGITS,
                    }) : ''}
                    className="w-full text-3xl font-semibold bg-transparent border-none focus:ring-0 focus:ring-offset-0 focus:border-none focus:outline-none text-white placeholder:text-gray-600"
                    placeholder="0.00"
                    disabled
                  />
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 border border-white/10 bg-[#2A2A2A] text-white">
                    <div className="h-6 w-6">
                      <img src={state.payIsSol ? getIpfsUrl(getTokenUri()) : "/chains/solana_light.svg"} alt={state.payIsSol ? token.name : 'Solana'} className="w-6 h-6 rounded-full" />
                    </div>
                    <span className="text-lg">{state.payIsSol ? getTokenSymbol() : 'SOL'}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-500 mt-1">-</div>
              </div>

              <Button
                onClick={handleBuyAndSell}
                disabled={state.isBuying || !publicKey || !state.amountPay || state.amountPay.trim() === '' || hasInsufficientBalance}
                className={`w-full ${
                  publicKey && !state.isBuying && !hasInsufficientBalance
                    ? "bg-red-500 hover:bg-red-600 cursor-pointer"
                    : "bg-red-300 hover:bg-red-200 cursor-not-allowed"
                } text-white font-medium py-6 rounded-lg mb-4`}
              >
                {!publicKey
                  ? 'Connect Wallet'
                  : hasInsufficientBalance
                    ? 'Insufficient Balance'
                    : state.payIsSol
                      ? `Buy ${getTokenSymbol() || 'ZAUNCHPAD'}`
                      : `Sell ${getTokenSymbol() || 'ZAUNCHPAD'}`
                }
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="deposit">
            <div className="flex flex-col space-y-2 mb-5">
              <div className="bg-[#1A1A1A] rounded-lg p-4 mb-4 border border-white/5">
                <label className="text-sm text-gray-400 mb-2">You Pay</label>
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={depositState.depositAmount}
                    onChange={(e) => handleDepositAmountChange(e.target.value)}
                    onBlur={() => {
                      if (depositState.depositAmount) {
                        const formatted = parseFloat(depositState.depositAmount).toLocaleString('en-US', {
                          maximumFractionDigits: MAX_FRACTION_DIGITS,
                        });
                        setDepositState(prev => ({ ...prev, depositAmount: formatted }));
                      }
                    }}
                    className="w-full text-3xl font-semibold bg-transparent border-none focus:ring-0 focus:ring-offset-0 focus:border-none focus:outline-none text-white placeholder:text-gray-600"
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                  <button className="flex items-center gap-2 bg-[#2A2A2A] border border-white/10 rounded-lg px-3 py-2 text-white">
                    <img src="/logos/near.svg" alt="NEAR" className="w-5 h-5" />
                    <span className="mr-5">NEAR</span>
                  </button>
                </div>
                {depositState.isLoadingPurchaseInfo ? (
                  <div className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Loading purchase info...</span>
                  </div>
                ) : depositState.purchaseInfo ? (
                  <div className="text-sm text-gray-400 mt-1">
                    You will receive approximately {formatBalance(parseFloat(depositState.purchaseInfo.expectedOut || "0"), 4)} {getTokenSymbol()}
                    {depositState.purchaseInfo.minAmountOut && (
                      <span className="block text-xs text-gray-500 mt-1">
                        Minimum: {formatBalance(parseFloat(depositState.purchaseInfo.minAmountOut || "0"), 4)} {getTokenSymbol()}
                      </span>
                    )}
                    {depositState.purchaseInfo.timeEstimate && (
                      <span className="block text-xs text-gray-500 mt-1">
                        Estimated time: {depositState.purchaseInfo.timeEstimate} seconds
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-gray-500 mt-1">-</span>
                )}
              </div>

              {depositState.depositAddress ? (
                <>
                  <Card className="shadow-none p-3 py-4 space-y-4 bg-[#1A1A1A] border-white/10 text-white">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-white">Use this deposit address</h3>
                      <p className="text-xs font-extralight text-gray-400">Always double-check your deposit address — it may change without notice.</p>
                    </div>
                    <div className="h-px w-full bg-white/10 mt-2 mb-2"/>
                    <div className="flex flex-col space-y-5 justify-center items-center">
                      <div className="border border-white/10 p-1 rounded-lg bg-white">
                        <QRCodeSVG value={depositState.depositAddress} size={160} level="M" />
                      </div>
                      <div className="p-1 flex justify-between items-center px-2 w-full bg-[#2A2A2A] rounded-lg">
                        <span className="text-sm font-mono text-gray-200">{formatAddress(depositState.depositAddress)}</span>
                        <Button 
                          onClick={handleCopyDepositAddress}
                          className="bg-[#333] shadow-none border-none hover:bg-[#444] p-1 px-2 h-8"
                        >
                          <Copy className="w-3 h-3 text-gray-300" />
                        </Button>
                      </div>
                    </div>
                    <div className="pt-3">
                      <div className="p-3 flex flex-col space-y-1 border border-orange-500/30 bg-orange-950/20 rounded-lg">
                        <h3 className="text-sm font-medium text-orange-500">Only deposit NEAR from the NEAR network</h3>
                        <p className="text-xs font-extralight text-orange-400/80">Depositing other assets or using a different network will result in loss of funds.</p>
                      </div>
                    </div>
                  </Card>

                  {/* Send NEAR Button - Show if address generated but no transaction sent yet */}
                  {!depositState.nearTxHash && !depositState.swapStatus?.isComplete && (
                    <Button
                      onClick={handleSendNearTransaction}
                      disabled={depositState.isSendingNear || !signedAccountId || !depositState.depositAmount}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6 rounded-lg mb-4"
                    >
                      {depositState.isSendingNear ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                          Sending NEAR...
                        </>
                      ) : !signedAccountId ? (
                        "Connect NEAR Wallet"
                      ) : (
                        `Send ${depositState.depositAmount} NEAR`
                      )}
                    </Button>
                  )}

                  {/* Transaction Hash Display */}
                  {depositState.nearTxHash && (
                    <Card className="shadow-none p-3 space-y-2 w-full bg-[#1A1A1A] border-white/10 text-white mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Transaction Hash:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-200">{formatAddress(depositState.nearTxHash)}</span>
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(depositState.nearTxHash || "");
                              toast.success("Transaction hash copied!");
                            }}
                            className="bg-[#333] shadow-none border-none hover:bg-[#444] p-1 px-2 h-6"
                          >
                            <Copy className="w-3 h-3 text-gray-300" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Swap Status Display */}
                  {depositState.swapStatus && (
                    <Card className="shadow-none p-3 space-y-3 w-full bg-[#1A1A1A] border-white/10 text-white mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        {depositState.swapStatus.isComplete ? (
                          depositState.swapStatus.isSuccess ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )
                        ) : (
                          <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
                        )}
                        <h3 className="text-sm font-semibold text-white">
                          {depositState.swapStatus.isComplete
                            ? depositState.swapStatus.isSuccess
                              ? "Swap Completed"
                              : "Swap Failed"
                            : "Processing Swap"}
                        </h3>
                      </div>
                      {depositState.swapStatus.status && (
                        <div className="text-xs text-gray-400">
                          Status: <span className="font-medium text-gray-300">{depositState.swapStatus.status}</span>
                        </div>
                      )}
                      {depositState.swapStatus.receivedAmountFormatted && (
                        <div className="text-xs text-gray-400">
                          Received: <span className="font-medium text-gray-300">{depositState.swapStatus.receivedAmountFormatted} {getTokenSymbol()}</span>
                        </div>
                      )}
                      {depositState.swapStatus.depositedAmountFormatted && (
                        <div className="text-xs text-gray-400">
                          Deposited: <span className="font-medium text-gray-300">{depositState.swapStatus.depositedAmountFormatted} NEAR</span>
                        </div>
                      )}
                      {depositState.swapStatus.destinationTxHashes && depositState.swapStatus.destinationTxHashes.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs text-gray-400">Transaction:</span>
                          {depositState.swapStatus.destinationTxHashes.map((tx: any, idx: number) => (
                            <a
                              key={idx}
                              href={tx.explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                              View on explorer <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Check Status Button - Show if transaction sent but not complete */}
                  {depositState.nearTxHash && !depositState.swapStatus?.isComplete && (
                    <Button
                      onClick={handleCheckStatus}
                      disabled={depositState.isSettling}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6 rounded-lg"
                    >
                      {depositState.isSettling ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                          Checking Status...
                        </>
                      ) : (
                        "Check Status"
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Card className="shadow-none p-3 space-y-4 w-full bg-[#1A1A1A] border-white/10 text-white">
                    <div className="flex justify-between w-full items-center text-xs text-gray-400">
                      <span>Minimum Deposit</span>
                      <span>0.001 NEAR</span>
                    </div>
                    <div className="flex justify-between w-full items-center text-xs text-gray-400">
                      <span>Processing Time</span>
                      <span>~5 mins</span>
                    </div>
                    {depositState.purchaseInfo?.slippageBps && (
                      <div className="flex justify-between w-full items-center text-xs text-gray-400">
                        <span>Slippage Tolerance</span>
                        <span>{(depositState.purchaseInfo.slippageBps / 100).toFixed(2)}%</span>
                      </div>
                    )}
                  </Card>
                  <Button
                    onClick={handleGenerateDepositAddress}
                    disabled={!depositState.depositAmount || parseFloat(depositState.depositAmount) <= 0 || depositState.isGeneratingAddress || !signedAccountId || !publicKey}
                    className={`w-full ${
                      depositState.depositAmount && parseFloat(depositState.depositAmount) > 0 && signedAccountId && publicKey && !depositState.isGeneratingAddress
                        ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                        : "bg-[#2A2A2A] hover:bg-[#2A2A2A] text-gray-500 cursor-not-allowed"
                    } text-white font-medium py-6 rounded-lg`}
                  >
                    {depositState.isGeneratingAddress ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                        Generating Address...
                      </>
                    ) : !signedAccountId ? (
                      "Connect NEAR Wallet"
                    ) : !publicKey ? (
                      "Connect Solana Wallet"
                    ) : (
                      `Buy ${getTokenSymbol()} with NEAR`
                    )}
                  </Button>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="p-3 md:p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">Trade on DEX</h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>DBC is a virtual pool bonding curve. DEX trading is only available on mainnet via Jupiter, Photon, and Axiom.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-col gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="border border-white/10 bg-[#111] p-3 rounded-lg flex items-center justify-between opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="relative w-9 h-9">
                    <img src="/logos/meteora.png" alt="Meteora" className="w-9 h-9 rounded-full" />
                    <div className="absolute -bottom-1 right-0 w-4 h-4 rounded-sm bg-black flex items-center justify-center">
                        <img src="/chains/solana_light.svg" alt="Solana" className="w-3 h-3" />
                    </div>
                  </div>
                  <span>Trade on Meteora</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <ExternalLink className="w-5 h-5" />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm border border-white/10 bg-[#1A1A1A] text-white">
              <p>Meteora DLMM pools are not compatible with DBC virtual pools. Use Jupiter, Photon, or Axiom instead.</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className={`border border-white/10 bg-[#111] p-3 rounded-lg flex items-center justify-between transition-colors ${
                    SOL_NETWORK === 'mainnet' ? 'hover:bg-[#1A1A1A] cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  }`}>
                    <div className="flex items-center gap-2 text-white">
                      <span>Trade on another DEX</span>
                    </div>
                    <div className="flex items-center gap-2 text-white">
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1A1A1A] border-white/10 text-white" align="start">
              <DropdownMenuGroup>
                <DropdownMenuItem 
                  className="flex items-center justify-between gap-3 p-3 cursor-pointer hover:bg-[#2A2A2A] focus:bg-[#2A2A2A] focus:text-white"
                  onClick={() => {
                    if (SOL_NETWORK === 'mainnet') {
                      window.open(`https://jup.ag/swap/SOL-${address}`, "_blank");
                    }
                  }}
                  disabled={SOL_NETWORK !== 'mainnet'}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                        J
                      </div>
                      <div className="absolute -bottom-1 right-0 w-3 h-3 rounded-sm bg-black flex items-center justify-center">
                        <img src="/chains/solana_light.svg" alt="Solana" className="w-2 h-2" />
                      </div>
                    </div>
                    <span>Jupiter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-6 h-6" />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="flex justify-between items-center gap-3 p-3 cursor-pointer hover:bg-[#2A2A2A] focus:bg-[#2A2A2A] focus:text-white"
                  onClick={() => {
                    if (SOL_NETWORK === 'mainnet' && state.tokenData.poolAddress) {
                      window.open(`https://app.meteora.ag/dlmm/${state.tokenData.poolAddress}`, "_blank");
                    }
                  }}
                  disabled={SOL_NETWORK !== 'mainnet'}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8">
                      <img src="/logos/meteora.png" alt="Meteora" className="w-8 h-8 rounded-full" />
                      <div className="absolute -bottom-1 right-0 w-3 h-3 rounded-sm bg-black flex items-center justify-center">
                        <img src="/chains/solana_light.svg" alt="Solana" className="w-2 h-2" />
                      </div>
                    </div>
                    <span>Meteora</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-6 h-6" />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="flex justify-between items-center gap-3 p-3 cursor-pointer hover:bg-[#2A2A2A] focus:bg-[#2A2A2A] focus:text-white"
                  onClick={() => {
                    if (SOL_NETWORK === 'mainnet') {
                      window.open(`https://axiom.trade/?inputMint=So11111111111111111111111111111111111111112&outputMint=${address}`, "_blank");
                    }
                  }}
                  disabled={SOL_NETWORK !== 'mainnet'}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                        A
                      </div>
                      <div className="absolute -bottom-1 right-0 w-3 h-3 rounded-sm bg-black flex items-center justify-center">
                        <img src="/chains/solana_light.svg" alt="Solana" className="w-2 h-2" />
                      </div>
                    </div>
                    <span>Axiom</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-6 h-6" />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="flex justify-between items-center gap-3 p-3 cursor-pointer hover:bg-[#2A2A2A] focus:bg-[#2A2A2A] focus:text-white"
                  onClick={() => {
                    if (SOL_NETWORK === 'mainnet') {
                      window.open(`https://photon-sol.tinyastro.io/en/lp/${address}`, "_blank");
                    }
                  }}
                  disabled={SOL_NETWORK !== 'mainnet'}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white font-bold text-xs">
                        P
                      </div>
                      <div className="absolute -bottom-1 right-0 w-3 h-3 rounded-sm bg-black flex items-center justify-center">
                        <img src="/chains/solana_light.svg" alt="Solana" className="w-2 h-2" />
                      </div>
                    </div>
                    <span>Photon</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-6 h-6" />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            {SOL_NETWORK !== 'mainnet' && (
              <TooltipContent>
                <p>DEX trading is only available on mainnet. You're currently on {SOL_NETWORK}.</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export const TradingInterface = memo(TradingInterfaceComponent);
