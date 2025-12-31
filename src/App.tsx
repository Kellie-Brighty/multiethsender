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
  Eye
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BrowserProvider, parseEther, type Signer } from 'ethers';
import { generateWallets, exportToCSV, exportToJSON, type GeneratedWallet } from './utils';

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
    } else {
      localStorage.removeItem('eth_wallets_session');
    }
  }, [wallets]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const newSigner = await provider.getSigner();
        setSigner(newSigner);
        setUserAddress(await newSigner.getAddress());
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
  };

  const handleGenerate = () => {
    const num = typeof count === 'string' ? parseInt(count) || 1 : count;
    const newWallets = generateWallets(num);
    setWallets(newWallets);
    setShowPrivateKeys({});
    setCurrentPage(1);
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
          value: parseEther(fundingAmount),
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
          "Unknown error";
          
        updatedWallets[i] = { ...updatedWallets[i], status: 'error', error: errorMessage };
        setWallets([...updatedWallets]);
      }
    }
    setIsFunding(false);
  };

  const togglePrivateKey = (index: number) => {
    setShowPrivateKeys(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const copyToClipboard = async (text: string, index: number, type: 'address' | 'pk') => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex({ index, type });
    setTimeout(() => setCopiedIndex(null), 2000);
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

            <div className="col-span-1 sm:col-span-2 lg:col-span-1 grid grid-cols-2 lg:flex gap-3">
              <button 
                onClick={handleGenerate}
                className="col-span-2 lg:col-span-1 px-6 py-3 sm:py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 group whitespace-nowrap active:scale-95"
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300 text-white" />
                <span className="text-white">Generate</span>
              </button>

              <button 
                onClick={fundAllWallets}
                disabled={wallets.length === 0 || isFunding || !signer}
                className={cn(
                  "col-span-1 lg:col-span-1 px-6 py-3 sm:py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 group whitespace-nowrap active:scale-95",
                  signer 
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50" 
                    : "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed"
                )}
              >
                {isFunding ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Coins size={20} className="" />
                )}
                <span>{isFunding ? 'Funding' : 'Fund All'}</span>
              </button>

              {wallets.length > 0 && (
                <div className="col-span-1 lg:col-span-1 flex gap-2">
                  <Tooltip text="Export CSV">
                    <button 
                      onClick={() => exportToCSV(wallets)}
                      className="flex-1 p-3 sm:p-4 bg-white/8 hover:bg-white/15 border border-white/10 rounded-xl transition-all flex items-center justify-center"
                    >
                      <FileSpreadsheet size={20} className="text-emerald-400" />
                    </button>
                  </Tooltip>
                  <Tooltip text="Export JSON">
                    <button 
                      onClick={() => exportToJSON(wallets)}
                      className="flex-1 p-3 sm:p-4 bg-white/8 hover:bg-white/15 border border-white/10 rounded-xl transition-all flex items-center justify-center"
                    >
                      <FileJson size={20} className="text-orange-400" />
                    </button>
                  </Tooltip>
                  <Tooltip text="Clear All">
                    <button 
                      onClick={() => { setWallets([]); setCurrentPage(1); }}
                      className="flex-1 p-3 sm:p-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl transition-all flex items-center justify-center"
                    >
                      <Trash2 size={20} className="text-red-400" />
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-1 gap-4 lg:gap-6">
                    {/* Public Address */}
                    <div className="space-y-1.5 overflow-hidden lg:flex-1">
                      <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold ml-0.5">Address</label>
                      <div className="flex items-center gap-3 bg-white/3 rounded-lg p-3 group/item">
                        <code className="flex-1 font-mono text-[11px] sm:text-sm text-white/70 overflow-hidden text-ellipsis whitespace-nowrap">
                          {wallet.address}
                        </code>
                        <Tooltip text={copiedIndex?.index === wallet.index && copiedIndex?.type === 'address' ? "Copied!" : "Copy Address"}>
                          <button 
                            onClick={() => copyToClipboard(wallet.address, wallet.index, 'address')}
                            className="p-1.5 bg-white/5 hover:bg-white/15 rounded-md transition-colors text-white/40 hover:text-white"
                          >
                            {copiedIndex?.index === wallet.index && copiedIndex?.type === 'address' ? (
                              <CheckCircle2 size={16} className="text-emerald-400" />
                            ) : (
                              <Copy size={16} className="text-white/60" />
                            )}
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Private Key */}
                    <div className="space-y-1.5 overflow-hidden lg:flex-1">
                      <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold ml-0.5">Private Key</label>
                      <div className="flex items-center gap-3 bg-white/3 rounded-lg p-3 group/item">
                        <code className={cn(
                          "flex-1 font-mono text-[11px] sm:text-sm transition-all duration-300 overflow-hidden text-ellipsis whitespace-nowrap",
                          showPrivateKeys[wallet.index] ? "text-red-400/80" : "text-white/20 blur-sm select-none"
                        )}>
                          {wallet.privateKey}
                        </code>
                        <div className="flex items-center gap-1">
                          <Tooltip text={showPrivateKeys[wallet.index] ? "Hide" : "Show"}>
                            <button 
                              onClick={() => togglePrivateKey(wallet.index)}
                              className="p-1.5 bg-white/5 hover:bg-white/15 rounded-md transition-colors text-white/40 hover:text-white"
                            >
                              {showPrivateKeys[wallet.index] ? <EyeOff size={16} className="text-white/60" /> : <Eye size={16} className="text-white/60" />}
                            </button>
                          </Tooltip>
                          <Tooltip text={copiedIndex?.index === wallet.index && copiedIndex?.type === 'pk' ? "Copied!" : "Copy PK"}>
                            <button 
                              onClick={() => copyToClipboard(wallet.privateKey, wallet.index, 'pk')}
                              className="p-1.5 bg-white/5 hover:bg-white/15 rounded-md transition-colors text-white/40 hover:text-white"
                            >
                              {copiedIndex?.index === wallet.index && copiedIndex?.type === 'pk' ? (
                                <CheckCircle2 size={16} className="text-emerald-400" />
                              ) : (
                                <Copy size={16} className="text-white/60" />
                              )}
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Status & Actions */}
                  <div className="hidden lg:flex items-center gap-4 lg:min-w-[120px] justify-end">
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
