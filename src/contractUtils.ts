import { Contract, parseEther, formatEther, type Signer } from 'ethers';
import { MULTISEND_CONTRACT_ADDRESS, MULTISEND_ABI } from './contract';
import type { GeneratedWallet } from './utils';

export interface BulkTransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Get MultiSend contract instance
 */
export function getMultiSendContract(signer: Signer): Contract {
  return new Contract(MULTISEND_CONTRACT_ADDRESS, MULTISEND_ABI, signer);
}

/**
 * Send equal amounts to all wallets using the smart contract
 */
export async function sendEqualAmounts(
  signer: Signer,
  recipients: string[],
  totalAmount: string
): Promise<BulkTransferResult> {
  try {
    if (recipients.length === 0) {
      return { success: false, error: 'No recipients provided' };
    }

    if (recipients.length > 200) {
      return { success: false, error: 'Maximum 200 recipients allowed' };
    }

    const contract = getMultiSendContract(signer);
    const value = parseEther(totalAmount);

    // Call the contract function
    const tx = await contract.sendEqualAmounts(recipients, { value });
    
    return {
      success: true,
      txHash: tx.hash,
    };
  } catch (error: any) {
    console.error('Error sending equal amounts:', error);
    
    const errorMessage =
      error?.info?.error?.message ||
      error?.reason ||
      error?.message ||
      'Transaction failed';
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send different amounts to wallets using the smart contract
 */
export async function sendDifferentAmounts(
  signer: Signer,
  recipients: string[],
  amounts: string[]
): Promise<BulkTransferResult> {
  try {
    if (recipients.length === 0) {
      return { success: false, error: 'No recipients provided' };
    }

    if (recipients.length !== amounts.length) {
      return { success: false, error: 'Recipients and amounts length mismatch' };
    }

    if (recipients.length > 200) {
      return { success: false, error: 'Maximum 200 recipients allowed' };
    }

    const contract = getMultiSendContract(signer);
    
    // Convert amounts to Wei
    const amountsInWei = amounts.map(amount => parseEther(amount));
    
    // Calculate total amount needed
    const totalAmount = amountsInWei.reduce((sum, amount) => sum + amount, 0n);

    // Call the contract function
    const tx = await contract.sendDifferentAmounts(recipients, amountsInWei, {
      value: totalAmount,
    });
    
    return {
      success: true,
      txHash: tx.hash,
    };
  } catch (error: any) {
    console.error('Error sending different amounts:', error);
    
    const errorMessage =
      error?.info?.error?.message ||
      error?.reason ||
      error?.message ||
      'Transaction failed';
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Estimate gas for equal amounts transfer
 */
export async function estimateGasForEqualAmounts(
  signer: Signer,
  recipients: string[],
  totalAmount: string
): Promise<bigint | null> {
  try {
    const contract = getMultiSendContract(signer);
    const value = parseEther(totalAmount);
    
    const gasEstimate = await contract.sendEqualAmounts.estimateGas(recipients, { value });
    return gasEstimate;
  } catch (error) {
    console.error('Error estimating gas:', error);
    return null;
  }
}

/**
 * Estimate gas for different amounts transfer
 */
export async function estimateGasForDifferentAmounts(
  signer: Signer,
  recipients: string[],
  amounts: string[]
): Promise<bigint | null> {
  try {
    const contract = getMultiSendContract(signer);
    const amountsInWei = amounts.map(amount => parseEther(amount));
    const totalAmount = amountsInWei.reduce((sum, amount) => sum + amount, 0n);
    
    const gasEstimate = await contract.sendDifferentAmounts.estimateGas(
      recipients,
      amountsInWei,
      { value: totalAmount }
    );
    return gasEstimate;
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
export function calculateTotalAmount(amountPerWallet: string, walletCount: number): string {
  try {
    const amountInWei = parseEther(amountPerWallet);
    const total = amountInWei * BigInt(walletCount);
    return formatEther(total);
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
