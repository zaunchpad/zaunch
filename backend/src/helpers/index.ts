import { MAX_SQRT_PRICE, MIN_SQRT_PRICE } from '@meteora-ag/cp-amm-sdk';
import {
  createDammV2Program,
  DAMM_V2_PROGRAM_ID,
  getDynamicFeeParams,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import { getMint } from '@solana/spl-token';
import { ComputeBudgetProgram, Connection, Keypair, PublicKey } from '@solana/web3.js';
import type { Signer, Transaction, VersionedTransaction } from '@solana/web3.js';
import BN from 'bn.js';

export function getSigners(
  signerOrMultisig: Signer | PublicKey,
  multiSigners: Signer[],
): [PublicKey, Signer[]] {
  return signerOrMultisig instanceof PublicKey
    ? [signerOrMultisig, multiSigners]
    : [signerOrMultisig.publicKey, [signerOrMultisig]];
}

export async function getQuoteDecimals(
  connection: Connection,
  quoteMint?: string,
): Promise<number> {
  if (quoteMint) {
    const quoteMintInfo = await connection.getAccountInfo(new PublicKey(quoteMint));
    if (!quoteMintInfo) {
      throw new Error(`Quote mint account not found: ${quoteMint}`);
    }
    const mintAccount = await getMint(
      connection,
      new PublicKey(quoteMint),
      connection.commitment,
      quoteMintInfo.owner,
    );
    const decimals = mintAccount.decimals;
    return decimals;
  }
  return 9;
}

export async function createDammV2Config(
  connection: Connection,
  payer: Keypair,
  poolCreatorAuthority: PublicKey,
  migrationFeeOption: number,
): Promise<PublicKey> {
  const program = createDammV2Program(connection);

  let baseFeeBps = 100;
  let cliffFeeNumerator = new BN(10000000);
  if (migrationFeeOption === 0) {
    baseFeeBps = 25;
    cliffFeeNumerator = new BN(2500000);
  } else if (migrationFeeOption === 1) {
    cliffFeeNumerator = new BN(3000000);
    baseFeeBps = 30;
  } else if (migrationFeeOption === 2) {
    baseFeeBps = 100;
    cliffFeeNumerator = new BN(10000000);
  } else if (migrationFeeOption === 3) {
    baseFeeBps = 200;
    cliffFeeNumerator = new BN(20000000);
  } else if (migrationFeeOption === 4) {
    baseFeeBps = 400;
    cliffFeeNumerator = new BN(40000000);
  } else if (migrationFeeOption === 5) {
    baseFeeBps = 600;
    cliffFeeNumerator = new BN(60000000);
  }
  const dynamicFeeParams = getDynamicFeeParams(baseFeeBps);

  const [config] = PublicKey.findProgramAddressSync(
    [Buffer.from('config'), new BN(0).toArrayLike(Buffer, 'le', 8)],
    DAMM_V2_PROGRAM_ID,
  );

  const configParameters = {
    poolFees: {
      baseFee: {
        cliffFeeNumerator: cliffFeeNumerator,
        numberOfPeriod: 0,
        periodFrequency: new BN(0),
        reductionFactor: new BN(0),
        feeSchedulerMode: 0,
      },
      padding: new Array(32).fill(0) as number[],
      dynamicFee: dynamicFeeParams,
    },
    sqrtMinPrice: MIN_SQRT_PRICE,
    sqrtMaxPrice: MAX_SQRT_PRICE,
    vaultConfigKey: PublicKey.default,
    poolCreatorAuthority,
    collectFeeMode: 1,
    activationType: 0,
  };

  const transaction = await program.methods
    .createConfig(new BN(0), configParameters)
    .accountsPartial({
      config,
      admin: payer.publicKey,
    })
    .transaction();

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.sign(payer);
  await connection.sendRawTransaction(transaction.serialize());

  return config;
}

/**
 * Modify priority fee in transaction
 * @param tx
 * @param newPriorityFee
 * @returns {boolean} true if priority fee was modified
 **/
export const modifyComputeUnitPriceIx = (
  tx: VersionedTransaction | Transaction,
  newPriorityFee: number,
): boolean => {
  // Check if transaction is null or undefined
  if (!tx) {
    console.warn(
      'modifyComputeUnitPriceIx: Transaction is null or undefined, skipping modification',
    );
    return false;
  }

  if ('version' in tx) {
    for (const ix of tx.message.compiledInstructions) {
      const programId = tx.message.staticAccountKeys[ix.programIdIndex];
      if (programId && ComputeBudgetProgram.programId.equals(programId)) {
        // need check for data index
        if (ix.data[0] === 3) {
          ix.data = Uint8Array.from(
            ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: newPriorityFee,
            }).data,
          );
          return true;
        }
      }
    }
    // could not inject for VT
  } else {
    for (const ix of tx.instructions) {
      if (ComputeBudgetProgram.programId.equals(ix.programId)) {
        // need check for data index
        if (ix.data[0] === 3) {
          ix.data = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: newPriorityFee,
          }).data;
          return true;
        }
      }
    }

    // inject if none
    tx.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: newPriorityFee,
      }),
    );
    return true;
  }

  return false;
};
