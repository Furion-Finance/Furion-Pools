// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ISeparatePool.sol";
import "../utils/TransferNFT.sol";

contract SeparatePool is ERC20Permit, TransferNFT, ISeparatePool {
    IERC20 FUR;

    uint256 public constant SWAP_MINT_AMOUNT = 1000e18;
    uint256 public constant LOCK_MINT_AMOUNT = 500e18;
    uint256 public constant RELEASE_MINT_AMOUNT = 200e18;

    address public immutable factory;
    address public immutable nft;
    // Transfer fee to income maker
    // Fees in this contract are in the form of F-* tokens
    address public immutable incomeMaker;

    // Amount of F-X to mint on top of just 500 when locking
    uint256 lockMintBuffer;

    // Amount of FUR to pay
    uint256 buyFee = 100e18;
    uint256 lockFee = 150e18;

    // Pool admin
    address public owner;

    struct LockInfo {
        address locker;
        bool extended; // Can only extend once
        uint128 releaseTime;
        uint128 mintBuffer; // lockMintBuffer value WHEN NFT IS LOCKED
    }
    mapping(uint256 => LockInfo) public lockInfo;

    constructor(
        address _nftAddress,
        address _incomeMaker,
        address _fur,
        address _owner,
        string memory _tokenName,
        string memory _tokenSymbol
    ) ERC20Permit(_tokenName) ERC20(_tokenName, _tokenSymbol) {
        factory = msg.sender;
        incomeMaker = _incomeMaker;
        nft = _nftAddress;
        FUR = IERC20(_fur);
        owner = _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "SeparatePool: Not permitted to call.");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "SeparatePool: Not permitted to call.");
        _;
    }

    // Check if caller is NFT locker,
    //       if withdrawal is within release time
    modifier redeemable(uint256 _id) {
        require(lockInfo[_id].locker == msg.sender, "SeparatePool: You did not lock this NFT.");
        require(
            lockInfo[_id].releaseTime > block.timestamp,
            "SeparatePool: NFT has already been released to public pool."
        );
        _;
    }

    // Check if NFT is locked,
    //       if releaseTime has passed
    modifier releasable(uint256 _id) {
        require(lockInfo[_id].locker != address(0), "SeparatePool: NFT is not locked.");
        require(lockInfo[_id].releaseTime < block.timestamp, "SeparatePool: Release time not yet reached.");
        _;
    }

    /**
     * @dev Get complete lock info of NFT
     */
    function getLockInfo(uint256 _id) public view returns (LockInfo memory) {
        return lockInfo[_id];
    }

    /**
     * @dev Change fee rate for buying NFT after governance voting
     */
    function setBuyFee(uint256 _newFee) external onlyOwner {
        buyFee = _newFee;
    }

    /**
     * @dev Change fee rate for locking NFT after governance voting
     */
    function setLockFee(uint256 _newFee) external onlyOwner {
        lockFee = _newFee;
    }

    function setLockMintBuffer(uint256 _newAmount) external onlyOwner {
        require(_newAmount < 100e18 + 1, "Buffer too large");
        lockMintBuffer = _newAmount;
    }

    /**
     * @dev Change pool admin/fee receiver
     */
    function changeOwner(address _newOwner) external onlyFactory {
        address oldOwner = owner;
        owner = _newOwner;

        emit OwnerChanged(oldOwner, _newOwner);
    }

    function setFur(address _newFur) external onlyFactory {
        FUR = IERC20(_newFur);
    }

    /**
     * @dev Sell single NFT and mint 1000 tokens immediately
     */
    function sell(uint256 _id) external {
        _sell(_id, true);
    }

    /**
     * @dev Sell multiple NFTs of same collection in one tx
     */
    function sellBatch(uint256[] calldata _ids) external {
        // Number of NFTs in list
        uint256 length = _ids.length;
        require(length < 10, "SeparatePool: Can only sell 9 NFTs at once");

        for (uint256 i; i < length; ) {
            // Mint total amount all at once, so _updateNow is false
            _sell(_ids[i], false);

            unchecked {
                ++i;
            }
        }

        _mint(msg.sender, SWAP_MINT_AMOUNT * length);
    }

    /**
     * @dev Buy single NFT and burn 1000 tokens immediately
     */
    function buy(uint256 _id) external {
        _buy(_id, true);
    }

    /**
     * @dev Buy multiple NFTs of same collection in one tx
     */
    function buyBatch(uint256[] calldata _ids) external {
        // Number of NFTs to buy
        uint256 length = _ids.length;
        require(length < 10, "SeparatePool: Can only buy 9 NFTs at once");

        uint256 burnTotal = SWAP_MINT_AMOUNT * length;
        uint256 feeTotal = buyFee * length;
        _burn(msg.sender, burnTotal);
        FUR.transferFrom(msg.sender, incomeMaker, feeTotal);

        for (uint256 i; i < length; ) {
            // Collected fee all at once, so _updateNow is false
            _buy(_ids[i], false);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Lock NFT to pool for 30 days and get 500 pool tokens, paying 150 FUR as fees
     */
    function lock(uint256 _id) external {
        _lock(_id, true, lockMintBuffer);
    }

    /**
     * @dev Lock multiple NFTs of same collection
     */
    function lockBatch(uint256[] calldata _ids) external {
        // Number of NFTs to buy
        uint256 length = _ids.length;
        require(length < 10, "SeparatePool: Can only buy 9 NFTs at once");

        uint256 _lockMintBuffer = lockMintBuffer;
        uint256 mintTotal = (LOCK_MINT_AMOUNT + _lockMintBuffer) * length;
        uint256 feeTotal = lockFee * length;
        FUR.transferFrom(msg.sender, incomeMaker, feeTotal);

        for (uint256 i; i < length; ) {
            // Collected fee all at once, so _updateNow is false
            _lock(_ids[i], false, _lockMintBuffer);

            unchecked {
                ++i;
            }
        }

        _mint(msg.sender, mintTotal);
    }

    /**
     * @notice Lockers can only extend release time once
     * @dev EXTENDS release time by one month
     */
    function payFee(uint256 _id) external {
        LockInfo memory li = lockInfo[_id];

        require(li.locker == msg.sender, "SeparatePool: You did not lock this NFT.");
        require(li.releaseTime > block.timestamp, "SeparatePool: NFT already released");
        require(!li.extended, "SeparatePool: Already extended once");

        FUR.transferFrom(msg.sender, incomeMaker, lockFee);

        lockInfo[_id].extended = true;
        lockInfo[_id].releaseTime += 30 days;
    }

    /**
     * @notice Lockers must redeem NFT if it has already been extended
     * @dev Redeem locked NFT by paying 500 tokens
     */
    function redeem(uint256 _id) external redeemable(_id) {
        _burn(msg.sender, LOCK_MINT_AMOUNT + lockInfo[_id].mintBuffer);

        delete lockInfo[_id];

        _transferOutNFT(nft, msg.sender, _id);

        emit RedeemedNFT(_id, msg.sender);
    }

    /**
     * @notice Only 200 pool tokens is minted to locker as a penalty
     * @dev Release NFT for swapping and mint pool tokens to locker
     */
    function release(uint256 _id) external onlyOwner releasable(_id) {
        address sendRemainingTo = lockInfo[_id].locker;
        uint256 mintBuffer = lockInfo[_id].mintBuffer;

        delete lockInfo[_id];

        _mint(sendRemainingTo, RELEASE_MINT_AMOUNT);
        _mint(incomeMaker, RELEASE_MINT_AMOUNT - mintBuffer);

        emit ReleasedNFT(_id);
    }

    /**
     * @dev Sell NFT to pool and get 1000 pool tokens
     *
     * @param _updateNow Determines if minting is done immediately or after
     *        multiple calls (batched)
     */
    function _sell(uint256 _id, bool _updateNow) private {
        _transferInNFT(nft, _id);

        if (_updateNow) {
            _mint(msg.sender, SWAP_MINT_AMOUNT);
        }

        emit SoldNFT(_id, msg.sender);
    }

    /**
     * @dev Buy NFT from pool by paying 1000 pool tokens
     *
     * @param _updateNow Determines if burning is done immediately or skipped
     *        because of batch purchase
     */
    function _buy(uint256 _id, bool _updateNow) private {
        if (_updateNow) {
            _burn(msg.sender, SWAP_MINT_AMOUNT);

            FUR.transferFrom(msg.sender, incomeMaker, buyFee);
        }

        _transferOutNFT(nft, msg.sender, _id);

        emit BoughtNFT(_id, msg.sender);
    }

    function _lock(uint256 _id, bool _updateNow, uint256 _lockMintBuffer) private {
        _transferInNFT(nft, _id);

        if (_updateNow) {
            FUR.transferFrom(msg.sender, incomeMaker, lockFee);

            _mint(msg.sender, LOCK_MINT_AMOUNT + _lockMintBuffer);
        }

        lockInfo[_id].locker = msg.sender;
        uint256 releaseTime = block.timestamp + 30 * 24 * 3600;
        lockInfo[_id].releaseTime = uint128(releaseTime);
        lockInfo[_id].mintBuffer = uint128(_lockMintBuffer);

        emit LockedNFT(_id, msg.sender, block.timestamp, releaseTime);
    }

    function onERC721Received(address, address, uint256, bytes memory) public pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
