// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./AggregatePool.sol";
import "./interfaces/IAggregatePool.sol";
import "./interfaces/IAggregatePoolFactory.sol";
import "../IChecker.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract AggregatePoolFactory is IAggregatePoolFactory, Ownable {
    address public immutable incomeMaker;
    address public immutable checker;

    address public fur;
    address public oracle;

    // Starts from 0
    uint256 public nextId;
    // Pool ID to pool address
    mapping(uint256 => address) public getPool;

    //mapping(bytes32 => bool) private alreadyExist;

    // No use for now
    // address[] public allPools;

    constructor(address _incomeMaker, address _checker, address _fur, address _oracle) {
        incomeMaker = _incomeMaker;
        checker = _checker;
        fur = _fur;
        oracle = _oracle;
    }

    /**
     * @dev Get total number of aggregate pools in existence
     */
    function allPoolsLength() external view returns (uint256) {
        return nextId;
    }

    /**
     * @dev Change owner for all project pools
     */
    function transferOwnership(address _newOwner) public override onlyOwner {
        require(_newOwner != address(0), "Ownable: New owner is the zero address");

        _transferOwnership(_newOwner);

        // ID starts from 1
        for (uint256 i; i < nextId; ) {
            IAggregatePool(getPool[i]).changeOwner(_newOwner);

            unchecked {
                ++i;
            }
        }
    }

    function setFur(address _newFur) external onlyOwner {
        for (uint256 i; i < nextId; ) {
            IAggregatePool(getPool[i]).setFur(_newFur);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Initialize aggregate pool and grant FFT minting and burning permissions
     *
     * @param _nfts Addresses of project pools / nfts to be included in the aggregate pool
     */
    function createPool(
        address[] memory _nfts,
        string memory _name,
        string memory _symbol
    ) external returns (address poolAddress) {
        require(checker != address(0), "AggregatePoolFactory: Checker not set.");

        bytes32 _salt = keccak256(abi.encodePacked(_nfts));

        poolAddress = address(
            new AggregatePool{ salt: _salt }(
                incomeMaker,
                fur,
                oracle,
                owner(),
                _nfts,
                string.concat("FurionFungibleToken ", _name),
                string.concat("FFT-", _symbol)
            )
        );

        getPool[nextId] = poolAddress;
        IChecker(checker).addToken(poolAddress);

        emit PoolCreated(poolAddress, nextId++);
    }
}
