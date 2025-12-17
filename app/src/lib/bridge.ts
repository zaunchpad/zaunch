/**
 * DeBridge Cross-Chain Bridge Library (dePort)
 * 
 * This library provides functions to bridge tokens from Solana to other chains
 * using the DeBridge dePort API (lock-and-mint approach).
 * 
 * Documentation: https://docs.debridge.com/dePort/getting-started
 * Widget: https://app.debridge.finance/deport
 */

import { Connection, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { DEBRIDGE_DLN_API_BASE, DEBRIDGE_STATS_API_BASE } from '@/configs/env.config';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * DeBridge Chain IDs
 */
export enum ChainId {
  // EVM Chains
  ETHEREUM = 1,
  BSC = 56,
  POLYGON = 137,
  AVALANCHE = 43114,
  ARBITRUM = 42161,
  OPTIMISM = 10,
  BASE = 8453,
  LINEA = 59144,
  FANTOM = 250,
  
  // Non-EVM Chains
  SOLANA = 7565164,
}

/**
 * Supported chains map for easy lookup
 */
export const SUPPORTED_CHAINS = {
  ethereum: { id: ChainId.ETHEREUM, name: 'Ethereum', nativeToken: 'ETH' },
  bsc: { id: ChainId.BSC, name: 'BNB Chain', nativeToken: 'BNB' },
  polygon: { id: ChainId.POLYGON, name: 'Polygon', nativeToken: 'MATIC' },
  avalanche: { id: ChainId.AVALANCHE, name: 'Avalanche', nativeToken: 'AVAX' },
  arbitrum: { id: ChainId.ARBITRUM, name: 'Arbitrum', nativeToken: 'ETH' },
  optimism: { id: ChainId.OPTIMISM, name: 'Optimism', nativeToken: 'ETH' },
  base: { id: ChainId.BASE, name: 'Base', nativeToken: 'ETH' },
  linea: { id: ChainId.LINEA, name: 'Linea', nativeToken: 'ETH' },
  fantom: { id: ChainId.FANTOM, name: 'Fantom', nativeToken: 'FTM' },
  solana: { id: ChainId.SOLANA, name: 'Solana', nativeToken: 'SOL' },
} as const;

export type SupportedChainKey = keyof typeof SUPPORTED_CHAINS;

/**
 * dePort transaction creation response
 */
export interface DePortTransactionResponse {
  tx: {
    data: string; // hex-encoded transaction
    meta?: {
      srcChainTokenIn?: {
        address: string;
        amount: string;
        decimals: number;
        symbol: string;
        name: string;
      };
      dstChainTokenOut?: {
        address: string;
        amount: string;
        decimals: number;
        symbol: string;
        name: string;
      };
    };
  };
  orderId?: string;
}

/**
 * Order status
 */
export enum OrderStatus {
  NONE = 'None',
  CREATED = 'Created',
  FULFILLED = 'Fulfilled',
  SENT_UNLOCK = 'SentUnlock',
  CLAIMED_UNLOCK = 'ClaimedUnlock',
  CANCELLED = 'Cancelled',
  SENT_ORDER_CANCEL = 'SentOrderCancel',
  CLAIMED_CANCEL = 'ClaimedCancel',
}

/**
 * Order tracking info
 */
export interface OrderInfo {
  orderId: string;
  status: OrderStatus;
  give: {
    chainId: number;
    tokenAddress: string;
    amount: string;
  };
  take: {
    chainId: number;
    tokenAddress: string;
    amount: string;
  };
  makerOrderNonce: string;
  makerSrc: string;
  giveTokenAddress: string;
  takeTokenAddress: string;
  takeChainId: number;
  receiverDst: string;
  givePatchAuthoritySrc: string;
  orderAuthorityAddressDst: string;
  allowedTakerDst: string | null;
  externalCall: any | null;
  allowedCancelBeneficiarySrc: string | null;
}

/**
 * Bridge parameters for dePort
 */
export interface DePortBridgeParams {
  srcChainId: ChainId;
  srcChainTokenIn: string; // Token address on source chain
  srcChainTokenInAmount: string; // Amount with decimals
  dstChainId: ChainId;
  dstChainTokenOutRecipient: string; // Recipient address on destination chain
  srcChainOrderAuthorityAddress: string; // Authority on source chain (user wallet)
  dstChainOrderAuthorityAddress?: string; // Optional: Authority on dest chain (defaults to recipient)
  affiliateFeePercent?: number; // Optional fee (e.g., 0.1 for 0.1%)
  affiliateFeeRecipient?: string; // Your fee recipient address
}

// ============================================================================
// API CONFIGURATION
// ============================================================================

const DEPORT_API_BASE = DEBRIDGE_DLN_API_BASE;
const STATS_API_BASE = DEBRIDGE_STATS_API_BASE;

// ============================================================================
// CORE BRIDGE FUNCTIONS
// ============================================================================

/**
 * Create a dePort bridge transaction
 * 
 * dePort uses a lock-and-mint approach:
 * 1. Token is locked on source chain (Solana)
 * 2. Synthetic wrapped token (deAsset) is minted on destination chain
 * 3. No liquidity required - works for any arbitrary token
 * 
 * IMPORTANT: Sign and submit the transaction within 30 seconds
 * 
 * @param params - Bridge parameters
 * @returns Promise with transaction data
 */
export async function createDePortBridge(
  params: DePortBridgeParams
): Promise<DePortTransactionResponse> {
  const queryParams = new URLSearchParams({
    srcChainId: params.srcChainId.toString(),
    srcChainTokenIn: params.srcChainTokenIn,
    srcChainTokenInAmount: params.srcChainTokenInAmount,
    dstChainId: params.dstChainId.toString(),
    dstChainTokenOutRecipient: params.dstChainTokenOutRecipient,
    srcChainOrderAuthorityAddress: params.srcChainOrderAuthorityAddress,
    // For dePort, the destination token is automatically the wrapped version
    // so we don't specify dstChainTokenOut - it will be created automatically
  });

  // Add optional destination authority (defaults to recipient if not provided)
  if (params.dstChainOrderAuthorityAddress) {
    queryParams.append('dstChainOrderAuthorityAddress', params.dstChainOrderAuthorityAddress);
  }

  if (params.affiliateFeePercent) {
    queryParams.append('affiliateFeePercent', params.affiliateFeePercent.toString());
  }
  if (params.affiliateFeeRecipient) {
    queryParams.append('affiliateFeeRecipient', params.affiliateFeeRecipient);
  }

  const url = `${DEPORT_API_BASE}/deport/order/create-tx?${queryParams.toString()}`;
  
  console.log('dePort API request:', url);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('dePort API error:', errorText);
    throw new Error(`DeBridge dePort API Error: ${response.statusText}. ${errorText}`);
  }

  const data: DePortTransactionResponse = await response.json();
  
  if (!data.tx) {
    throw new Error('No transaction data returned from dePort API');
  }

  console.log('dePort transaction created:', data);

  return data;
}

/**
 * Execute dePort bridge transaction on Solana
 * 
 * @param connection - Solana connection
 * @param transactionData - Hex-encoded transaction from createDePortBridge
 * @param signTransaction - Wallet's sign transaction function
 * @returns Promise with transaction signature
 */
export async function executeSolanaDePortBridge(
  connection: Connection,
  transactionData: string,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>
): Promise<string> {
  try {
    // Decode hex string to buffer
    const buffer = Buffer.from(transactionData, 'hex');
    
    // Deserialize to VersionedTransaction
    const transaction = VersionedTransaction.deserialize(buffer);
    
    // Sign transaction with user's wallet
    const signedTx = await signTransaction(transaction);
    
    // Send transaction
    const signature = await connection.sendTransaction(signedTx, {
      skipPreflight: false,
      maxRetries: 3,
    });
    
    // Confirm transaction
    await connection.confirmTransaction(signature, 'confirmed');
    
    return signature;
  } catch (error) {
    throw new Error(`Failed to execute dePort bridge transaction: ${error}`);
  }
}

/**
 * Get order ID from transaction hash
 * Use this after submitting the bridge transaction
 * 
 * @param txHash - Transaction hash
 * @returns Promise with array of order IDs
 */
export async function getOrderIdFromTx(txHash: string): Promise<string[]> {
  const url = `${STATS_API_BASE}/Transaction/${txHash}/orderIds`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get order IDs: ${response.statusText}. ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`DeBridge API Error: ${data.error}`);
  }

  return data.orderIds || [];
}

/**
 * Get order status and details
 * 
 * Order is considered complete when status is:
 * - Fulfilled
 * - SentUnlock
 * - ClaimedUnlock
 * 
 * @param orderId - Order ID to track
 * @returns Promise with order information
 */
export async function getOrderStatus(orderId: string): Promise<OrderInfo> {
  const url = `${STATS_API_BASE}/Orders/${orderId}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get order status: ${response.statusText}. ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`DeBridge API Error: ${data.error}`);
  }

  return data;
}

/**
 * Check if order is complete
 * 
 * @param status - Order status
 * @returns true if order is successfully completed
 */
export function isOrderComplete(status: OrderStatus): boolean {
  return [
    OrderStatus.FULFILLED,
    OrderStatus.SENT_UNLOCK,
    OrderStatus.CLAIMED_UNLOCK,
  ].includes(status);
}

/**
 * Get order details by creation transaction hash
 * 
 * @param txHash - Transaction hash that created the order
 * @returns Promise with order information
 */
export async function getOrderByTxHash(txHash: string): Promise<OrderInfo> {
  const url = `${STATS_API_BASE}/Orders/creationTxHash/${txHash}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get order by tx hash: ${response.statusText}. ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`DeBridge API Error: ${data.error}`);
  }

  return data;
}

/**
 * Get all orders for a wallet address
 * 
 * @param walletAddress - User's wallet address
 * @param options - Optional filtering options
 * @returns Promise with array of orders
 */
export async function getUserOrders(
  walletAddress: string,
  options?: {
    skip?: number;
    take?: number;
    orderStates?: OrderStatus[];
  }
): Promise<{ orders: OrderInfo[]; total: number }> {
  const url = `${STATS_API_BASE}/Orders/filteredList`;
  
  const requestBody = {
    skip: options?.skip || 0,
    take: options?.take || 20,
    maker: walletAddress,
    orderStates: options?.orderStates || undefined,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get user orders: ${response.statusText}. ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`DeBridge API Error: ${data.error}`);
  }

  return {
    orders: data.orders || [],
    total: data.totalCount || 0,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get supported chains list
 * 
 * @returns Array of supported chains
 */
export function getSupportedChains() {
  return Object.entries(SUPPORTED_CHAINS).map(([key, value]) => ({
    key: key as SupportedChainKey,
    ...value,
  }));
}

/**
 * Get chain info by ID
 * 
 * @param chainId - Chain ID
 * @returns Chain info or undefined
 */
export function getChainInfo(chainId: ChainId) {
  return Object.values(SUPPORTED_CHAINS).find(chain => chain.id === chainId);
}

/**
 * Format amount for display
 * 
 * @param amount - Amount string with decimals
 * @param decimals - Token decimals
 * @returns Formatted amount as number
 */
export function formatBridgeAmount(amount: string, decimals: number): number {
  return Number(amount) / Math.pow(10, decimals);
}

/**
 * Parse amount to send to API
 * 
 * @param amount - Human-readable amount (e.g., "100.5")
 * @param decimals - Token decimals
 * @returns Amount string with decimals
 */
export function parseBridgeAmount(amount: string | number, decimals: number): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return (value * Math.pow(10, decimals)).toFixed(0);
}

/**
 * Estimate bridge time for dePort
 * dePort typically completes in 2-5 minutes
 * 
 * @param srcChainId - Source chain ID
 * @param dstChainId - Destination chain ID
 * @returns Estimated time in seconds
 */
export function estimateBridgeTime(srcChainId: ChainId, dstChainId: ChainId): number {
  // dePort is typically 2-5 minutes
  return 180; // 3 minutes average
}

/**
 * Validate wallet address format
 * 
 * @param address - Wallet address
 * @param chainId - Chain ID
 * @returns true if valid
 */
export function isValidAddress(address: string, chainId: ChainId): boolean {
  if (chainId === ChainId.SOLANA) {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
  
  // EVM chains: starts with 0x and is 42 characters
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get the wrapped token symbol for display
 * dePort automatically creates wrapped tokens (deAssets)
 * 
 * @param tokenSymbol - Original token symbol
 * @returns Wrapped token symbol (e.g., "deCAT")
 */
export function getWrappedTokenSymbol(tokenSymbol: string): string {
  return `de${tokenSymbol}`;
}

// ============================================================================
// USAGE EXAMPLE (commented out)
// ============================================================================

/*
// Example: Bridge CAT token from Solana to Base

import { Connection, clusterApiUrl } from '@solana/web3.js';

async function bridgeExample() {
  const connection = new Connection(clusterApiUrl('mainnet-beta'));
  
  // 1. Create dePort bridge order
  const order = await createDePortBridge({
    srcChainId: ChainId.SOLANA,
    srcChainTokenIn: 'D6M7cYVuRDci76MoLa1bgdh6sTzGPw9xYrttbuzvfFhH', // CAT token
    srcChainTokenInAmount: parseBridgeAmount('100', 9), // 100 CAT
    dstChainId: ChainId.BASE,
    dstChainTokenOutRecipient: '0xYourBaseAddress...',
    srcChainOrderAuthorityAddress: 'YourSolanaAddress...',
    dstChainOrderAuthorityAddress: '0xYourBaseAddress...', // Optional
  });
  
  console.log('You will receive deCAT (wrapped CAT) on Base');
  
  // 2. Execute transaction (sign within 30 seconds!)
  const signature = await executeSolanaDePortBridge(
    connection,
    order.tx.data,
    wallet.signTransaction
  );
  
  console.log('Bridge transaction submitted:', signature);
  
  // 3. Track order status
  const orderIds = await getOrderIdFromTx(signature);
  const orderId = orderIds[0];
  
  // Poll for status
  const checkStatus = async () => {
    const status = await getOrderStatus(orderId);
    console.log('Order status:', status.status);
    
    if (isOrderComplete(status.status)) {
      console.log('Bridge complete! You received deCAT on Base');
    } else {
      setTimeout(checkStatus, 10000); // Check every 10 seconds
    }
  };
  
  checkStatus();
}
*/