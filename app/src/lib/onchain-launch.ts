import {
  Connection,
  PublicKey,
} from '@solana/web3.js';
import type { Token } from '@/types/token';
import { getRpcSOLEndpoint } from './sol';
import { getAllLaunches as sdkGetAllLaunches } from './queries';

// Your custom launchpad program ID
const LAUNCHPAD_PROGRAM_ID = new PublicKey('HDFv1zjKQzvHuNJeH7D6A8DFKAxwJKw8X47qW4MYxYpA');

/**
 * Query all launches using the SDK
 */
export async function queryLaunches(): Promise<Token[]> {
  try {
    const connection = new Connection(getRpcSOLEndpoint(), 'confirmed');
    const tokens = await sdkGetAllLaunches(connection, LAUNCHPAD_PROGRAM_ID);
    return tokens;
  } catch (error) {
    console.error('Error querying launches:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    return [];
  }
}

/**
 * Main function to get all pools (used by hooks)
 */
export async function getAllLaunches(): Promise<Token[]> {
  return queryLaunches();
}
