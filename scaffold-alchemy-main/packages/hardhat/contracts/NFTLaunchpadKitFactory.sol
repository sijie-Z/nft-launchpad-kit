// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./NFTLaunchpadKit.sol";

/**
 * @title NFTLaunchpadKitFactory
 * @dev Deploys NFTLaunchpadKit collections via ERC-1167 minimal proxies (clones).
 *      Each clone costs ~45k gas vs ~5M gas for a full deployment.
 *      The implementation contract is deployed once and reused for all clones.
 */
contract NFTLaunchpadKitFactory is Ownable {

    // --- Events ---
    event CollectionCloned(
        address indexed cloneAddress,
        address indexed owner,
        string name,
        string symbol,
        uint256 maxSupply
    );

    // --- State ---

    /// @notice The implementation contract address used for cloning.
    address public implementation;

    /// @notice All clones deployed by this factory.
    address[] public allCollections;

    /// @notice Collections owned by a specific address.
    mapping(address => address[]) public ownerCollections;

    // --- Errors ---
    error ZeroAddress();
    error DeploymentFailed();

    constructor(address _implementation, address _owner) Ownable(_owner) {
        if (_implementation == address(0)) revert ZeroAddress();
        implementation = _implementation;
    }

    /**
     * @dev Deploys a new NFT collection via minimal proxy clone.
     * @param name_          Collection name (e.g. "My Cool NFT")
     * @param symbol_        Collection symbol (e.g. "COOL")
     * @param maxSupply      Maximum token supply
     * @param maxPerWallet   Per-wallet mint limit
     * @param mintPrice      Price per token in wei
     * @return clone         The address of the new collection
     */
    function deployCollection(
        string calldata name_,
        string calldata symbol_,
        uint256 maxSupply,
        uint256 maxPerWallet,
        uint256 mintPrice
    ) external returns (address clone) {
        // 1. Deploy minimal proxy
        clone = Clones.clone(implementation);
        if (clone == address(0)) revert DeploymentFailed();

        // 2. Initialize the clone
        NFTLaunchpadKit(clone).initialize(
            name_,
            symbol_,
            msg.sender,
            mintPrice,
            maxSupply,
            maxPerWallet
        );

        // 3. Track the clone
        allCollections.push(clone);
        ownerCollections[msg.sender].push(clone);

        emit CollectionCloned(clone, msg.sender, name_, symbol_, maxSupply);
    }

    /**
     * @dev Deploys a deterministic clone (same salt → same address across chains).
     *      Useful for cross-chain deterministic deployment.
     * @param salt           User-provided salt for CREATE2
     * @param name_          Collection name
     * @param symbol_        Collection symbol
     * @param maxSupply      Maximum token supply
     * @param maxPerWallet   Per-wallet mint limit
     * @param mintPrice      Price per token in wei
     * @return clone         The address of the new collection
     */
    function deployCollectionDeterministic(
        bytes32 salt,
        string calldata name_,
        string calldata symbol_,
        uint256 maxSupply,
        uint256 maxPerWallet,
        uint256 mintPrice
    ) external returns (address clone) {
        clone = Clones.cloneDeterministic(implementation, salt);
        if (clone == address(0)) revert DeploymentFailed();

        NFTLaunchpadKit(clone).initialize(
            name_,
            symbol_,
            msg.sender,
            mintPrice,
            maxSupply,
            maxPerWallet
        );

        allCollections.push(clone);
        ownerCollections[msg.sender].push(clone);

        emit CollectionCloned(clone, msg.sender, name_, symbol_, maxSupply);
    }

    /**
     * @dev Predicts the address of a deterministic clone before deployment.
     */
    function predictCollectionAddress(
        bytes32 salt
    ) external view returns (address) {
        return Clones.predictDeterministicAddress(implementation, salt, address(this));
    }

    /**
     * @dev Returns the total number of collections deployed.
     */
    function getCollectionCount() external view returns (uint256) {
        return allCollections.length;
    }

    /**
     * @dev Returns all collections deployed by a specific owner.
     */
    function getCollectionsByOwner(address _owner) external view returns (address[] memory) {
        return ownerCollections[_owner];
    }

    /**
     * @dev Returns all deployed collections (paginated).
     * @param offset  Start index
     * @param limit   Max items to return
     */
    function getAllCollections(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 end = offset + limit;
        if (end > allCollections.length) {
            end = allCollections.length;
        }
        uint256 size = end - offset;
        address[] memory result = new address[](size);
        for (uint256 i = 0; i < size; ) {
            result[i] = allCollections[offset + i];
            unchecked { ++i; }
        }
        return result;
    }

    /**
     * @dev Allows owner to update the implementation address (for upgrades).
     */
    function setImplementation(address _implementation) external onlyOwner {
        if (_implementation == address(0)) revert ZeroAddress();
        implementation = _implementation;
    }
}
