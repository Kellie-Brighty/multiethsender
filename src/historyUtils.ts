import type { GeneratedWallet } from './utils';

export interface WalletSession {
  id: string;
  timestamp: number;
  wallets: GeneratedWallet[];
  bulkTxHash?: string;
  transferMode: 'individual' | 'bulk';
  fundingAmount: string;
  totalWallets: number;
  successfulTransfers: number;
  failedTransfers: number;
}

export interface WalletHistory {
  sessions: WalletSession[];
}

const HISTORY_STORAGE_KEY = 'eth_wallets_history';

/**
 * Get all wallet history from localStorage
 */
export function getWalletHistory(): WalletHistory {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load wallet history:', error);
  }
  return { sessions: [] };
}

/**
 * Save wallet history to localStorage
 */
export function saveWalletHistory(history: WalletHistory): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save wallet history:', error);
  }
}

/**
 * Add a new session to history
 */
export function addSessionToHistory(session: Omit<WalletSession, 'id' | 'timestamp'>): WalletSession {
  const history = getWalletHistory();
  
  const newSession: WalletSession = {
    ...session,
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  
  history.sessions.unshift(newSession); // Add to beginning
  saveWalletHistory(history);
  
  return newSession;
}

/**
 * Update an existing session in history
 */
export function updateSessionInHistory(sessionId: string, updates: Partial<WalletSession>): void {
  const history = getWalletHistory();
  const sessionIndex = history.sessions.findIndex(s => s.id === sessionId);
  
  if (sessionIndex !== -1) {
    history.sessions[sessionIndex] = {
      ...history.sessions[sessionIndex],
      ...updates,
    };
    saveWalletHistory(history);
  }
}

/**
 * Delete a session from history
 */
export function deleteSessionFromHistory(sessionId: string): void {
  const history = getWalletHistory();
  history.sessions = history.sessions.filter(s => s.id !== sessionId);
  saveWalletHistory(history);
}

/**
 * Get session statistics
 */
export function getSessionStats(session: WalletSession) {
  const successful = session.wallets.filter(w => w.status === 'success').length;
  const failed = session.wallets.filter(w => w.status === 'error').length;
  const pending = session.wallets.filter(w => w.status === 'pending').length;
  const idle = session.wallets.filter(w => w.status === 'idle').length;
  
  return {
    total: session.wallets.length,
    successful,
    failed,
    pending,
    idle,
  };
}

/**
 * Export session to CSV
 */
export function exportSessionToCSV(session: WalletSession): void {
  const headers = ['Index', 'Address', 'Private Key', 'Status', 'Transaction Hash', 'Error'];
  const rows = session.wallets.map(w => [
    w.index,
    w.address,
    w.privateKey,
    w.status,
    w.txHash || '',
    w.error || '',
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `session_${new Date(session.timestamp).toISOString()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export session to JSON
 */
export function exportSessionToJSON(session: WalletSession): void {
  const jsonContent = JSON.stringify(session, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `session_${new Date(session.timestamp).toISOString()}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
/**
 * Format timestamp to relative "time ago" string
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (seconds < 10) return 'just now';
  return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
}
