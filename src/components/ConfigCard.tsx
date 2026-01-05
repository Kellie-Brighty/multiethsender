import { motion } from 'framer-motion';
import { Plus, Zap, ChevronDown, Search } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ConfigCardProps {
  assetType: 'ETH' | 'ERC20';
  setAssetType: (type: 'ETH' | 'ERC20') => void;
  count: number | string;
  setCount: (count: number | string) => void;
  fundingAmount: string;
  setFundingAmount: (amount: string) => void;
  handleGenerate: () => void;
  showTokenSelector: boolean;
  setShowTokenSelector: (show: boolean) => void;
  tokenAddress: string;
  tokenInfo: any;
  discoveredTokens: any[];
  tokenSearchTerm: string;
  setTokenSearchTerm: (term: string) => void;
  onSelectToken: (token: any) => void;
  onAddCustomToken: (address: string) => void;
}

export const ConfigCard = ({
  assetType,
  setAssetType,
  count,
  setCount,
  fundingAmount,
  setFundingAmount,
  handleGenerate,
  showTokenSelector,
  setShowTokenSelector,
  tokenAddress,
  tokenInfo,
  discoveredTokens,
  tokenSearchTerm,
  setTokenSearchTerm,
  onSelectToken,
  onAddCustomToken
}: ConfigCardProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-[2.5rem] p-6 md:p-10 shadow-3xl relative z-40"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        {/* Asset Selection */}
        <div className="lg:col-span-3 space-y-4">
          <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Asset Type</label>
          <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1.5">
            <button
              onClick={() => setAssetType('ETH')}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all",
                assetType === 'ETH' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60"
              )}
            >
              ETH
            </button>
            <button
              onClick={() => setAssetType('ERC20')}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all",
                assetType === 'ERC20' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60"
              )}
            >
              ERC20
            </button>
          </div>
        </div>

        {/* Dynamic Token Selector */}
        {assetType === 'ERC20' && (
          <div className="lg:col-span-4 space-y-4 relative">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Token Selection</label>
            <button 
              onClick={() => setShowTokenSelector(!showTokenSelector)}
              className="w-full glass rounded-2xl px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Zap size={16} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">
                    {tokenInfo ? tokenInfo.symbol : 'Select Token'}
                  </p>
                  <p className="text-[10px] text-white/40 font-mono truncate max-w-[120px]">
                    {tokenAddress ? `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}` : 'Paste address or search'}
                  </p>
                </div>
              </div>
              <ChevronDown size={18} className={cn("text-white/20 transition-transform", showTokenSelector && "rotate-180")} />
            </button>

            {showTokenSelector && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute top-full left-0 right-0 mt-3 p-4 bg-[#121212] border border-white/20 rounded-3xl shadow-2xl z-100"
              >
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                  <input 
                    autoFocus
                    placeholder="Search name or paste address..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-purple-500/50 transition-colors"
                    value={tokenSearchTerm}
                    onChange={(e) => setTokenSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tokenSearchTerm.length === 42) {
                        onAddCustomToken(tokenSearchTerm);
                      }
                    }}
                  />
                </div>
                
                <div className="max-h-[240px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {discoveredTokens.length > 0 ? (
                    discoveredTokens.map((token) => (
                      <button
                        key={token.address}
                        onClick={() => onSelectToken(token)}
                        className="w-full p-3 rounded-xl hover:bg-white/5 flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-white/60 group-hover:text-white">
                            {token.symbol[0]}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-white/80">{token.symbol}</p>
                            <p className="text-[10px] text-white/30 font-mono italic">{token.address.slice(0, 8)}...</p>
                          </div>
                        </div>
                        {token.balance && (
                          <div className="text-right">
                            <p className="text-xs font-bold text-emerald-400">{(Number(token.balance) / (10 ** token.decimals)).toFixed(2)}</p>
                            <p className="text-[10px] text-white/20 uppercase font-bold">Balance</p>
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-xs text-white/20">No tokens found with balance</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Inputs */}
        <div className={cn("grid grid-cols-2 gap-4", assetType === 'ETH' ? "lg:col-span-6" : "lg:col-span-3")}>
          <div className="space-y-4">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Quantity</label>
            <input 
              type="number"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-full glass rounded-2xl px-5 py-4 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-white/10 transition-all text-center"
              placeholder="0"
            />
          </div>
          <div className="space-y-4">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Amount</label>
            <input 
              type="text"
              value={fundingAmount}
              onChange={(e) => setFundingAmount(e.target.value)}
              className="w-full glass rounded-2xl px-5 py-4 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-white/10 transition-all text-center"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Generate Button */}
        <div className="lg:col-span-2">
          <button 
            onClick={handleGenerate}
            className="w-full h-[60px] bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 group transition-all active:scale-95 shadow-xl shadow-purple-500/20"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            <span>Generate</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
