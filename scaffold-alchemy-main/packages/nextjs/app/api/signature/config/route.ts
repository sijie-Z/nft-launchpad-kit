import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";

/**
 * GET /api/signature/config — public read: the platform's signing address.
 * Collections created via the SDK should trust this address:
 *   kit.collections.create(input, { trustedSigner: await kit.grants.getSigner() })
 * The address is not a secret (it is already returned by every /api/signature
 * response); only the private key is.
 */
export async function GET() {
  const privateKey = process.env.SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    return NextResponse.json({ signer: null, configured: false }, { status: 200 });
  }
  const key = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(key as `0x${string}`);
  return NextResponse.json({ signer: account.address, configured: true });
}
