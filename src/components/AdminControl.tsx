import { motion } from 'framer-motion';
import { Zap, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AdminControlProps {
  isOwner: boolean;
  feesEnabled: boolean;
  platformFee: string;
  isTogglingFees: boolean;
  onToggleFees: () => void;
}

export const AdminControl = ({
  isOwner,
  feesEnabled,
  platformFee,
  isTogglingFees,
  onToggleFees
}: AdminControlProps) => {
  if (!isOwner) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-8 glass rounded-3xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-purple-500/20 shadow-2xl shadow-purple-900/10"
    >
      <div className="flex items-center gap-4 w-full md:w-auto">
        <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
          <Zap size={24} className="text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Admin Control</h3>
          <p className="text-[10px] text-purple-400/60 font-bold uppercase tracking-widest">Manage Bulk Contract Protocol</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 w-full md:w-auto justify-between md:justify-end">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Protocol Fees</span>
          <button
            onClick={onToggleFees}
            disabled={isTogglingFees}
            className={cn(
              "relative w-12 h-6 rounded-full transition-all duration-300 outline-none flex items-center",
              feesEnabled ? "bg-purple-600 shadow-lg shadow-purple-600/40" : "bg-white/10"
            )}
          >
            <motion.div
              animate={{ x: feesEnabled ? 26 : 2 }}
              className="w-5 h-5 bg-white rounded-full shadow-sm"
            />
            {isTogglingFees && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                <Loader2 size={12} className="animate-spin text-white" />
              </div>
            )}
          </button>
        </div>
        
        <div className="h-8 w-px bg-white/5 hidden md:block" />
        
        <div className="text-right">
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Current Service Fee</p>
          <p className="text-lg font-mono font-bold text-purple-400">{platformFee} <span className="text-xs">ETH</span></p>
        </div>
      </div>
    </motion.div>
  );
};
