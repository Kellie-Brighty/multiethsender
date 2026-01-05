// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

/**
 * @title MultiSend with ERC20 Support and Platform Fees
 * @dev Send ETH or ERC20 tokens to multiple addresses with optional platform fees
 */
contract MultiSendWithFees {
    
    // Owner and fee settings
    address private immutable _owner;
    address private _feeCollector;
    uint256 private _flatFee; // Flat fee in wei (e.g., 0.005 ETH = 5000000000000000 wei)
    bool private _feesEnabled;
    
    // Reentrancy guard
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private _status;
    
    // Gas limit for each transfer
    uint256 private constant TRANSFER_GAS_LIMIT = 10000;
    
    // Events
    event MultiTransferETH(address indexed sender, uint256 totalAmount, uint256 feeAmount, uint256 recipientCount);
    event MultiTransferERC20(address indexed sender, address indexed token, uint256 totalAmount, uint256 feeAmount, uint256 recipientCount);
    event TransferFailed(address indexed recipient, uint256 amount);
    event FeesToggled(bool enabled);
    event FlatFeeUpdated(uint256 newFee);
    event FeeCollectorUpdated(address indexed newCollector);
    event Withdrawal(address indexed owner, uint256 amount);
    
    constructor(address feeCollector_, uint256 flatFee_) {
        require(feeCollector_ != address(0), "Invalid fee collector");
        require(flatFee_ <= 0.1 ether, "Fee too high (max 0.1 ETH)"); // Max 0.1 ETH per transaction
        
        _owner = msg.sender;
        _feeCollector = feeCollector_;
        _flatFee = flatFee_;
        _feesEnabled = false; // Start with fees disabled
        _status = NOT_ENTERED;
    }
    
    modifier onlyOwner() {
        require(msg.sender == _owner, "Caller is not the owner");
        _;
    }
    
    modifier nonReentrant() {
        require(_status != ENTERED, "ReentrancyGuard: reentrant call");
        _status = ENTERED;
        _;
        _status = NOT_ENTERED;
    }
    
    // ==================== ETH TRANSFERS ====================
    
    /**
     * @dev Send equal amounts of ETH to multiple addresses
     * @param recipients Array of addresses to receive funds
     */
    function sendEqualAmountsETH(address payable[] calldata recipients) 
        external 
        payable 
        nonReentrant 
    {
        require(recipients.length > 0, "No recipients provided");
        require(recipients.length <= 200, "Too many recipients");
        require(msg.value > 0, "No ETH sent");
        
        uint256 feeAmount = _feesEnabled ? _flatFee : 0;
        require(msg.value > feeAmount, "Insufficient ETH for fee");
        
        uint256 totalForRecipients = msg.value - feeAmount;
        uint256 amountPerRecipient = totalForRecipients / recipients.length;
        require(amountPerRecipient > 0, "Amount per recipient is zero");
        
        // Collect fee if enabled
        if (feeAmount > 0) {
            _safeTransferETH(payable(_feeCollector), feeAmount);
        }
        
        // Send to recipients
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");
            _safeTransferETH(recipients[i], amountPerRecipient);
        }
        
        emit MultiTransferETH(msg.sender, msg.value, feeAmount, recipients.length);
    }
    
    /**
     * @dev Send different amounts of ETH to multiple addresses
     * @param recipients Array of addresses to receive funds
     * @param amounts Array of amounts corresponding to each recipient
     */
    function sendDifferentAmountsETH(
        address payable[] calldata recipients,
        uint256[] calldata amounts
    ) 
        external 
        payable 
        nonReentrant 
    {
        require(recipients.length > 0, "No recipients provided");
        require(recipients.length <= 200, "Too many recipients");
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");
            require(amounts[i] > 0, "Amount must be greater than zero");
            totalAmount += amounts[i];
        }
        
        uint256 feeAmount = _feesEnabled ? _flatFee : 0;
        uint256 totalRequired = totalAmount + feeAmount;
        require(msg.value >= totalRequired, "Insufficient ETH sent");
        
        // Collect fee if enabled
        if (feeAmount > 0) {
            _safeTransferETH(payable(_feeCollector), feeAmount);
        }
        
        // Send to recipients
        for (uint256 i = 0; i < recipients.length; i++) {
            _safeTransferETH(recipients[i], amounts[i]);
        }
        
        // Refund excess
        uint256 excess = msg.value - totalRequired;
        if (excess > 0) {
            _safeTransferETH(payable(msg.sender), excess);
        }
        
        emit MultiTransferETH(msg.sender, totalAmount, feeAmount, recipients.length);
    }
    
    // ==================== ERC20 TRANSFERS ====================
    
    /**
     * @dev Send equal amounts of ERC20 tokens to multiple addresses
     * @param token ERC20 token contract address
     * @param recipients Array of addresses to receive tokens
     * @param totalAmount Total amount of tokens to distribute
     */
    function sendEqualAmountsERC20(
        address token,
        address[] calldata recipients,
        uint256 totalAmount
    ) 
        external 
        payable
        nonReentrant 
    {
        require(token != address(0), "Invalid token address");
        require(recipients.length > 0, "No recipients provided");
        require(recipients.length <= 200, "Too many recipients");
        require(totalAmount > 0, "Amount must be greater than zero");
        
        uint256 feeAmount = _feesEnabled ? _flatFee : 0;
        require(msg.value >= feeAmount, "Insufficient ETH for fee");
        
        IERC20 erc20 = IERC20(token);
        uint256 amountPerRecipient = totalAmount / recipients.length;
        require(amountPerRecipient > 0, "Amount per recipient is zero");
        
        // Collect fee if enabled
        if (feeAmount > 0) {
            _safeTransferETH(payable(_feeCollector), feeAmount);
        }
        
        // Transfer tokens from sender to contract
        require(
            erc20.transferFrom(msg.sender, address(this), totalAmount),
            "Token transfer failed"
        );
        
        // Send to recipients
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");
            require(erc20.transfer(recipients[i], amountPerRecipient), "Transfer failed");
        }
        
        // Refund excess ETH
        uint256 excess = msg.value - feeAmount;
        if (excess > 0) {
            _safeTransferETH(payable(msg.sender), excess);
        }
        
        emit MultiTransferERC20(msg.sender, token, totalAmount, feeAmount, recipients.length);
    }
    
    /**
     * @dev Send different amounts of ERC20 tokens to multiple addresses
     * @param token ERC20 token contract address
     * @param recipients Array of addresses to receive tokens
     * @param amounts Array of amounts corresponding to each recipient
     */
    function sendDifferentAmountsERC20(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) 
        external 
        payable
        nonReentrant 
    {
        require(token != address(0), "Invalid token address");
        require(recipients.length > 0, "No recipients provided");
        require(recipients.length <= 200, "Too many recipients");
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        uint256 feeAmount = _feesEnabled ? _flatFee : 0;
        require(msg.value >= feeAmount, "Insufficient ETH for fee");
        
        IERC20 erc20 = IERC20(token);
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");
            require(amounts[i] > 0, "Amount must be greater than zero");
            totalAmount += amounts[i];
        }
        
        // Collect fee if enabled
        if (feeAmount > 0) {
            _safeTransferETH(payable(_feeCollector), feeAmount);
        }
        
        // Transfer total tokens from sender to contract
        require(
            erc20.transferFrom(msg.sender, address(this), totalAmount),
            "Token transfer failed"
        );
        
        // Send to recipients
        for (uint256 i = 0; i < recipients.length; i++) {
            require(erc20.transfer(recipients[i], amounts[i]), "Transfer failed");
        }
        
        // Refund excess ETH
        uint256 excess = msg.value - feeAmount;
        if (excess > 0) {
            _safeTransferETH(payable(msg.sender), excess);
        }
        
        emit MultiTransferERC20(msg.sender, token, totalAmount, feeAmount, recipients.length);
    }
    
    // ==================== FEE MANAGEMENT ====================
    
    /**
     * @dev Toggle platform fees on/off
     */
    function toggleFees() external onlyOwner {
        _feesEnabled = !_feesEnabled;
        emit FeesToggled(_feesEnabled);
    }
    
    /**
     * @dev Update flat fee amount
     * @param newFee New flat fee in wei (e.g., 0.005 ETH = 5000000000000000)
     */
    function setFlatFee(uint256 newFee) external onlyOwner {
        require(newFee <= 0.1 ether, "Fee too high (max 0.1 ETH)");
        _flatFee = newFee;
        emit FlatFeeUpdated(newFee);
    }
    
    /**
     * @dev Update fee collector address
     * @param newCollector New fee collector address
     */
    function setFeeCollector(address newCollector) external onlyOwner {
        require(newCollector != address(0), "Invalid fee collector");
        _feeCollector = newCollector;
        emit FeeCollectorUpdated(newCollector);
    }
    
    /**
     * @dev Get current fee (0 if disabled, flat fee if enabled)
     */
    function getCurrentFee() public view returns (uint256) {
        return _feesEnabled ? _flatFee : 0;
    }
    
    // ==================== UTILITY FUNCTIONS ====================
    
    /**
     * @dev Internal function to safely transfer ETH with gas limit
     */
    function _safeTransferETH(address payable recipient, uint256 amount) private {
        (bool success, ) = recipient.call{value: amount, gas: TRANSFER_GAS_LIMIT}("");
        if (!success) {
            emit TransferFailed(recipient, amount);
        }
    }
    
    /**
     * @dev Withdraw stuck ETH from contract (owner only)
     */
    function withdrawETH(uint256 amount) external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        uint256 withdrawAmount = amount == 0 ? balance : amount;
        require(withdrawAmount <= balance, "Insufficient contract balance");
        
        (bool success, ) = payable(_owner).call{value: withdrawAmount}("");
        require(success, "Withdrawal failed");
        
        emit Withdrawal(_owner, withdrawAmount);
    }
    
    /**
     * @dev Withdraw stuck ERC20 tokens from contract (owner only)
     */
    function withdrawERC20(address token, uint256 amount) external onlyOwner nonReentrant {
        require(token != address(0), "Invalid token address");
        IERC20 erc20 = IERC20(token);
        
        uint256 balance = erc20.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        
        uint256 withdrawAmount = amount == 0 ? balance : amount;
        require(withdrawAmount <= balance, "Insufficient token balance");
        
        require(erc20.transfer(_owner, withdrawAmount), "Token withdrawal failed");
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    function owner() external view returns (address) {
        return _owner;
    }
    
    function feeCollector() external view returns (address) {
        return _feeCollector;
    }
    
    function flatFee() external view returns (uint256) {
        return _flatFee;
    }
    
    function feesEnabled() external view returns (bool) {
        return _feesEnabled;
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}