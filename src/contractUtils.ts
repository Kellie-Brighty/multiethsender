import { Contract, formatUnits, type Signer, type Provider, ZeroAddress, parseUnits } from 'ethers';
import { MULTISEND_CONTRACT_ADDRESS, MULTISEND_ABI, ERC20_ABI } from './contract';
import type { GeneratedWallet } from './utils';

export interface BulkTransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface TokenInfo {
  symbol: string;
  decimals: number;
  balance: string;
  allowance: string;
}

/**
 * Get the contract owner address
 */
export async function getContractOwner(signerOrProvider: Signer | Provider): Promise<string> {
  const contract = new Contract(MULTISEND_CONTRACT_ADDRESS, MULTISEND_ABI, signerOrProvider);
  return await contract.owner();
}

/**
 * Check if platform fees are currently enabled
 */
export async function isFeesEnabled(signerOrProvider: Signer | Provider): Promise<boolean> {
  const contract = new Contract(MULTISEND_CONTRACT_ADDRESS, MULTISEND_ABI, signerOrProvider);
  return await contract.feesEnabled();
}

/**
 * Toggle platform fees (Owner only)
 */
export async function toggleFees(signer: Signer): Promise<BulkTransferResult> {
  try {
    const contract = getMultiSendContract(signer);
    const tx = await contract.toggleFees();
    return {
      success: true,
      txHash: tx.hash,
    };
  } catch (error: any) {
    console.error('Error toggling fees:', error);
    return {
      success: false,
      error: error?.reason || error?.message || 'Transaction failed',
    };
  }
}

/**
 * Get MultiSend contract instance
 */
export function getMultiSendContract(signer: Signer): Contract {
  return new Contract(MULTISEND_CONTRACT_ADDRESS, MULTISEND_ABI, signer);
}

/**
 * Get ERC20 contract instance
 */
export function getERC20Contract(tokenAddress: string, signerOrProvider: Signer | Provider): Contract {
  return new Contract(tokenAddress, ERC20_ABI, signerOrProvider);
}

/**
 * Get token information
 */
export async function getTokenInfo(
  tokenAddress: string,
  ownerAddress: string,
  provider: Provider
): Promise<TokenInfo | null> {
  try {
    const contract = getERC20Contract(tokenAddress, provider);
    const [symbol, decimals, balance, allowance] = await Promise.all([
      contract.symbol(),
      contract.decimals(),
      contract.balanceOf(ownerAddress),
      contract.allowance(ownerAddress, MULTISEND_CONTRACT_ADDRESS),
    ]);

    return {
      symbol,
      decimals: Number(decimals),
      balance: balance.toString(),
      allowance: allowance.toString(),
    };
  } catch (error) {
    console.error('Error fetching token info:', error);
    return null;
  }
}

/**
 * Approve token spending
 */
export async function approveToken(
  tokenAddress: string,
  amount: bigint,
  signer: Signer
): Promise<BulkTransferResult> {
  try {
    const contract = getERC20Contract(tokenAddress, signer);
    const tx = await contract.approve(MULTISEND_CONTRACT_ADDRESS, amount);
    await tx.wait();
    return { success: true, txHash: tx.hash };
  } catch (error: any) {
    return {
      success: false,
      error: error?.reason || error?.message || 'Approval failed',
    };
  }
}

/**
 * Send equal amounts to all wallets using the smart contract
 */
export async function sendEqualAmounts(
  signer: Signer,
  recipients: string[],
  totalAmount: string,
  tokenAddress: string = ZeroAddress,
  decimals: number = 18
): Promise<BulkTransferResult> {
  try {
    if (recipients.length === 0) {
      return { success: false, error: 'No recipients provided' };
    }

    const contract = getMultiSendContract(signer);
    const amountInUnits = parseUnits(totalAmount, decimals);
    
    // Get current fee
    const fee = await contract.getCurrentFee();

    let tx;
    if (tokenAddress === ZeroAddress) {
      // ETH Transfer
      tx = await contract.sendEqualAmountsETH(recipients, { 
        value: amountInUnits + fee,
        gasLimit: 300000 + (recipients.length * 50000) // Fallback gas limit
      });
    } else {
      // ERC20 Transfer
      // Note: USDT (and others) may fail during gas estimation in standard contracts
      // because they don't return a boolean on transferFrom/transfer.
      try {
        tx = await contract.sendEqualAmountsERC20(tokenAddress, recipients, amountInUnits, { value: fee });
      } catch (estError) {
        console.warn('Gas estimation failed, trying with manual limit...', estError);
        tx = await contract.sendEqualAmountsERC20(tokenAddress, recipients, amountInUnits, { 
          value: fee,
          gasLimit: 500000 + (recipients.length * 70000) 
        });
      }
    }
    
    return {
      success: true,
      txHash: tx.hash,
    };
  } catch (error: any) {
    console.error('Error sending equal amounts:', error);
    return {
      success: false,
      error: error?.reason || error?.message || 'Transaction failed',
    };
  }
}

/**
 * Send different amounts to wallets using the smart contract
 */
export async function sendDifferentAmounts(
  signer: Signer,
  recipients: string[],
  amounts: string[],
  tokenAddress: string = ZeroAddress,
  decimals: number = 18
): Promise<BulkTransferResult> {
  try {
    if (recipients.length === 0) {
      return { success: false, error: 'No recipients provided' };
    }

    const contract = getMultiSendContract(signer);
    const amountsInUnits = amounts.map(amount => parseUnits(amount, decimals));
    const totalAmount = amountsInUnits.reduce((sum, amount) => sum + amount, 0n);
    
    // Get current fee
    const fee = await contract.getCurrentFee();

    let tx;
    if (tokenAddress === ZeroAddress) {
      // ETH Transfer
      tx = await contract.sendDifferentAmountsETH(recipients, amountsInUnits, {
        value: totalAmount + fee,
        gasLimit: 300000 + (recipients.length * 50000)
      });
    } else {
      // ERC20 Transfer
      try {
        tx = await contract.sendDifferentAmountsERC20(tokenAddress, recipients, amountsInUnits, { value: fee });
      } catch (estError) {
        console.warn('Gas estimation failed, trying with manual limit...', estError);
        tx = await contract.sendDifferentAmountsERC20(tokenAddress, recipients, amountsInUnits, { 
          value: fee,
          gasLimit: 500000 + (recipients.length * 70000)
        });
      }
    }
    
    return {
      success: true,
      txHash: tx.hash,
    };
  } catch (error: any) {
    console.error('Error sending different amounts:', error);
    return {
      success: false,
      error: error?.reason || error?.message || 'Transaction failed',
    };
  }
}

/**
 * Estimate gas (simplified for ERC20/ETH)
 */
export async function estimateGas(
  signer: Signer,
  recipients: string[],
  amounts: string[],
  tokenAddress: string = ZeroAddress,
  decimals: number = 18
): Promise<bigint | null> {
  try {
    const contract = getMultiSendContract(signer);
    const amountsInUnits = amounts.map(amount => parseUnits(amount, decimals));
    const totalAmount = amountsInUnits.reduce((sum, amount) => sum + amount, 0n);
    const fee = await contract.getCurrentFee();

    if (tokenAddress === ZeroAddress) {
      return await contract.sendDifferentAmountsETH.estimateGas(recipients, amountsInUnits, {
        value: totalAmount + fee,
      });
    } else {
      return await contract.sendDifferentAmountsERC20.estimateGas(tokenAddress, recipients, amountsInUnits, {
        value: fee,
      });
    }
  } catch (error) {
    console.error('Error estimating gas:', error);
    return null;
  }
}

/**
 * Prepare wallet addresses for bulk transfer
 */
export function prepareRecipientsFromWallets(wallets: GeneratedWallet[]): string[] {
  return wallets.map(wallet => wallet.address);
}

/**
 * Calculate total amount for equal distribution
 */
export function calculateTotalAmount(amountPerWallet: string, walletCount: number, decimals: number = 18): string {
  try {
    const amountInUnits = parseUnits(amountPerWallet, decimals);
    const total = amountInUnits * BigInt(walletCount);
    return formatUnits(total, decimals);
  } catch (error) {
    console.error('Error calculating total amount:', error);
    return '0';
  }
}

/**
 * Validate wallet addresses
 */
export function validateAddresses(addresses: string[]): boolean {
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  return addresses.every(addr => addressRegex.test(addr));
}
