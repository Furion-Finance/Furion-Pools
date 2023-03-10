// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract TransferNFT {
    address constant KITTIES = 0x06012c8cf97BEaD5deAe237070F9587f8E7A266d;
    //address constant PUNKS = 0x90bD8a7d20534a896d057a1F4eA1B574f15F16d5;
    address constant PUNKS = 0xa3430ccf668e6BF470eb11892B338ee9f3776AA3;

    function _transferInNFT(address _nft, uint256 _id) internal {
        bytes memory data;

        if (_nft == KITTIES) {
            // CryptoKitties
            data = abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), _id);
        } else if (_nft == PUNKS) {
            // CryptoPunks
            bytes memory punksIndexToOwner = abi.encodeWithSignature("punkIndexToAddress(uint256)", _id);
            (bool _success, bytes memory result) = _nft.staticcall(punksIndexToOwner);
            address punkOwner = abi.decode(result, (address));
            require(_success && punkOwner == msg.sender, "Punk ownership check failed");
            data = abi.encodeWithSignature("buyPunk(uint256)", _id);
        } else {
            // ERC 721
            data = abi.encodeWithSignature("safeTransferFrom(address,address,uint256)", msg.sender, address(this), _id);
        }

        (bool success, bytes memory returnData) = _nft.call(data);
        require(success, string(returnData));
    }

    function _transferOutNFT(address _nft, address _dst, uint256 _id) internal {
        bytes memory data;

        if (_nft == KITTIES) {
            // CryptoKitties
            data = abi.encodeWithSignature("transfer(address,uint256)", _dst, _id);
        } else if (_nft == PUNKS) {
            // CryptoPunks
            data = abi.encodeWithSignature("transferPunk(address,uint256)", _dst, _id);
        } else {
            // ERC 721
            data = abi.encodeWithSignature("safeTransferFrom(address,address,uint256)", address(this), _dst, _id);
        }

        (bool success, bytes memory returnData) = _nft.call(data);
        require(success, string(returnData));
    }

    function _balanceOfNFT(address _nft, address _owner) internal view returns (uint256) {
        bytes memory data = abi.encodeWithSignature("balanceOf(address)", _owner);

        (bool success, bytes memory returnData) = _nft.staticcall(data);
        require(success, string(returnData));

        return abi.decode(returnData, (uint256));
    }
}
