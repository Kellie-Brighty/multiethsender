export interface TokenDefinition {
  address: string;
  symbol: string;
  decimals: number;
  logoUrl?: string;
}

export const POPULAR_TOKENS: TokenDefinition[] = [
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    decimals: 6,
  },
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48',
    symbol: 'USDC',
    decimals: 6,
  },
  {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    symbol: 'DAI',
    decimals: 18,
  },
  {
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    symbol: 'WBTC',
    decimals: 8,
  },
  {
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    symbol: 'LINK',
    decimals: 18,
  },
  {
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    symbol: 'UNI',
    decimals: 18,
  },
  {
    address: '0x95aD61b0a150d79219dcf64E1E6Cc01f0B64C4cE',
    symbol: 'SHIB',
    decimals: 18,
  },
  {
    address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
    symbol: 'PEPE',
    decimals: 18,
  },
  {
    address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    symbol: 'stETH',
    decimals: 18,
  },
  {
    address: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
    symbol: 'APE',
    decimals: 18,
  }
];

export const getCustomTokens = (): TokenDefinition[] => {
  const saved = localStorage.getItem('ethos_custom_tokens');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse custom tokens', e);
      return [];
    }
  }
  return [];
};

export const saveCustomToken = (token: TokenDefinition) => {
  const tokens = getCustomTokens();
  const exists = tokens.find(t => t.address.toLowerCase() === token.address.toLowerCase());
  if (!exists) {
    const updated = [...tokens, token];
    localStorage.setItem('ethos_custom_tokens', JSON.stringify(updated));
    return updated;
  }
  return tokens;
};
