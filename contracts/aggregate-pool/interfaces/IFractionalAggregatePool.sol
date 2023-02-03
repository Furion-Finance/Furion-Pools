// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IFractionalAggregatePool {
    event RegisteredToken(address tokenAddress);
    event StakedToken(address indexed tokenAddress, address indexed staker, uint256 tokenAmount);
    event UnstakedToken(address indexed tokenAddress, address indexed unstaker, uint256 tokenAmount);

    function factory() external view returns (address);

    function owner() external view returns (address);

    function changeOwner(address _newOwner) external;

    function setFur(address _newFur) external;

    function stake(address _tokenAddress, uint256 _amount) external;

    function unstake(address _tokenAddress, uint256 _amount) external;
}
