// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DynamicERC20
 * @dev Minimal ERC20 implementation with DYNAMIC name and symbol
 * @notice Gas-optimized for testnet deployment with customizable metadata
 */
contract DynamicERC20 {
    string private _name;
    string private _symbol;
    uint8 private constant _decimals = 18;
    uint256 private _totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Constructor accepts name, symbol, and initial supply
     * @param tokenName Name of the token (e.g., "My Test Token")
     * @param tokenSymbol Symbol of the token (e.g., "MTT")
     * @param initialSupply Initial supply in smallest units (with 18 decimals)
     */
    constructor(string memory tokenName, string memory tokenSymbol, uint256 initialSupply) {
        require(bytes(tokenName).length > 0, "Name cannot be empty");
        require(bytes(tokenSymbol).length > 0, "Symbol cannot be empty");
        require(initialSupply > 0, "Initial supply must be > 0");

        _name = tokenName;
        _symbol = tokenSymbol;
        _totalSupply = initialSupply;
        _balances[msg.sender] = initialSupply;

        emit Transfer(address(0), msg.sender, initialSupply);
    }

    // ERC20 Standard View Functions
    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function decimals() public pure returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    // ERC20 Standard State-Changing Functions
    function transfer(address to, uint256 amount) public returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(_balances[msg.sender] >= amount, "Insufficient balance");

        _balances[msg.sender] -= amount;
        _balances[to] += amount;

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Approve to zero address");

        _allowances[msg.sender][spender] = amount;

        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(_balances[from] >= amount, "Insufficient balance");
        require(_allowances[from][msg.sender] >= amount, "Insufficient allowance");

        _balances[from] -= amount;
        _balances[to] += amount;
        _allowances[from][msg.sender] -= amount;

        emit Transfer(from, to, amount);
        return true;
    }
}
