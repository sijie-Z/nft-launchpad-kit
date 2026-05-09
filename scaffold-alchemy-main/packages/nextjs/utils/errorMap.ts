/**
 * 合约错误映射 — 把 Solidity revert 原因转成用户友好的提示
 *
 * 使用方式：
 *   catch (e) {
 *     notification.error(mapContractError(e));
 *   }
 */

const ERROR_MAP: Record<string, string> = {
  // 自定义错误
  SaleNotActive: "Sale is not active. Please wait for the sale to open.",
  InvalidMintQuantity: "Invalid quantity. Please enter at least 1.",
  MaxSupplyExceeded: "Max supply reached. No more NFTs available to mint.",
  WalletMintLimitExceeded: "You've reached the per-wallet mint limit.",
  NotEnoughEtherSent: "Insufficient ETH. Please check the price and try again.",
  RevealNotReady: "Reveal is not ready yet. The owner hasn't committed a reveal seed.",

  // 常见 require 错误
  "Pausable: paused": "The contract is currently paused. Please try again later.",
  "ERC721: token already minted": "This token has already been minted.",
  "ERC721: invalid token ID": "Invalid token ID.",
  "ERC721: caller is not token owner or approved": "You are not the owner of this token.",
  "ERC20: insufficient allowance": "Please approve the token spending first.",
  "ERC20: transfer amount exceeds balance": "Insufficient token balance.",
  "No signer": "No trusted signer configured. Signature minting is unavailable.",
  "Bad signature": "Invalid signature. Please check your authorization.",
  Expired: "Authorization has expired. Please request a new signature.",
  "Not in allowlist": "Your address is not in the allowlist.",
  "No balance": "Contract has no balance to withdraw.",
  "No recipients": "No payout recipients configured.",
  "sum!=10000": "Payout BPS must sum to 10000.",
  "len mismatch": "Recipients and BPS arrays must have the same length.",
  "End < Start": "Auction end price must be less than start price.",
  "Duration=0": "Auction duration must be greater than 0.",
  "Already revealed": "Metadata has already been revealed.",
  "No commit": "No reveal commit found. Owner must commit first.",
  "Bad seed": "Invalid reveal seed. Does not match the commit.",
  "Withdrawal failed": "ETH withdrawal failed. Please try again.",
  "Payout failed": "One or more payouts failed. Check recipient addresses.",
  "No operator role": "You don't have the operator role.",
};

/**
 * 将合约错误转换为用户友好的提示信息
 */
export function mapContractError(e: any): string {
  // 1. 检查 shortMessage（viem/wagmi 格式）
  const raw = e?.shortMessage || e?.message || "";

  // 2. 尝试匹配自定义错误名（如 "SaleNotActive()"）
  for (const [key, msg] of Object.entries(ERROR_MAP)) {
    if (raw.includes(key)) {
      return msg;
    }
  }

  // 3. 尝试匹配 revert reason
  const revertMatch = raw.match(/reason: (.+?)(?:\n|$)/);
  if (revertMatch) {
    const reason = revertMatch[1].trim();
    if (ERROR_MAP[reason]) return ERROR_MAP[reason];
  }

  // 4. 尝试匹配 execution reverted
  const execMatch = raw.match(/execution reverted: (.+?)(?:\n|$)/);
  if (execMatch) {
    const reason = execMatch[1].trim();
    if (ERROR_MAP[reason]) return ERROR_MAP[reason];
    return reason;
  }

  // 5. 用户拒绝交易
  if (raw.includes("user rejected") || raw.includes("User rejected")) {
    return "Transaction was rejected by user.";
  }

  // 6. 余额不足
  if (raw.includes("insufficient funds")) {
    return "Insufficient ETH for gas + value. Please add more ETH to your wallet.";
  }

  // 7. 兜底：截取前 100 字符
  return raw.slice(0, 100) || "Transaction failed. Please try again.";
}
