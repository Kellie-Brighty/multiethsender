import { motion, AnimatePresence } from 'framer-motion';
import { 
  Copy, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  ExternalLink,
  ChevronDown,
  Trash2,
  Coins,
  Zap
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface WalletListProps {
  wallets: any[];
  paginatedWallets: any[];
  showPrivateKeys: Record<number, boolean>;
  togglePrivateKey: (index: number) => void;
  copyToClipboard: (text: string, index: number, type: 'address' | 'pk') => void;
  copiedIndex: { index: number; type: 'address' | 'pk' } | null;
  updateWalletAmount: (index: number, amount: string) => void;
  isFunding: boolean;
  isBulkTransferring: boolean;
  onFundAll: () => void;
  onBulkTransfer: () => void;
  transferMode: 'individual' | 'bulk';
  setTransferMode: (mode: 'individual' | 'bulk') => void;
  assetType: 'ETH' | 'ERC20';
  tokenInfo: any;
  platformFee: string;
  feesEnabled: boolean;
  isApproving: boolean;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onClear: () => void;
  isAmountSynced: boolean;
  setIsAmountSynced: (synced: boolean) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
}

export const WalletList = ({
  wallets,
  paginatedWallets,
  showPrivateKeys,
  togglePrivateKey,
  copyToClipboard,
  copiedIndex,
  updateWalletAmount,
  isFunding,
  isBulkTransferring,
  onFundAll,
  onBulkTransfer,
  transferMode,
  setTransferMode,
  assetType,
  tokenInfo,
  platformFee,
  feesEnabled,
  isApproving,
  onExportCSV,
  onExportJSON,
  onClear,
  isAmountSynced,
  setIsAmountSynced,
  currentPage,
  setCurrentPage,
  totalPages
}: WalletListProps) => {
  if (wallets.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 relative z-10"
    >
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 border border-white/10 rounded-3xl p-4 md:p-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/20 p-3 rounded-2xl">
            <Coins className="text-blue-400" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold">Generated Wallets</h3>
            <div className="flex items-center gap-3">
              <p className="text-xs text-white/40">{wallets.length} addresses ready</p>
              {feesEnabled && platformFee !== '0' && (
                <>
                  <div className="w-1 h-1 rounded-full bg-white/10" />
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter flex items-center gap-1">
                    <Zap size={10} />
                    Fee: {platformFee} ETH
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 mr-2 border-r border-white/10 pr-4">
            <button 
              onClick={onExportCSV}
              className="p-2.5 glass rounded-xl hover:bg-white/10 transition-colors text-emerald-400"
              title="Export CSV"
            >
              <Copy size={18} />
            </button>
            <button 
              onClick={onExportJSON}
              className="p-2.5 glass rounded-xl hover:bg-white/10 transition-colors text-orange-400"
              title="Export JSON"
            >
              <Copy size={18} />
            </button>
            <button 
              onClick={onClear}
              className="p-2.5 glass rounded-xl hover:bg-red-500/20 transition-colors text-red-400"
              title="Clear All"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
            <button 
              onClick={() => setTransferMode('individual')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                transferMode === 'individual' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60"
              )}
            >
              <div className={cn("w-1.5 h-1.5 rounded-full", transferMode === 'individual' ? "bg-blue-600" : "bg-white/20")} />
              <span>Direct Transfer</span>
            </button>
            <button 
              onClick={() => setTransferMode('bulk')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                transferMode === 'bulk' ? "bg-purple-600 text-white shadow-lg" : "text-white/40 hover:text-white/60"
              )}
            >
              <Zap size={12} className={transferMode === 'bulk' ? "text-white" : "text-white/20"} />
              <span>Bulk Contract</span>
            </button>
          </div>

          <button 
            onClick={transferMode === 'bulk' ? onBulkTransfer : onFundAll}
            disabled={isFunding || isBulkTransferring || isApproving}
            className={cn(
              "px-8 py-3.5 rounded-2xl font-bold text-sm shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2",
              transferMode === 'bulk' 
                ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40" 
                : "bg-white text-black hover:bg-white/90 shadow-white/10"
            )}
          >
            {isFunding || isBulkTransferring || isApproving ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              transferMode === 'bulk' ? <Zap size={18} /> : <Coins size={18} />
            )}
            <span>{transferMode === 'bulk' ? 'Execute Bulk Transfer' : 'Fund All Wallets'}</span>
          </button>
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 ml-2">
            <div className="flex flex-col">
              <span className="text-[8px] text-white/30 font-bold uppercase tracking-tighter">Sync Mode</span>
              <span className={cn("text-[10px] font-bold", isAmountSynced ? "text-emerald-400" : "text-white/40")}>
                {isAmountSynced ? 'Linked' : 'Manual'}
              </span>
            </div>
            <button 
              onClick={() => setIsAmountSynced(!isAmountSynced)}
              className={cn(
                "w-10 h-5 rounded-full relative transition-colors duration-300",
                isAmountSynced ? "bg-emerald-500/20" : "bg-white/10"
              )}
            >
              <div className={cn(
                "absolute top-1 w-3 h-3 rounded-full transition-all duration-300",
                isAmountSynced ? "right-1 bg-emerald-400" : "left-1 bg-white/20"
              )} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence mode="popLayout">
          {paginatedWallets.map((wallet, idx) => (
            <motion.div
              key={wallet.address}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: idx * 0.05 }}
              className="glass glass-hover rounded-2xl p-4 md:p-5 flex flex-col md:grid md:grid-cols-12 gap-4 items-center"
            >
              <div className="md:col-span-1 flex justify-center">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/40 border border-white/10">
                  {wallet.index}
                </div>
              </div>

              <div className="md:col-span-4 w-full">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Public Address</span>
                  <div className="flex items-center gap-2 font-mono text-sm text-white/80">
                    <span className="truncate">{wallet.address}</span>
                    <button 
                      onClick={() => copyToClipboard(wallet.address, wallet.index, 'address')}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/20 hover:text-white"
                    >
                      {copiedIndex?.index === wallet.index && copiedIndex?.type === 'address' ? <CheckCircle2 className="text-emerald-400" size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="md:col-span-4 w-full">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Private Key</span>
                  <div className="flex items-center gap-2 font-mono text-sm">
                    <span className={cn("truncate transition-all duration-300", !showPrivateKeys[wallet.index] && "blur-md select-none opacity-40")}>
                      {showPrivateKeys[wallet.index] ? wallet.privateKey : '****************************************************************'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => togglePrivateKey(wallet.index)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/20 hover:text-white"
                      >
                        {showPrivateKeys[wallet.index] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button 
                        onClick={() => copyToClipboard(wallet.privateKey, wallet.index, 'pk')}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/20 hover:text-white"
                        disabled={!showPrivateKeys[wallet.index]}
                      >
                        {copiedIndex?.index === wallet.index && copiedIndex?.type === 'pk' ? <CheckCircle2 className="text-emerald-400" size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 w-full">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Amount</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      value={wallet.amount}
                      onChange={(e) => updateWalletAmount(wallet.index, e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-white/20 transition-colors"
                    />
                    <span className="text-[10px] text-white/40 font-bold uppercase">{assetType === 'ETH' ? 'ETH' : tokenInfo?.symbol}</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-1 flex justify-end w-full">
                {wallet.status === 'pending' && <Loader2 className="animate-spin text-blue-400" size={20} />}
                {wallet.status === 'success' && (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="text-emerald-400" size={20} />
                    {wallet.txHash && (
                      <a 
                        href={`https://etherscan.io/tx/${wallet.txHash}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1 hover:bg-white/10 rounded mt-1"
                      >
                        <ExternalLink size={10} className="text-white/20" />
                      </a>
                    )}
                  </div>
                )}
                {wallet.status === 'error' && (
                  <div className="group relative">
                    <AlertCircle className="text-red-400 cursor-help" size={20} />
                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-red-500 rounded-lg text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                      {wallet.error}
                    </div>
                  </div>
                )}
                {wallet.status === 'idle' && <div className="w-5 h-5 rounded-full border border-white/10" />}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 py-4">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="p-2 glass rounded-xl disabled:opacity-20 hover:bg-white/10 transition-colors"
          >
            <ChevronDown className="rotate-90" size={20} />
          </button>
          <span className="text-xs font-bold text-white/40 uppercase tracking-widest">
            Page <span className="text-white">{currentPage}</span> of <span className="text-white">{totalPages}</span>
          </span>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="p-2 glass rounded-xl disabled:opacity-20 hover:bg-white/10 transition-colors"
          >
            <ChevronDown className="-rotate-90" size={20} />
          </button>
        </div>
      )}
    </motion.div>
  );
};
