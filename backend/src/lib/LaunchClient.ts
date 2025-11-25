import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import BN from 'bn.js';

import { getQuoteDecimals, modifyComputeUnitPriceIx } from '../helpers';
import {
  createDbcConfig,
  createDbcPool,
  claimTradingFee,
  migrateDammV1,
  migrateDammV2,
} from '../lib/dbc';
import type { DbcConfig, DbcSwap } from '../types/dbc';

/**
 * LaunchClient provides functionality for creating and managing token launches using Dynamic Bonding Curve (DBC).
 * It handles token creation, DBC pool setup, and trading operations.
 */
export class LaunchClient {
  private readonly connection: Connection;

  /**
   * Creates a new LaunchClient instance with WalletContextState (Browser).
   *
   * @param connection - The Solana connection for blockchain interactions
   * @param wallet - The wallet context state from browser wallet adapter
   */
  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Creates a DBC config.
   *
   * @param config - The DBC config
   * @param payer - The wallet to use for the transaction
   * @param quoteMint - The quote mint
   * @returns Promise resolving to the public key of the DBC config
   */
  async createDbcConfig(
    config: DbcConfig,
    payer: PublicKey,
    dbcConfigKey: Keypair,
    quoteMint: PublicKey,
  ): Promise<VersionedTransaction | Transaction> {
    return await createDbcConfig(config, this.connection, payer, dbcConfigKey, quoteMint);
  }

  /**
   * Deploys a token using DBC (Dynamic Bonding Curve) pool.
   *
   * @param dbcConfig - DBC configuration for the pool
   * @param quoteMint - The quote mint (usually SOL or USDC)
   * @returns Promise resolving to the base mint keypair of the deployed token
   */
  async deployToken(
    dbcConfig: DbcConfig,
    payer: PublicKey,
    baseMint: Keypair,
    dbcConfigKey: Keypair,
  ): Promise<Transaction> {
    console.log('\n> Starting token deployment with DBC...');
    return await createDbcPool(dbcConfig, this.connection, payer, baseMint, dbcConfigKey);
  }

  /**
   * Swap on DBC pools (Buy or Sell).
   *
   * @param configSwap - The DBC swap config
   * @param computeUnitPriceMicroLamports - The compute unit price in micro lamports
   * @param payer - The wallet to use for the transaction
   * @param baseMint - The base mint of the pool
   * @returns Promise resolving when the swap operation is complete
   */
  async swap(
    configSwap: DbcSwap,
    computeUnitPriceMicroLamports: number,
    payer: PublicKey,
    baseMint: PublicKey,
  ): Promise<Transaction> {
    if (!configSwap) {
      throw new Error('Missing dbc swap parameters');
    }

    const dbcInstance = new DynamicBondingCurveClient(this.connection, 'confirmed');

    const poolState = await dbcInstance.state.getPoolByBaseMint(new PublicKey(baseMint));
    if (!poolState) {
      throw new Error(`DBC Pool not found for ${baseMint.toString()}`);
    }

    const poolAddress = poolState.publicKey;

    const dbcConfigAddress = poolState.account.config;
    const poolConfig = await dbcInstance.state.getPoolConfig(dbcConfigAddress);
    if (!poolConfig) {
      throw new Error(`DBC Pool config not found for ${dbcConfigAddress.toString()}`);
    }

    const quoteMintDecimals = await getQuoteDecimals(
      this.connection,
      poolConfig.quoteMint.toString(),
    );
    const amountIn = new BN(configSwap.amountIn * 10 ** quoteMintDecimals);

    let currentPoint;
    if (poolConfig.activationType === 0) {
      currentPoint = await this.connection.getSlot();
    } else {
      const currentSlot = await this.connection.getSlot();
      currentPoint = await this.connection.getBlockTime(currentSlot);
    }

    if (currentPoint === null) {
      throw new Error('Failed to get current point (block time)');
    }

    const quote = await dbcInstance.pool.swapQuote({
      virtualPool: poolState.account,
      config: poolConfig,
      swapBaseForQuote: configSwap.swapBaseForQuote,
      amountIn,
      hasReferral: configSwap.referralTokenAccount !== '',
      currentPoint: new BN(currentPoint),
    });

    // Get the appropriate public key based on wallet type
    if (!payer) {
      throw new Error('No wallet or wallet context available');
    }

    const swapTx = await dbcInstance.pool.swap({
      amountIn,
      minimumAmountOut: quote.minimumAmountOut,
      owner: payer,
      pool: poolAddress,
      swapBaseForQuote: configSwap.swapBaseForQuote,
      referralTokenAccount: configSwap.referralTokenAccount
        ? new PublicKey(configSwap.referralTokenAccount)
        : null,
    });

    modifyComputeUnitPriceIx(swapTx, computeUnitPriceMicroLamports);

    return swapTx;
  }

  /**
   * Claims trading fees from a DBC pool.
   *
   * @param config - The DBC config
   * @param baseMint - The base mint of the pool
   * @returns Promise resolving when the claim operation is complete
   */
  async claimTradingFee(
    config: DbcConfig,
    payer: PublicKey,
    baseMint: PublicKey,
  ): Promise<any | null> {
    return await claimTradingFee(config, this.connection, payer, baseMint);
  }

  /**
   * Migrates DBC pool to DAMM V1 pool.
   *
   * @param config - The DBC config
   * @param baseMint - The base mint of the pool
   * @returns Promise resolving when the migration is complete
   */
  async migrateDammV1(
    config: DbcConfig,
    payer: PublicKey,
    baseMint: PublicKey,
  ): Promise<any | null> {
    return await migrateDammV1(config, this.connection, payer, baseMint);
  }

  /**
   * Migrates DBC pool to DAMM V2 pool.
   *
   * @param config - The DBC config
   * @param baseMint - The base mint of the pool
   * @returns Promise resolving when the migration is complete
   */
  async migrateDammV2(config: DbcConfig, payer: PublicKey, baseMint: PublicKey): Promise<any> {
    return await migrateDammV2(config, this.connection, payer, baseMint);
  }
}
