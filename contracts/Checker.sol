// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Checker is Ownable {
    // Separate pool factory
    address public spFactory;
    // Aggregate pool factory
    address public apFactory;
    // Fractional aggregate pool factory
    address public fapFactory;

    mapping(address => bool) private isFurion;

    modifier callable() {
        require(
            msg.sender == owner() || msg.sender == spFactory || msg.sender == apFactory || msg.sender == fapFactory,
            "Checker: Not permitted to call."
        );
        _;
    }

    function isFurionToken(address _tokenAddress) public view returns (bool) {
        return isFurion[_tokenAddress];
    }

    function setSPFactory(address _spFactory) external onlyOwner {
        spFactory = _spFactory;
    }

    function setAPFactory(address _apFactory) external onlyOwner {
        apFactory = _apFactory;
    }

    function setFAPFactory(address _fapFactory) external onlyOwner {
        fapFactory = _fapFactory;
    }

    function addToken(address _tokenAddress) external callable {
        isFurion[_tokenAddress] = true;
    }
}
