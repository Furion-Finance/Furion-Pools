// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IFurionPricingOracle {
    event PriceUpdated(address token, uint256 level, uint256 price);

    function getNFTPrice(address _token, uint256 _id) external view returns (uint256 price);
}
