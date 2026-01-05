import { useState, useEffect } from 'react';
import { 
  BrowserProvider, 
  Contract, 
  parseEther, 
  formatEther, 
  type Signer, 
  ZeroAddress, 
  parseUnits 
} from 'ethers';
import { 
  generateWallets, 
  exportToCSV, 
  exportToJSON, 
  type GeneratedWallet 
} from './utils';
import { 
  sendEqualAmounts, 
  sendDifferentAmounts, 
  toggleFees,
  prepareRecipientsFromWallets, 
  getTokenInfo, 
  approveToken,
  calculateTotalAmount,
  getMultiSendContract,
  type TokenInfo 
} from './contractUtils';
import { EXPECTED_CHAIN_ID } from './contract';
import { POPULAR_TOKENS, getCustomTokens, saveCustomToken, type TokenDefinition } from './tokens';
import { 
  getWalletHistory, 
  addSessionToHistory, 
  updateSessionInHistory, 
  deleteSessionFromHistory,
  exportSessionToCSV,
  exportSessionToJSON,
  type WalletSession 
} from './historyUtils';

// Sub-components
import { Header } from './components/Header';
import { ConfigCard } from './components/ConfigCard';
import { WalletList } from './components/WalletList';
import { HistorySection } from './components/HistorySection';
import { AdminControl } from './components/AdminControl';

declare global {
  interface Window {
    ethereum?: any;
  }
}

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
  const [isAmountSynced, setIsAmountSynced] = useState(true);
  
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
  
  // Asset & ERC20 State
  const [assetType, setAssetType] = useState<'ETH' | 'ERC20'>('ETH');
  const [tokenAddress, setTokenAddress] = useState<string>('');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [platformFee, setPlatformFee] = useState<string>('0');
  const [feesEnabled, setFeesEnabled] = useState<boolean>(true);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isTogglingFees, setIsTogglingFees] = useState<boolean>(false);

  // Discovered Tokens Search
  const [discoveredTokens, setDiscoveredTokens] = useState<(TokenDefinition & { balance?: string })[]>([]);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [tokenSearchTerm, setTokenSearchTerm] = useState('');
  
  const handleAddCustomToken = async (address: string) => {
    if (address.length === 42 && signer && userAddress) {
      try {
        const provider = new BrowserProvider(window.ethereum!);
        const info = await getTokenInfo(address, userAddress, provider);
        if (info) {
          const newToken: TokenDefinition = {
            address,
            symbol: info.symbol,
            decimals: info.decimals,
          };
          saveCustomToken(newToken);
          setTokenAddress(address);
          setTokenSearchTerm('');
          setShowTokenSelector(false);
          await scanTokens();
        }
      } catch (e) {
        alert('Could not find token at this address');
      }
    }
  };

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
  
  // Sync amounts effect
  useEffect(() => {
    if (isAmountSynced && wallets.length > 0 && !isFunding && !isBulkTransferring) {
      setWallets(prev => prev.map(w => {
        if (w.amount !== fundingAmount) {
          return { ...w, amount: fundingAmount, status: 'idle' };
        }
        return w;
      }));
    }
  }, [fundingAmount, isAmountSynced, isFunding, isBulkTransferring]);

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

        // Fetch current fee from contract
        const contract = getMultiSendContract(newSigner);
        const [fee, enabled, ownerAddress] = await Promise.all([
          contract.getCurrentFee(),
          contract.feesEnabled(),
          contract.owner()
        ]);
        setPlatformFee(formatEther(fee));
        setFeesEnabled(enabled);
        setIsOwner(ownerAddress.toLowerCase() === address.toLowerCase());
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

  const handleToggleFees = async () => {
    if (!signer || !isOwner) return;
    setIsTogglingFees(true);
    try {
      const result = await toggleFees(signer);
      if (result.success) {
        // Optimistic update or refresh
        await refreshBalance();
      } else {
        alert(`Failed to toggle fees: ${result.error}`);
      }
    } catch (error) {
      console.error('Error in handleToggleFees:', error);
    }
    setIsTogglingFees(false);
  };

  const refreshBalance = async () => {
    if (signer && userAddress) {
      try {
        const provider = new BrowserProvider(window.ethereum!);
        const contract = getMultiSendContract(signer);
        const [balance, fee, enabled] = await Promise.all([
          provider.getBalance(userAddress),
          contract.getCurrentFee(),
          contract.feesEnabled()
        ]);
        
        setWalletBalance((Number(balance) / 1e18).toFixed(4));
        setPlatformFee(formatEther(fee));
        setFeesEnabled(enabled);

        // Also refresh token info if applicable
        if (assetType === 'ERC20' && tokenAddress) {
          const info = await getTokenInfo(tokenAddress, userAddress, provider);
          setTokenInfo(info);
        }
      } catch (error) {
        console.error('Failed to refresh balance:', error);
      }
    }
  };

  // Scan for token balances
  const scanTokens = async () => {
    if (!signer || !userAddress) return;
    
    try {
      const provider = new BrowserProvider(window.ethereum!);
      const customOnes = getCustomTokens();
      const allToScan = [...POPULAR_TOKENS, ...customOnes];
      
      const results = await Promise.all(
        allToScan.map(async (token) => {
          try {
            const info = await getTokenInfo(token.address, userAddress, provider);
            // Only add discovered tokens that actually have a balance
            if (info && BigInt(info.balance) > 0n) {
              return { ...token, balance: info.balance };
            }
            return null;
          } catch (e) {
            return null;
          }
        })
      );

      const filtered = results.filter((t): t is (TokenDefinition & { balance: string }) => t !== null);
      setDiscoveredTokens(filtered);
    } catch (error) {
      console.error('Failed to scan tokens:', error);
    }
  };

  // Rescan tokens when connecting or switching to ERC20
  useEffect(() => {
    if (signer && userAddress && assetType === 'ERC20') {
      scanTokens();
    }
  }, [signer, userAddress, assetType]);

  // Fetch token info when address changes
  useEffect(() => {
    const fetchToken = async () => {
      if (assetType === 'ERC20' && tokenAddress.length === 42 && signer && userAddress) {
        try {
          const provider = new BrowserProvider(window.ethereum!);
          const info = await getTokenInfo(tokenAddress, userAddress, provider);
          setTokenInfo(info);
        } catch (error) {
          console.error('Failed to fetch token info:', error);
          setTokenInfo(null);
        }
      } else {
        setTokenInfo(null);
      }
    };
    fetchToken();
  }, [tokenAddress, assetType, signer, userAddress]);

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

  const validateWallets = (): boolean => {
    let hasError = false;
    const updatedWallets = wallets.map(w => {
      const amount = parseFloat(w.amount || '0');
      if (amount <= 0 || isNaN(amount)) {
        hasError = true;
        return { ...w, status: 'error' as const, error: 'Enter a valid amount > 0' };
      }
      return w;
    });

    if (hasError) {
      setWallets(updatedWallets);
      alert('Some wallets have invalid or empty amounts. Please fix them before funding.');
      return false;
    }
    return true;
  };

  const fundAllWallets = async () => {
    if (!signer) return;
    
    // Validate before starting
    if (!validateWallets()) return;

    setIsFunding(true);

    const updatedWallets = [...wallets];
    
    for (let i = 0; i < updatedWallets.length; i++) {
      const wallet = updatedWallets[i];
      if (wallet.status === 'success') continue;

      try {
        updatedWallets[i] = { ...wallet, status: 'pending' };
        setWallets([...updatedWallets]);

        const isETH = assetType === 'ETH';
        const decimals = isETH ? 18 : tokenInfo?.decimals || 18;
        
        let tx;
        if (isETH) {
          tx = await signer.sendTransaction({
            to: wallet.address,
            value: parseEther(wallet.amount),
          });
        } else {
          // ERC20 Transfer
          const tokenContract = new Contract(tokenAddress, [
            'function transfer(address to, uint256 amount) public returns (bool)'
          ], signer);
          tx = await tokenContract.transfer(wallet.address, parseUnits(wallet.amount, decimals));
        }

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

    // Validate before starting
    if (!validateWallets()) return;
    
    // Check if on correct network
    if (chainId !== EXPECTED_CHAIN_ID) {
      alert(`Please switch to Ethereum Mainnet (Chain ID: ${EXPECTED_CHAIN_ID})`);
      return;
    }

    setIsBulkTransferring(true);
    setBulkTxHash(null);

    try {
      const recipients = prepareRecipientsFromWallets(wallets);
      const isETH = assetType === 'ETH';
      const decimals = isETH ? 18 : tokenInfo?.decimals || 18;
      const tAddress = isETH ? ZeroAddress : tokenAddress;

      // Handle ERC20 Approval if needed
      if (!isETH && tokenInfo) {
        const totalNeeded = parseUnits(
          calculateTotalAmount(wallets[0].amount, wallets.length, decimals),
          decimals
        );
        
        if (BigInt(tokenInfo.allowance) < totalNeeded) {
          setIsApproving(true);
          const approveRes = await approveToken(tokenAddress, totalNeeded, signer);
          setIsApproving(false);
          if (!approveRes.success) {
            alert(`Approval failed: ${approveRes.error}`);
            setIsBulkTransferring(false);
            return;
          }
          // Refresh token info to update allowance
          await refreshBalance();
        }
      }

      // Check if all amounts are the same
      const firstAmount = wallets[0].amount;
      const allSame = wallets.every(w => w.amount === firstAmount);

      let result;
      if (allSame) {
        const totalAmount = calculateTotalAmount(firstAmount, wallets.length, decimals);
        result = await sendEqualAmounts(signer, recipients, totalAmount, tAddress, decimals);
      } else {
        const amounts = wallets.map(w => w.amount);
        result = await sendDifferentAmounts(signer, recipients, amounts, tAddress, decimals);
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
    setIsAmountSynced(false); // Turn off sync on manual edit
    setWallets(prev => prev.map(w => 
      w.index === index ? { ...w, amount: newAmount, status: 'idle' } : w
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

      <main className="relative z-10 w-full max-w-[1400px]">
        <Header 
          signer={signer}
          userAddress={userAddress}
          walletBalance={walletBalance}
          chainId={chainId}
          expectedChainId={EXPECTED_CHAIN_ID}
          hasWallets={wallets.length > 0}
          onConnect={connectWallet}
          onDisconnect={disconnectWallet}
        />

        <AdminControl 
          isOwner={isOwner}
          feesEnabled={feesEnabled}
          platformFee={platformFee}
          isTogglingFees={isTogglingFees}
          onToggleFees={handleToggleFees}
        />

        <ConfigCard 
          assetType={assetType}
          setAssetType={setAssetType}
          count={count}
          setCount={setCount}
          fundingAmount={fundingAmount}
          setFundingAmount={setFundingAmount}
          handleGenerate={handleGenerate}
          showTokenSelector={showTokenSelector}
          setShowTokenSelector={setShowTokenSelector}
          tokenAddress={tokenAddress}
          tokenInfo={tokenInfo}
          discoveredTokens={discoveredTokens}
          tokenSearchTerm={tokenSearchTerm}
          setTokenSearchTerm={setTokenSearchTerm}
          onSelectToken={(token) => {
            setTokenAddress(token.address);
            setShowTokenSelector(false);
            setTokenSearchTerm('');
          }}
          onAddCustomToken={handleAddCustomToken}
        />

        <div className="mt-12">
          <WalletList 
            wallets={wallets}
            paginatedWallets={paginatedWallets}
            showPrivateKeys={showPrivateKeys}
            togglePrivateKey={togglePrivateKey}
            copyToClipboard={copyToClipboard}
            copiedIndex={copiedIndex}
            updateWalletAmount={updateWalletAmount}
            isFunding={isFunding}
            isBulkTransferring={isBulkTransferring}
            onFundAll={fundAllWallets}
            onBulkTransfer={handleBulkTransfer}
            transferMode={transferMode}
            setTransferMode={setTransferMode}
            assetType={assetType}
            tokenInfo={tokenInfo}
            platformFee={platformFee}
            feesEnabled={feesEnabled}
            isApproving={isApproving}
            onExportCSV={() => exportToCSV(wallets)}
            onExportJSON={() => exportToJSON(wallets)}
            onClear={() => { 
              setWallets([]); 
              setCurrentPage(1); 
              setBulkTxHash(null); 
              setCurrentSessionId(null);
              setIsAmountSynced(true); // Reset sync on clear
            }}
            isAmountSynced={isAmountSynced}
            setIsAmountSynced={setIsAmountSynced}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
          />
        </div>

        <HistorySection 
          showHistory={showHistory}
          setShowHistory={setShowHistory}
          history={history}
          expandedSessions={expandedSessions}
          toggleSessionExpand={toggleSessionExpand}
          restoreSession={restoreSession}
          handleDeleteSession={handleDeleteSession}
          exportSessionToJSON={exportSessionToJSON}
          exportSessionToCSV={exportSessionToCSV}
        />

        <footer className="text-center pb-8 text-white/10 text-[10px] font-bold uppercase tracking-[0.2em]">
          <p>© 2026 Ethos Protocol • Secured by Decentralization</p>
        </footer>
      </main>
    </div>
  );
}
