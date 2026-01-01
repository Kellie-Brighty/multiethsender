import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Copy, 
  ShieldCheck, 
  Wallet as WalletIcon, 
  CheckCircle2,
  FileJson,
  FileSpreadsheet,
  Link,
  Unlink,
  Coins,
  Loader2,
  ExternalLink,
  AlertCircle,
  Save,
  EyeOff,
  Eye,
  Zap,
  Network,
  History,
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BrowserProvider, parseEther, type Signer } from 'ethers';
import { generateWallets, exportToCSV, exportToJSON, type GeneratedWallet } from './utils';
import { sendEqualAmounts, sendDifferentAmounts, prepareRecipientsFromWallets, calculateTotalAmount } from './contractUtils';
import { EXPECTED_CHAIN_ID } from './contract';
import { 
  getWalletHistory, 
  addSessionToHistory, 
  updateSessionInHistory, 
  deleteSessionFromHistory,
  getSessionStats,
  exportSessionToCSV,
  exportSessionToJSON,
  formatRelativeTime,
  type WalletSession 
} from './historyUtils';

declare global {
  interface Window {
    ethereum?: any;
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => {
  const [show, setShow] = useState(false);

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-medium text-white whitespace-nowrap pointer-events-none z-50 shadow-xl"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-white/10" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [count, setCount] = useState<number | string>(1);
  const [wallets, setWallets] = useState<GeneratedWallet[]>([]);
  const [showPrivateKeys, setShowPrivateKeys] = useState<Record<number, boolean>>({});
  const [copiedIndex, setCopiedIndex] = useState<{ index: number; type: 'address' | 'pk' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Wallet Connection & Funding State
  const [signer, setSigner] = useState<Signer | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [fundingAmount, setFundingAmount] = useState<string>("0.01");
  const [isFunding, setIsFunding] = useState(false);
  
  // Smart Contract Bulk Transfer State
  const [transferMode, setTransferMode] = useState<'individual' | 'bulk'>('individual');
  const [isBulkTransferring, setIsBulkTransferring] = useState(false);
  const [bulkTxHash, setBulkTxHash] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  
  // History State
  const [history, setHistory] = useState<WalletSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [walletBalance, setWalletBalance] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    const walletHistory = getWalletHistory();
    setHistory(walletHistory.sessions);
  }, []);

  // Update relative time labels every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(prev => prev + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // Persistence logic
  useEffect(() => {
    const savedWallets = localStorage.getItem('eth_wallets_session');
    if (savedWallets) {
      try {
        setWallets(JSON.parse(savedWallets));
      } catch (e) {
        console.error("Failed to load wallets from local storage", e);
      }
    }
  }, []);

  useEffect(() => {
    if (wallets.length > 0) {
      localStorage.setItem('eth_wallets_session', JSON.stringify(wallets));
      
      // Update current session in history if it exists
      if (currentSessionId) {
        const stats = {
          successfulTransfers: wallets.filter(w => w.status === 'success').length,
          failedTransfers: wallets.filter(w => w.status === 'error').length,
        };
        updateSessionInHistory(currentSessionId, {
          wallets,
          bulkTxHash: bulkTxHash || undefined,
          ...stats,
        });
        
        // Refresh history state
        const updatedHistory = getWalletHistory();
        setHistory(updatedHistory.sessions);
      }
    } else {
      localStorage.removeItem('eth_wallets_session');
    }
  }, [wallets, bulkTxHash, currentSessionId]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const newSigner = await provider.getSigner();
        setSigner(newSigner);
        const address = await newSigner.getAddress();
        setUserAddress(address);
        
        // Detect network
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));
        
        // Fetch balance
        const balance = await provider.getBalance(address);
        const balanceInEth = (Number(balance) / 1e18).toFixed(4);
        setWalletBalance(balanceInEth);
      } catch (err) {
        console.error("User rejected the connection", err);
      }
    } else {
      alert("Please install MetaMask or another browser wallet.");
    }
  };

  const disconnectWallet = () => {
    setSigner(null);
    setUserAddress(null);
    setChainId(null);
    setBulkTxHash(null);
    setWalletBalance(null);
  };

  const refreshBalance = async () => {
    if (signer && userAddress) {
      try {
        const provider = new BrowserProvider(window.ethereum!);
        const balance = await provider.getBalance(userAddress);
        const balanceInEth = (Number(balance) / 1e18).toFixed(4);
        setWalletBalance(balanceInEth);
      } catch (error) {
        console.error('Failed to refresh balance:', error);
      }
    }
  };

  const handleGenerate = () => {
    const num = typeof count === 'string' ? parseInt(count) || 1 : count;
    const newWallets = generateWallets(num, fundingAmount);
    
    // Create new session in history FIRST
    const newSession = addSessionToHistory({
      wallets: newWallets,
      transferMode,
      fundingAmount,
      totalWallets: num,
      successfulTransfers: 0,
      failedTransfers: 0,
    });
    
    setCurrentSessionId(newSession.id);
    
    // Then set wallets
    setWallets(newWallets);
    setShowPrivateKeys({});
    setCurrentPage(1);
    setBulkTxHash(null);
    
    // Refresh history
    const updatedHistory = getWalletHistory();
    setHistory(updatedHistory.sessions);
    
    console.log('Session created:', newSession.id);
    console.log('History updated:', updatedHistory.sessions.length);
  };

  const fundAllWallets = async () => {
    if (!signer) return;
    setIsFunding(true);

    const updatedWallets = [...wallets];
    
    for (let i = 0; i < updatedWallets.length; i++) {
      const wallet = updatedWallets[i];
      if (wallet.status === 'success') continue;

      try {
        updatedWallets[i] = { ...wallet, status: 'pending' };
        setWallets([...updatedWallets]);

        const tx = await signer.sendTransaction({
          to: wallet.address,
          value: parseEther(wallet.amount),
        });

        updatedWallets[i] = { ...updatedWallets[i], status: 'pending', txHash: tx.hash };
        setWallets([...updatedWallets]);

        await tx.wait();
        
        updatedWallets[i] = { ...updatedWallets[i], status: 'success' };
        setWallets([...updatedWallets]);
      } catch (error: any) {
        console.error(`Failed to fund wallet ${wallet.address}`, error);
        
        // Better error parsing for Ethers v6
        const errorMessage = 
          error?.info?.error?.message || 
          error?.reason || 
          error?.message ||
          'Transaction failed';
        updatedWallets[i] = { ...updatedWallets[i], status: 'error', error: errorMessage };
        setWallets([...updatedWallets]);
      }
    }
    setIsFunding(false);
    
    // Refresh balance after funding
    await refreshBalance();
  };

  const handleBulkTransfer = async () => {
    if (!signer) return;
    
    // Check if on correct network
    if (chainId !== EXPECTED_CHAIN_ID) {
      alert(`Please switch to Ethereum Mainnet (Chain ID: ${EXPECTED_CHAIN_ID})`);
      return;
    }

    setIsBulkTransferring(true);
    setBulkTxHash(null);

    try {
      const recipients = prepareRecipientsFromWallets(wallets);
      
      // Check if all amounts are the same
      const firstAmount = wallets[0].amount;
      const allSame = wallets.every(w => w.amount === firstAmount);

      let result;
      if (allSame) {
        const totalAmount = calculateTotalAmount(firstAmount, wallets.length);
        result = await sendEqualAmounts(signer, recipients, totalAmount);
      } else {
        const amounts = wallets.map(w => w.amount);
        result = await sendDifferentAmounts(signer, recipients, amounts);
      }

      if (result.success && result.txHash) {
        setBulkTxHash(result.txHash);
        
        // Mark all wallets as pending
        const updatedWallets = wallets.map(w => ({ ...w, status: 'pending' as const, txHash: result.txHash }));
        setWallets(updatedWallets);

        // Wait for transaction confirmation
        const provider = new BrowserProvider(window.ethereum!);
        const tx = await provider.getTransaction(result.txHash);
        if (tx) {
          await tx.wait();
          
          // Mark all as success
          const successWallets = wallets.map(w => ({ ...w, status: 'success' as const, txHash: result.txHash }));
          setWallets(successWallets);
        }
      } else {
        alert(`Bulk transfer failed: ${result.error}`);
        // Mark all as error
        const errorWallets = wallets.map(w => ({ ...w, status: 'error' as const, error: result.error }));
        setWallets(errorWallets);
      }
    } catch (error: any) {
      console.error('Bulk transfer error:', error);
      alert(`Bulk transfer failed: ${error.message}`);
      const errorWallets = wallets.map(w => ({ ...w, status: 'error' as const, error: error.message }));
      setWallets(errorWallets);
    }

    setIsBulkTransferring(false);
    
    // Refresh balance after bulk transfer
    await refreshBalance();
  };

  const updateWalletAmount = (index: number, newAmount: string) => {
    setWallets(prev => prev.map(w => 
      w.index === index ? { ...w, amount: newAmount } : w
    ));
  };

  const togglePrivateKey = (index: number) => {
    setShowPrivateKeys(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const copyToClipboard = async (text: string, index: number, type: 'address' | 'pk') => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex({ index, type });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const restoreSession = (session: WalletSession) => {
    setWallets(session.wallets);
    setFundingAmount(session.fundingAmount);
    setTransferMode(session.transferMode);
    setBulkTxHash(session.bulkTxHash || null);
    setCurrentSessionId(session.id);
    setCurrentPage(1);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSession = (sessionId: string) => {
    if (confirm('Are you sure you want to permanently delete this session? This action cannot be undone.')) {
      deleteSessionFromHistory(sessionId);
      const updatedHistory = getWalletHistory();
      setHistory(updatedHistory.sessions);
    }
  };

  const totalPages = Math.ceil(wallets.length / itemsPerPage);
  const paginatedWallets = wallets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen w-screen bg-[#030303] text-white selection:bg-blue-500/30 font-sans p-4 md:p-8 flex flex-col items-center">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 w-full max-w-[1400px] space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="text-center sm:text-left space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs sm:text-sm font-medium"
            >
              <ShieldCheck size={16} />
              Secure Client-Side Generation
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-linear-to-b from-white to-white/60 bg-clip-text text-transparent"
            >
              Ethereum Wallet Generator
            </motion.h1>
            {wallets.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] text-emerald-400/60 font-medium uppercase tracking-widest"
              >
                <Save size={12} />
                Session Auto-Saved
              </motion.div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0"
          >
            {signer ? (
              <div className="flex items-center gap-3 bg-white/3 border border-white/10 rounded-2xl p-2 pr-4 min-w-max">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <WalletIcon size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Connected</span>
                  <span className="text-xs sm:text-sm font-mono text-white/70">
                    {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
                  </span>
                  {walletBalance && (
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      {walletBalance} ETH
                    </span>
                  )}
                </div>
                <button 
                  onClick={disconnectWallet}
                  className="ml-2 p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-red-400"
                >
                  <Unlink size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-semibold transition-all active:scale-95 group whitespace-nowrap"
              >
                <Link size={18} className="text-blue-400 group-hover:rotate-12 transition-transform" />
                <span>Connect Wallet</span>
              </button>
            )}
          </motion.div>
        </div>

        {/* Network Indicator & Transfer Mode Toggle */}
        {signer && wallets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-center gap-4 justify-between bg-white/3 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
          >
            {/* Network Status */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
              <Network size={16} className={chainId === EXPECTED_CHAIN_ID ? "text-emerald-400" : "text-orange-400"} />
              <span className="text-xs font-medium">
                {chainId === EXPECTED_CHAIN_ID ? (
                  <span className="text-emerald-400">Ethereum Mainnet</span>
                ) : chainId ? (
                  <span className="text-orange-400">Wrong Network (Chain ID: {chainId})</span>
                ) : (
                  <span className="text-white/40">Detecting...</span>
                )}
              </span>
            </div>

            {/* Transfer Mode Toggle */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setTransferMode('individual')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                  transferMode === 'individual'
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                    : "text-white/40 hover:text-white/60"
                )}
              >
                Individual
              </button>
              <button
                onClick={() => setTransferMode('bulk')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                  transferMode === 'bulk'
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                    : "text-white/40 hover:text-white/60"
                )}
              >
                <Zap size={14} />
                Bulk Contract
              </button>
            </div>
          </motion.div>
        )}

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-end gap-4 sm:gap-6">
            <div className="space-y-3">
              <label className="text-xs sm:text-sm font-medium text-white/60 ml-1">Number of Wallets</label>
              <div className="relative group">
                <input 
                  type="number" 
                  min="1" 
                  max="500"
                  value={count}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setCount('');
                      return;
                    }
                    const parsed = parseInt(val);
                    if (!isNaN(parsed)) {
                      setCount(Math.min(500, parsed));
                    }
                  }}
                  className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 sm:py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-base sm:text-lg font-mono focus:border-blue-500/50"
                  placeholder="E.g. 10"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-400/50 transition-colors">
                  <WalletIcon size={20} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs sm:text-sm font-medium text-white/60 ml-1">Funding Amount (ETH)</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={fundingAmount}
                  onChange={(e) => setFundingAmount(e.target.value)}
                  className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 sm:py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all text-base sm:text-lg font-mono focus:border-emerald-500/50"
                  placeholder="0.01"
                  disabled={isFunding}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-400/50 transition-colors">
                  <Coins size={20} />
                </div>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2 lg:flex-1 flex flex-wrap items-end gap-3">
              <button 
                onClick={handleGenerate}
                className="flex-2 min-w-[140px] px-6 py-3 sm:py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 group whitespace-nowrap active:scale-95"
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                <span>Generate</span>
              </button>

              {transferMode === 'individual' ? (
                <button 
                  onClick={fundAllWallets}
                  disabled={wallets.length === 0 || isFunding || !signer}
                  className={cn(
                    "flex-2 min-w-[140px] px-6 py-3 sm:py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 group whitespace-nowrap active:scale-95",
                    signer 
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50" 
                      : "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed"
                  )}
                >
                  {isFunding ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Coins size={20} />
                  )}
                  <span>{isFunding ? 'Funding' : 'Fund All'}</span>
                </button>
              ) : (
                <button 
                  onClick={handleBulkTransfer}
                  disabled={wallets.length === 0 || isBulkTransferring || !signer || chainId !== EXPECTED_CHAIN_ID}
                  className={cn(
                    "flex-2 min-w-[140px] px-6 py-3 sm:py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 group whitespace-nowrap active:scale-95",
                    signer && chainId === EXPECTED_CHAIN_ID
                      ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 disabled:opacity-50" 
                      : "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed"
                  )}
                >
                  {isBulkTransferring ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Zap size={20} />
                  )}
                  <span>{isBulkTransferring ? 'Sending' : 'Bulk Send'}</span>
                </button>
              )}

              {wallets.length > 0 && (
                <div className="flex gap-2">
                  <Tooltip text="Export CSV">
                    <button 
                      onClick={() => exportToCSV(wallets)}
                      className="p-3 sm:p-4 bg-white/8 hover:bg-white/15 border border-white/10 rounded-xl transition-all flex items-center justify-center shrink-0"
                    >
                      <FileSpreadsheet size={20} className="text-emerald-400" />
                    </button>
                  </Tooltip>
                  <Tooltip text="Export JSON">
                    <button 
                      onClick={() => exportToJSON(wallets)}
                      className="p-3 sm:p-4 bg-white/8 hover:bg-white/15 border border-white/10 rounded-xl transition-all flex items-center justify-center shrink-0"
                    >
                      <FileJson size={20} className="text-orange-400" />
                    </button>
                  </Tooltip>
                  <Tooltip text="Clear All">
                    <button 
                      onClick={() => { 
                        setWallets([]); 
                        setCurrentPage(1); 
                        setBulkTxHash(null); 
                        setCurrentSessionId(null);
                      }}
                      className="p-3 sm:p-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl transition-all flex items-center justify-center shrink-0"
                    >
                      <Trash2 size={20} className="text-red-400" />
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
          
          {/* Bulk Transfer Info */}
          {bulkTxHash && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <Zap size={20} className="text-purple-400" />
                <div>
                  <p className="text-sm font-semibold text-purple-400">Bulk Transfer Transaction</p>
                  <p className="text-xs text-white/60 font-mono">{bulkTxHash.slice(0, 10)}...{bulkTxHash.slice(-8)}</p>
                </div>
              </div>
              <a
                href={`https://etherscan.io/tx/${bulkTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors text-purple-400 text-sm font-medium"
              >
                View on Etherscan
                <ExternalLink size={16} />
              </a>
            </motion.div>
          )}
        </motion.div>

        {/* Wallets List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {paginatedWallets.map((wallet, idx) => (
              <motion.div 
                key={wallet.address}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative bg-white/2 hover:bg-white/4 backdrop-blur-md border border-white/5 hover:border-white/10 rounded-2xl p-4 sm:p-5 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-6">
                  {/* Index */}
                  <div className="flex items-center justify-between lg:justify-start lg:min-w-[80px]">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xs font-mono text-blue-400">
                        {wallet.index}
                      </span>
                      <span className="lg:hidden text-white/40 text-xs font-medium italic">Entry</span>
                    </div>

                    {/* Mobile Status */}
                    <div className="lg:hidden">
                      {wallet.status === 'idle' && (
                        <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-2 py-0.5 bg-white/5 rounded-full border border-white/5">
                          Ready
                        </div>
                      )}
                      {wallet.status === 'pending' && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                          <Loader2 size={10} className="animate-spin" />
                          Pending
                        </div>
                      )}
                      {wallet.status === 'success' && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-widest px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                          <CheckCircle2 size={10} />
                          OK
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-1 gap-4 lg:gap-4 items-end">
                    {/* Public Address */}
                    <div className="space-y-1.5 min-w-0 lg:flex-3">
                      <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold ml-0.5">Address</label>
                      <div className="flex items-center gap-2 bg-white/3 rounded-lg p-2.5 group/item">
                        <code className="flex-1 font-mono text-[11px] sm:text-sm text-white/70 truncate">
                          {wallet.address}
                        </code>
                        <Tooltip text={copiedIndex?.index === wallet.index && copiedIndex?.type === 'address' ? "Copied!" : "Copy Address"}>
                          <button 
                            onClick={() => copyToClipboard(wallet.address, wallet.index, 'address')}
                            className="p-1.5 bg-white/5 hover:bg-white/15 rounded-md transition-colors text-white/40 hover:text-white shrink-0"
                          >
                            {copiedIndex?.index === wallet.index && copiedIndex?.type === 'address' ? (
                              <CheckCircle2 size={14} className="text-emerald-400" />
                            ) : (
                              <Copy size={14} className="text-white/60" />
                            )}
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5 lg:w-[100px] shrink-0">
                      <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold ml-0.5">Amount</label>
                      <div className="flex items-center gap-1 bg-white/3 rounded-lg p-2.5 border border-white/5 focus-within:border-emerald-500/30 transition-colors">
                        <input 
                          type="text"
                          value={wallet.amount}
                          onChange={(e) => updateWalletAmount(wallet.index, e.target.value)}
                          className="w-full bg-transparent border-none focus:outline-none text-[12px] sm:text-sm font-mono text-emerald-400 text-center"
                          placeholder="0.01"
                        />
                      </div>
                    </div>

                    {/* Private Key */}
                    <div className="space-y-1.5 min-w-0 lg:flex-2">
                      <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold ml-0.5">Private Key</label>
                      <div className="flex items-center gap-2 bg-white/3 rounded-lg p-2.5 group/item">
                        <code className={cn(
                          "flex-1 font-mono text-[11px] sm:text-sm transition-all duration-300 truncate",
                          showPrivateKeys[wallet.index] ? "text-red-400/80" : "text-white/20 blur-sm select-none"
                        )}>
                          {wallet.privateKey}
                        </code>
                        <div className="flex items-center gap-1 shrink-0">
                          <Tooltip text={showPrivateKeys[wallet.index] ? "Hide" : "Show"}>
                            <button 
                              onClick={() => togglePrivateKey(wallet.index)}
                              className="p-1.5 bg-white/5 hover:bg-white/15 rounded-md transition-colors text-white/40 hover:text-white"
                            >
                              {showPrivateKeys[wallet.index] ? <EyeOff size={14} className="text-white/60" /> : <Eye size={14} className="text-white/60" />}
                            </button>
                          </Tooltip>
                          <Tooltip text={copiedIndex?.index === wallet.index && copiedIndex?.type === 'pk' ? "Copied!" : "Copy PK"}>
                            <button 
                              onClick={() => copyToClipboard(wallet.privateKey, wallet.index, 'pk')}
                              className="p-1.5 bg-white/5 hover:bg-white/15 rounded-md transition-colors text-white/40 hover:text-white"
                            >
                              {copiedIndex?.index === wallet.index && copiedIndex?.type === 'pk' ? (
                                <CheckCircle2 size={14} className="text-emerald-400" />
                              ) : (
                                <Copy size={14} className="text-white/60" />
                              )}
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Status & Actions */}
                  <div className="hidden lg:flex items-center gap-3 lg:min-w-[110px] justify-end pt-5">
                    {wallet.status === 'idle' && (
                      <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full border border-white/5">
                        Ready
                      </div>
                    )}
                    {wallet.status === 'pending' && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                        <Loader2 size={12} className="animate-spin" />
                        {wallet.txHash ? 'Transacting' : 'Preparing'}
                      </div>
                    )}
                    {wallet.status === 'success' && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        <CheckCircle2 size={12} />
                        Funded
                      </div>
                    )}
                    {wallet.status === 'error' && (
                      <div className="flex items-center gap-1">
                        <Tooltip text={wallet.error || "Transaction failed"}>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-red-400 uppercase tracking-widest px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20 cursor-help">
                            <AlertCircle size={12} />
                            Failed
                          </div>
                        </Tooltip>
                        <Tooltip text="Retry Funding">
                          <button 
                            onClick={() => {
                              const updated = [...wallets];
                              const idx = updated.findIndex(w => w.index === wallet.index);
                              if (idx !== -1) {
                                updated[idx] = { ...updated[idx], status: 'idle', error: undefined };
                                setWallets(updated);
                                fundAllWallets(); 
                              }
                            }}
                            className="p-1.5 bg-white/5 hover:bg-white/11 rounded-md transition-colors text-white/40 hover:text-white"
                          >
                            <Plus size={14} className="rotate-45" /> 
                          </button>
                        </Tooltip>
                      </div>
                    )}
                    
                    {wallet.txHash && (
                      <Tooltip text="Explorer">
                        <a 
                          href={`https://etherscan.io/tx/${wallet.txHash}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 bg-white/5 hover:bg-white/15 rounded-md transition-colors text-white/40 hover:text-white"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </Tooltip>
                    )}
                  </div>

                  {/* Mobile Actions Overlay */}
                  <div className="lg:hidden flex border-t border-white/5 pt-3 mt-1 items-center justify-between">
                    <div className="flex items-center gap-3">
                      {wallet.txHash && (
                        <a 
                          href={`https://etherscan.io/tx/${wallet.txHash}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[10px] text-blue-400 font-bold uppercase tracking-wider"
                        >
                          <ExternalLink size={12} />
                          Explorer
                        </a>
                      )}
                      {wallet.status === 'error' && (
                        <button 
                          onClick={() => {
                            const updated = [...wallets];
                            const idx = updated.findIndex(w => w.index === wallet.index);
                            if (idx !== -1) {
                              updated[idx] = { ...updated[idx], status: 'idle', error: undefined };
                              setWallets(updated);
                              fundAllWallets(); 
                            }
                          }}
                          className="flex items-center gap-1.5 text-[10px] text-red-400 font-bold uppercase tracking-wider"
                        >
                          <Plus size={12} className="rotate-45" />
                          Retry
                        </button>
                      )}
                    </div>
                    {wallet.error && (
                      <span className="text-[10px] text-red-400/60 italic truncate max-w-[150px]">
                        {wallet.error}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 pt-4"
          >
            <button
              onClick={() => {
                setCurrentPage(prev => Math.max(1, prev - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage === 1}
              className="p-2 px-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1 px-4">
              <span className="text-white/40 text-sm">Page</span>
              <span className="text-blue-400 font-mono font-bold">{currentPage}</span>
              <span className="text-white/40 text-sm">of</span>
              <span className="text-white/60 font-mono">{totalPages}</span>
            </div>

            <button
              onClick={() => {
                setCurrentPage(prev => Math.min(totalPages, prev + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage === totalPages}
              className="p-2 px-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium"
            >
              Next
            </button>
          </motion.div>
        )}

        {/* History Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-8"
        >
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between mb-6"
            >
              <div className="flex items-center gap-3">
                <History size={24} className="text-blue-400" />
                <h2 className="text-2xl font-bold">Wallet History</h2>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold">
                  {history.length} {history.length === 1 ? 'Session' : 'Sessions'}
                </span>
              </div>
              {showHistory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            <AnimatePresence>
              {showHistory && history.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  {history.map((session) => {
                    const stats = getSessionStats(session);
                    const isExpanded = expandedSessions.has(session.id);
                    const date = new Date(session.timestamp);

                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/3 border border-white/10 rounded-2xl p-4 sm:p-5"
                      >
                        {/* Session Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-semibold text-white/80">
                                {formatRelativeTime(session.timestamp)}
                              </span>
                              <span className="text-[10px] text-white/30 font-medium">
                                ({date.toLocaleDateString()} {date.toLocaleTimeString()})
                              </span>
                              {session.transferMode === 'bulk' && (
                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-semibold flex items-center gap-1">
                                  <Zap size={12} />
                                  Bulk
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-white/60">
                              <span>{stats.total} wallets</span>
                              <span className="text-emerald-400">{stats.successful} successful</span>
                              {stats.failed > 0 && <span className="text-red-400">{stats.failed} failed</span>}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Tooltip text="Restore Session">
                              <button
                                onClick={() => restoreSession(session)}
                                className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
                              >
                                <RotateCcw size={16} className="text-blue-400" />
                              </button>
                            </Tooltip>
                            <Tooltip text="Export CSV">
                              <button
                                onClick={() => exportSessionToCSV(session)}
                                className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg transition-colors"
                              >
                                <Download size={16} className="text-emerald-400" />
                              </button>
                            </Tooltip>
                            <Tooltip text="Export JSON">
                              <button
                                onClick={() => exportSessionToJSON(session)}
                                className="p-2 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg transition-colors"
                              >
                                <FileJson size={16} className="text-orange-400" />
                              </button>
                            </Tooltip>
                            <Tooltip text="Delete Session">
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} className="text-red-400" />
                              </button>
                            </Tooltip>
                            <button
                              onClick={() => toggleSessionExpand(session.id)}
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* Bulk Transaction Hash */}
                        {session.bulkTxHash && (
                          <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Zap size={16} className="text-purple-400" />
                              <span className="text-xs text-white/60 font-mono">
                                {session.bulkTxHash.slice(0, 10)}...{session.bulkTxHash.slice(-8)}
                              </span>
                            </div>
                            <a
                              href={`https://etherscan.io/tx/${session.bulkTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:text-purple-300 transition-colors"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        )}

                        {/* Expanded Wallet List */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-2 pt-4 border-t border-white/10"
                            >
                              {session.wallets.slice(0, 10).map((wallet) => (
                                <div
                                  key={wallet.address}
                                  className="flex items-center justify-between p-3 bg-white/3 rounded-lg text-xs"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className="w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] text-blue-400 shrink-0">
                                      {wallet.index}
                                    </span>
                                    <code className="text-white/70 font-mono truncate">
                                      {wallet.address}
                                    </code>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {wallet.status === 'success' && (
                                      <CheckCircle2 size={14} className="text-emerald-400" />
                                    )}
                                    {wallet.status === 'error' && (
                                      <AlertCircle size={14} className="text-red-400" />
                                    )}
                                    {wallet.txHash && (
                                      <a
                                        href={`https://etherscan.io/tx/${wallet.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300"
                                      >
                                        <ExternalLink size={12} />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {session.wallets.length > 10 && (
                                <p className="text-center text-xs text-white/40 pt-2">
                                  Showing 10 of {session.wallets.length} wallets. Export for full list.
                                </p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
              {showHistory && history.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-white/40"
                >
                  <History size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No wallet sessions yet. Generate wallets to start building your history.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        {wallets.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-white/20 space-y-4"
          >
            <WalletIcon size={48} strokeWidth={1} />
            <p className="text-sm font-medium">Generate some wallets to get started</p>
          </motion.div>
        )}

        <footer className="text-center pt-8 text-white/20 text-xs">
          <p>© 2025 Ethereum Wallet Generator • Built with Privacy in Mind</p>
        </footer>
      </main>
    </div>
  );
}
