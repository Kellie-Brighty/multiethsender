import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar,

  ChevronDown, 
  
  ExternalLink,
  FileJson, 
  FileSpreadsheet,
  History, 
  
  RotateCcw, 
  Trash2, 
  Zap
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatRelativeTime } from '../historyUtils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HistorySectionProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  history: any[];
  expandedSessions: Set<string>;
  toggleSessionExpand: (id: string) => void;
  restoreSession: (session: any) => void;
  handleDeleteSession: (id: string) => void;
  exportSessionToJSON: (session: any) => void;
  exportSessionToCSV: (session: any) => void;
}

export const HistorySection = ({
  showHistory,
  setShowHistory,
  history,
  expandedSessions,
  toggleSessionExpand,
  restoreSession,
  handleDeleteSession,
  exportSessionToJSON,
  exportSessionToCSV
}: HistorySectionProps) => {
  return (
    <div className="w-full mt-12 mb-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
            <History size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Session History</h2>
            <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Manage past distributions</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="px-4 py-2 glass rounded-xl text-xs font-bold hover:bg-white/10 transition-colors uppercase tracking-widest"
        >
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      </div>

      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {history.length === 0 ? (
              <div className="glass rounded-4xl p-6 md:p-10 text-center">
                <p className="text-white/20 font-medium">No sessions recorded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {history.map((session) => (
                  <motion.div 
                    key={session.id}
                    layout
                    className="glass rounded-3xl overflow-hidden border-white/5"
                  >
                    <div className="p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 shrink-0">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white/90">{formatRelativeTime(session.timestamp)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-white/30 font-bold uppercase">{session.wallets.length} Wallets</span>
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="text-[10px] text-emerald-400 font-bold uppercase">{session.successfulTransfers} Success</span>
                            {session.failedTransfers > 0 && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-white/10" />
                                    <span className="text-[10px] text-red-500 font-bold uppercase">{session.failedTransfers} Failed</span>
                                </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                        <button 
                          onClick={() => restoreSession(session)}
                          className="flex-1 md:flex-none px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                        >
                          <RotateCcw size={14} className="text-emerald-400" />
                          <span>Restore</span>
                        </button>
                        
                        <div className="h-6 w-px bg-white/5 hidden md:block" />

                        <div className="flex items-center gap-2">
                           <button 
                            onClick={() => exportSessionToJSON(session)}
                            className="p-2.5 hover:bg-white/10 rounded-xl text-white/20 hover:text-white transition-colors"
                            title="Export JSON"
                          >
                            <FileJson size={18} />
                          </button>
                          <button 
                            onClick={() => exportSessionToCSV(session)}
                            className="p-2.5 hover:bg-white/10 rounded-xl text-white/20 hover:text-white transition-colors"
                            title="Export CSV"
                          >
                            <FileSpreadsheet size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-2.5 hover:bg-red-500/10 rounded-xl text-white/20 hover:text-red-400 transition-colors"
                            title="Delete Session"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <button 
                          onClick={() => toggleSessionExpand(session.id)}
                          className={cn(
                            "p-2.5 rounded-xl transition-all",
                            expandedSessions.has(session.id) ? "bg-white/10 text-white" : "text-white/20 hover:text-white"
                          )}
                        >
                          <ChevronDown size={20} className={cn("transition-transform", expandedSessions.has(session.id) && "rotate-180")} />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedSessions.has(session.id) && (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="border-t border-white/5 bg-black/40 overflow-hidden"
                        >
                          <div className="p-6">
                            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                              {session.wallets.map((w: any) => (
                                <div key={w.address} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="font-mono text-[11px] text-white/60">{w.address}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-bold text-white/40">{w.amount} {session.assetType || 'ETH'}</span>
                                    {w.txHash && (
                                       <a href={`https://etherscan.io/tx/${w.txHash}`} target="_blank" rel="noreferrer">
                                          <ExternalLink size={12} className="text-white/20 hover:text-white" />
                                       </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {session.bulkTxHash && (
                                <div className="mt-4 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Zap size={14} className="text-purple-400" />
                                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Bulk Transaction Hash</span>
                                    </div>
                                    <a 
                                        href={`https://etherscan.io/tx/${session.bulkTxHash}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-[10px] font-mono text-white/60 hover:text-white flex items-center gap-1.5"
                                    >
                                        {session.bulkTxHash}
                                        <ExternalLink size={12} />
                                    </a>
                                </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
