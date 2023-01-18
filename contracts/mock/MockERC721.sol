// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC721 is ERC721, Ownable {
    string private baseuri;
    uint256 public tokenId;
    uint256 public maxSupply;

    mapping(address => bool) public registeredMinters;

    modifier minterRegistered(address _minter) {
        require(registeredMinters[_minter] == true, "Minter not registered");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _uri,
        uint256 _startId,
        uint256 _totalSupply
    ) ERC721(_name, _symbol) {
        registeredMinters[msg.sender] = true;
        baseuri = _uri;
        tokenId = _startId;
        maxSupply = _totalSupply;
    }

    function mint(address _to, uint256 _amount) external minterRegistered(msg.sender) {
        uint256 id = tokenId;
        require(id < id + maxSupply, "Max supply reached");

        for (uint256 i; i < _amount; ) {
            _mint(_to, id);

            unchecked {
                ++id;
                ++i;
            }
        }

        tokenId = id;
    }

    function registerMinter(address _minter) external onlyOwner {
        require(registeredMinters[_minter] == false, "Minter already registered");
        registeredMinters[_minter] = true;
    }

    function renounceOwnership() public override onlyOwner {
        registeredMinters[owner()] = false;
        _transferOwnership(address(0));
    }

    function transferOwnership(address _newOwner) public override onlyOwner {
        require(_newOwner != address(0), "Ownable: new owner is the zero address");
        registeredMinters[owner()] = false;
        registeredMinters[_newOwner] = true;
        _transferOwnership(_newOwner);
    }

    function setBaseURI(string memory _uri) external onlyOwner {
        baseuri = _uri;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseuri;
    }
}
