// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MinimalStorage {
    uint256 public number;

    constructor() {
        number = 0;
    }

    function store(uint256 num) public {
        number = num;
    }

    function retrieve() public view returns (uint256) {
        return number;
    }
}
