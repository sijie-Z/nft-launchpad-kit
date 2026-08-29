/**
 * Shared test helpers for the NFTLaunchpadKit test suite.
 */

/**
 * Compute the gas cost (in wei) paid for a transaction from its receipt.
 *
 * The hardhat-ethers receipt types the tests see here type `gasUsed`/`gasPrice`
 * inconsistently across versions, so normalize explicitly to bigint.
 */
export function gasCostOf(receipt: any): bigint {
  return BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice ?? 0);
}
