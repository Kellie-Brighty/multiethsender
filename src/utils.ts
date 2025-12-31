import { Wallet } from 'ethers';

export type TransactionStatus = 'idle' | 'pending' | 'success' | 'error';

export interface GeneratedWallet {
  index: number;
  address: string;
  privateKey: string;
  status: TransactionStatus;
  txHash?: string;
  error?: string;
}

export const generateWallets = (count: number): GeneratedWallet[] => {
  const wallets: GeneratedWallet[] = [];
  for (let i = 0; i < count; i++) {
    const wallet = Wallet.createRandom();
    wallets.push({
      index: i + 1,
      address: wallet.address,
      privateKey: wallet.privateKey,
      status: 'idle',
    });
  }
  return wallets;
};

export const exportToCSV = (wallets: GeneratedWallet[]) => {
  const headers = ['Index', 'Address', 'Private Key'];
  const rows = wallets.map(w => [w.index, w.address, w.privateKey]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `wallets_${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToJSON = (wallets: GeneratedWallet[]) => {
  const jsonContent = JSON.stringify(wallets, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `wallets_${new Date().getTime()}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
