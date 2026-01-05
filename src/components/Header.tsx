import { motion } from 'framer-motion';
import { Wallet as WalletIcon, Link, Unlink, Network, Save } from 'lucide-react';

interface HeaderProps {
  signer: any;
  userAddress: string | null;
  walletBalance: string | null;
  chainId: number | null;
  expectedChainId: number;
  hasWallets: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const Header = ({
  signer,
  userAddress,
  walletBalance,
  chainId,
  expectedChainId,
  hasWallets,
  onConnect,
  onDisconnect
}: HeaderProps) => {
  return (
    <header className="w-full flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
      <div className="flex flex-col items-center md:items-start gap-2">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center border border-blue-500/20">
            <WalletIcon className="text-blue-400" size={24} />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gradient">Ethos</h1>
            {hasWallets && (
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/60 font-bold uppercase tracking-widest mt-1">
                <Save size={12} />
                Session Auto-Saved
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="flex flex-wrap justify-center items-center gap-4">
        {signer && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl"
          >
            <Network size={16} className={chainId === expectedChainId ? "text-emerald-400" : "text-orange-400"} />
            <span className="text-xs font-semibold">
              {chainId === expectedChainId ? (
                <span className="text-emerald-400">Ethereum</span>
              ) : chainId ? (
                <span className="text-orange-400">Wrong Network</span>
              ) : (
                <span className="text-white/40">Detecting...</span>
              )}
            </span>
          </motion.div>
        )}

        {signer ? (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 glass rounded-2xl p-1.5 pr-4 pl-1.5 shadow-2xl"
          >
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-white shrink-0 border border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider leading-none mb-1">Connected</span>
              <span className="text-xs font-mono font-medium text-white/90">
                {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
              </span>
              {walletBalance && (
                <span className="text-[10px] text-emerald-400 font-bold mt-0.5">
                  {walletBalance} ETH
                </span>
              )}
            </div>
            <button 
              onClick={onDisconnect}
              className="ml-2 p-2 hover:bg-red-500/10 rounded-lg transition-colors text-white/20 hover:text-red-400"
              title="Disconnect Wallet"
            >
              <Unlink size={18} />
            </button>
          </motion.div>
        ) : (
          <button 
            onClick={onConnect}
            className="flex items-center gap-2 px-8 py-4 bg-white text-black hover:bg-white/90 rounded-2xl font-bold transition-all active:scale-95 group shadow-xl shadow-white/5"
          >
            <Link size={20} className="group-hover:rotate-12 transition-transform" />
            <span>Connect Wallet</span>
          </button>
        )}
      </div>
    </header>
  );
};
