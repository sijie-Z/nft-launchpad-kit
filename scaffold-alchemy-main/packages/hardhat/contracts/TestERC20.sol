// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestERC20
 * @dev 简单可增发的测试代币，用于本地单测支付铸造
 */
contract TestERC20 is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    /**
     * @dev 铸造测试代币到指定地址
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

