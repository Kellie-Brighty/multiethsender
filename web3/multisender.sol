// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MultiSend
 * @dev Secure contract to send ETH to multiple addresses in a single transaction
 * @notice Implements reentrancy protection and gas optimization
 */
contract MultiSend {
    
    // Owner address
    address private immutable _owner;
    
    // Reentrancy guard
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private _status;
    
    // Gas limit for each transfer to prevent gas griefing
    uint256 private constant TRANSFER_GAS_LIMIT = 10000;
    
    event MultiTransfer(address indexed sender, uint256 totalAmount, uint256 recipientCount);
    event TransferFailed(address indexed recipient, uint256 amount);
    event Withdrawal(address indexed owner, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    constructor() {
        _owner = msg.sender;
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
    
    /**
     * @dev Send equal amounts of ETH to multiple addresses
     * @param recipients Array of addresses to receive funds
     */
    function sendEqualAmounts(address payable[] calldata recipients) 
        external 
        payable 
        nonReentrant 
    {
        require(recipients.length > 0, "No recipients provided");
        require(recipients.length <= 200, "Too many recipients");
        require(msg.value > 0, "No ETH sent");
        
        uint256 amountPerRecipient = msg.value / recipients.length;
        require(amountPerRecipient > 0, "Amount per recipient is zero");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");
            _safeTransfer(recipients[i], amountPerRecipient);
        }
        
        emit MultiTransfer(msg.sender, msg.value, recipients.length);
    }
    
    /**
     * @dev Send different amounts of ETH to multiple addresses
     * @param recipients Array of addresses to receive funds
     * @param amounts Array of amounts corresponding to each recipient
     */
    function sendDifferentAmounts(
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
        require(msg.value >= totalAmount, "Insufficient ETH sent");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _safeTransfer(recipients[i], amounts[i]);
        }
        
        emit MultiTransfer(msg.sender, totalAmount, recipients.length);
        
        // Refund excess ETH if any
        uint256 excess = msg.value - totalAmount;
        if (excess > 0) {
            _safeTransfer(payable(msg.sender), excess);
        }
    }
    
    /**
     * @dev Internal function to safely transfer ETH with gas limit
     * @param recipient Address to receive funds
     * @param amount Amount of ETH to send
     */
    function _safeTransfer(address payable recipient, uint256 amount) private {
        (bool success, ) = recipient.call{value: amount, gas: TRANSFER_GAS_LIMIT}("");
        if (!success) {
            emit TransferFailed(recipient, amount);
            // Note: Failed transfers don't revert, they just emit an event
            // Funds remain in contract and can be recovered
        }
    }
    
    /**
     * @dev Withdraw stuck funds from the contract (owner only)
     * @param amount Amount to withdraw (0 = withdraw all)
     */
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        uint256 withdrawAmount = amount == 0 ? balance : amount;
        require(withdrawAmount <= balance, "Insufficient contract balance");
        
        (bool success, ) = payable(_owner).call{value: withdrawAmount}("");
        require(success, "Withdrawal failed");
        
        emit Withdrawal(_owner, withdrawAmount);
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get owner address
     */
    function owner() external view returns (address) {
        return _owner;
    }
    
    /**
     * @dev Fallback function to receive ETH
     */
    receive() external payable {}
}