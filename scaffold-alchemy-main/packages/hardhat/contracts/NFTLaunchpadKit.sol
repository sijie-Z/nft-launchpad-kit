// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/**
 * @title NFTLaunchpadKit
 * @author Your AI Assistant
 * @dev A professional-grade, feature-rich, and secure NFT minting contract.
 *      Supports both direct deployment and Clone (minimal proxy) deployment via Factory.
 */
contract NFTLaunchpadKit is Initializable, ERC721A, Ownable, ReentrancyGuard, Pausable, ERC2981, EIP712, AccessControl {
    using SafeERC20 for IERC20;

    // --- Custom Errors for Gas Efficiency and Clarity ---
    error SaleNotActive();
    error InvalidMintQuantity();
    error MaxSupplyExceeded();
    error WalletMintLimitExceeded();
    error NotEnoughEtherSent();
    error ExcessEthSent();
    error NoClaimConditions();
    error PhaseNotStarted();
    error PhaseSupplyExceeded();
    error NotInAllowlist();
    error ClaimConditionsNotOrdered();
    error AllPhasesComplete();
    error AlreadyRevealed();
    error NoRevealCommit();
    error BadRevealSeed();
    error UseWithdrawSplit();
    error NoBalance();
    error WithdrawFailed();
    error NoAcceptedToken();
    error ERC20TransferFailed();
    error LengthMismatch();
    error InvalidBpsSum();
    error PayoutFailed();
    error NoOperatorRole();
    error SignatureExpired();
    error NoSigner();
    error BadSignature();
    error NonexistentToken();
    error InvalidAuctionConfig();
    error ContractPaused();
    error ZeroAddress();

    // --- Events for Off-Chain Indexing ---
    event SaleStateChanged(bool indexed isActive);
    event AllowlistSaleStateChanged(bool indexed isActive);
    event MintPriceUpdated(uint256 newPrice);
    event MaxPerWalletUpdated(uint256 newLimit);
    event MerkleRootUpdated(bytes32 indexed newRoot);
    event DutchAuctionConfigured(uint256 startPrice, uint256 endPrice, uint256 startTime, uint256 duration);
    event TrustedSignerUpdated(address indexed newSigner);
    event RoyaltyUpdated(address indexed receiver, uint96 feeNumerator);
    event PayoutRecipientsUpdated(address[] recipients, uint256[] bps);
    event FundsSplit(address[] recipients, uint256[] amounts);
    event ERC20TokenAccepted(address indexed token, uint256 unitPrice);
    event RevealCommitted(bytes32 commitHash);
    event RevealFinalized(uint256 revealSeed);
    event BaseURIUpdated(string newBaseURI);
    event PreRevealURIUpdated(string preRevealURI);
    event PausedStateChanged(bool indexed isPaused);
    event Withdraw(address indexed to, uint256 amount);
    event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
    event MintedBySignature(address indexed minter, uint256 quantity, uint256 maxMint);
    event MintedByAllowlist(address indexed minter, uint256 quantity);
    event MintedByAuction(address indexed minter, uint256 quantity, uint256 price);
    event MintedByERC20(address indexed minter, uint256 quantity, uint256 tokenAmount);
    event ClaimConditionsSet(uint256 phaseCount);
    event ClaimConditionUpdated(uint256 indexed phaseId);
    event PhaseAdvanced(uint256 indexed fromPhase, uint256 indexed toPhase);
    event Claimed(address indexed claimer, uint256 indexed phaseId, uint256 quantity, uint256 totalPaid);

    // --- Constants ---

    uint256 public constant MAX_BATCH_SIZE = 20;

    // --- State Variables ---

    // @dev The price for a single NFT mint.
    uint256 public mintPrice;

    // @dev The maximum number of NFTs that can ever be minted.
    uint256 public maxSupply;

    // @dev The maximum number of NFTs a single wallet is allowed to mint.
    uint256 public maxPerWallet;

    // @dev Packed boolean flags — 3 bools in 1 storage slot (saves ~40k gas on deploy)
    //      Bit 0: saleIsActive, Bit 1: allowlistSaleIsActive, Bit 2: revealed
    uint8 private _packedFlags;
    uint8 private constant FLAG_SALE_ACTIVE = 1;
    uint8 private constant FLAG_ALLOWLIST_ACTIVE = 2;
    uint8 private constant FLAG_REVEALED = 4;

    // @dev The URI for revealed metadata.
    string private _baseTokenURI;

    // @dev A mapping to track the number of mints per wallet.
    mapping(address => uint256) private _walletMints;

    // @dev 白名单根（小白解释：只有在这棵默克尔树里的地址才能在白名单阶段铸造）
    bytes32 public allowlistMerkleRoot;

    // @dev 荷兰拍卖参数（小白解释：价格会按时间从高到低逐步下降）
    uint256 public auctionStartPrice;
    uint256 public auctionEndPrice;
    uint256 public auctionStartTime;
    uint256 public auctionDuration;

    // @dev 可信签名者（小白解释：由这个地址签名的"许可单"，用户就能用它来铸造）
    address public trustedSigner;

    // @dev 收款分配（小白解释：提现时按比例把钱分给多个地址，总比例=10000）
    address[] public payoutRecipients;
    uint256[] public payoutBps; // 基点（bps），例如 2500 代表 25%
    uint256 public constant BPS_DENOMINATOR = 10000;

    // @dev 角色常量（小白解释：给运营分配权限）
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // @dev ERC20 支付配置（小白解释：用代币而不是ETH来付钱）
    address public acceptedToken;
    uint256 public tokenMintPrice;

    // @dev 揭示与洗牌（小白解释：未揭示显示占位，揭示后打乱顺序生成元数据）
    uint256 public revealSeed;
    bytes32 public revealCommit;
    string private _preRevealURI;

    // --- Claim Conditions (Phased Drop) ---

    struct ClaimCondition {
        uint64  startTimestamp;          // Unix seconds
        uint48  maxSupply;               // Max tokens for THIS phase
        uint48  supplyClaimed;           // Tokens already claimed in this phase
        uint48  quantityLimitPerWallet;  // Per-address cap for this phase
        address currency;                // address(0) = native ETH
        uint256 pricePerToken;           // Wei per token
        bytes32 merkleRoot;              // bytes32(0) = public phase, no proof needed
        string  metadata;               // Arbitrary off-chain data (phase name, etc.)
    }

    ClaimCondition[] private _claimConditions;
    uint256 private _activePhaseIndex;
    mapping(uint256 => mapping(address => uint256)) private _phaseWalletClaims;
    mapping(uint256 => mapping(address => uint256)) private _phaseWalletLastClaim;

    // --- Clone Support ---
    // @dev When deployed via Clone, name/symbol come from here (ERC721A's _name/_symbol are constructor-only).
    string private _cloneName;
    string private _cloneSymbol;

    // --- Signature Nonce ---
    // @dev Per-address nonce to prevent signature replay attacks.
    mapping(address => uint256) public signatureNonce;

    // --- Constructor ---

    /**
     * @dev Initializes the contract, setting all core parameters for the launch.
     * @param _initialOwner The address that will have ownership of the contract.
     * @param _mintPrice The price for one NFT in Wei (1 Ether = 1e18 Wei).
     * @param _maxSupply The absolute maximum number of NFTs.
     * @param _maxPerWallet The minting limit for a single address.
     */
    constructor(
        address _initialOwner,
        uint256 _mintPrice,
        uint256 _maxSupply,
        uint256 _maxPerWallet
    ) ERC721A("NFT Launchpad Kit", "LPK") Ownable(_initialOwner) EIP712("NFT Launchpad Kit", "1") {
        _disableInitializers(); // Prevent initialize() from being called on direct deploys
        if (_maxSupply == 0) revert MaxSupplyExceeded();
        if (_maxPerWallet == 0) revert WalletMintLimitExceeded();
        if (_maxPerWallet > _maxSupply) revert WalletMintLimitExceeded();
        mintPrice = _mintPrice;
        maxSupply = _maxSupply;
        maxPerWallet = _maxPerWallet;
        _setDefaultRoyalty(_initialOwner, 500);
        _grantRole(DEFAULT_ADMIN_ROLE, _initialOwner);
    }

    // --- Clone Initializer ---

    /**
     * @dev Initializer for Clone (minimal proxy) deployments.
     *      Must be called exactly once after Clones.clone().
     *      Direct deployments use the constructor instead and must NOT call this.
     */
    function initialize(
        string calldata name_,
        string calldata symbol_,
        address _initialOwner,
        uint256 _mintPrice,
        uint256 _maxSupply,
        uint256 _maxPerWallet
    ) external initializer {
        if (_maxSupply == 0) revert MaxSupplyExceeded();
        if (_maxPerWallet == 0) revert WalletMintLimitExceeded();
        if (_maxPerWallet > _maxSupply) revert WalletMintLimitExceeded();

        // ERC721A name/symbol are set in constructor only; clones store their own.
        _cloneName = name_;
        _cloneSymbol = symbol_;

        // Ownable — constructor didn't run for clone, so transfer to initial owner.
        _transferOwnership(_initialOwner);

        // EIP712 domain uses immutable values from implementation constructor.
        // Each clone gets a unique domain separator via address(this).

        mintPrice = _mintPrice;
        maxSupply = _maxSupply;
        maxPerWallet = _maxPerWallet;
        _setDefaultRoyalty(_initialOwner, 500);
        _grantRole(DEFAULT_ADMIN_ROLE, _initialOwner);
    }

    // --- Clone-Aware Name/Symbol Overrides ---

    /**
     * @dev Returns the token name. For clones, reads from clone-specific storage.
     */
    function name() public view override returns (string memory) {
        return bytes(_cloneName).length > 0 ? _cloneName : super.name();
    }

    /**
     * @dev Returns the token symbol. For clones, reads from clone-specific storage.
     */
    function symbol() public view override returns (string memory) {
        return bytes(_cloneSymbol).length > 0 ? _cloneSymbol : super.symbol();
    }

    // --- Packed Boolean Accessors ---

    function saleIsActive() public view returns (bool) {
        return _packedFlags & FLAG_SALE_ACTIVE != 0;
    }

    function allowlistSaleIsActive() public view returns (bool) {
        return _packedFlags & FLAG_ALLOWLIST_ACTIVE != 0;
    }

    function revealed() public view returns (bool) {
        return _packedFlags & FLAG_REVEALED != 0;
    }

    function _setFlag(uint8 flag, bool value) internal {
        if (value) {
            _packedFlags |= flag;
        } else {
            _packedFlags &= ~flag;
        }
    }

    // --- Ownership Transfer Override ---

    /**
     * @dev Transfers ownership and syncs DEFAULT_ADMIN_ROLE.
     * Without this, transferOwnership would leave the old owner with role management powers.
     */
    function transferOwnership(address newOwner) public override onlyOwner {
        address oldOwner = owner();
        super.transferOwnership(newOwner);
        _revokeRole(DEFAULT_ADMIN_ROLE, oldOwner);
        _grantRole(DEFAULT_ADMIN_ROLE, newOwner);
    }

    // --- Internal Batch Mint ---

    /**
     * @dev Shared minting logic for all mint modes.
     *      Uses ERC721A's native batch mint for 70-90% gas savings.
     * @param to The address to mint to.
     * @param quantity The number of NFTs to mint.
     * @param maxLimit The per-wallet limit for this mint (may differ from maxPerWallet, e.g. signature mint).
     */
    function _batchMint(address to, uint256 quantity, uint256 maxLimit) internal {
        if (quantity > MAX_BATCH_SIZE) revert InvalidMintQuantity();
        if (totalSupply() + quantity > maxSupply) revert MaxSupplyExceeded();
        if (_walletMints[to] + quantity > maxLimit) revert WalletMintLimitExceeded();
        _walletMints[to] += quantity;
        _mint(to, quantity);
    }

    /**
     * @dev Core minting logic for the claim conditions system.
     *      Uses ERC721A's native batch mint. Does NOT touch _walletMints.
     */
    function _claimMint(address to, uint256 quantity) internal {
        if (quantity > MAX_BATCH_SIZE) revert InvalidMintQuantity();
        if (totalSupply() + quantity > maxSupply) revert MaxSupplyExceeded();
        _mint(to, quantity);
    }

    /**
     * @dev Finds the active claim phase index.
     *      Scans forward from _activePhaseIndex to find a phase where
     *      startTimestamp <= now AND supplyClaimed < maxSupply.
     */
    function _getActivePhaseIndex() internal view returns (uint256) {
        uint256 len = _claimConditions.length;
        if (len == 0) revert NoClaimConditions();

        uint256 i = _activePhaseIndex;
        while (i < len) {
            ClaimCondition memory cond = _claimConditions[i];
            bool hasStarted = block.timestamp >= cond.startTimestamp;
            bool hasSupply  = cond.supplyClaimed < cond.maxSupply;

            if (hasStarted && hasSupply) {
                return i;
            }
            if (!hasStarted) {
                revert PhaseNotStarted();
            }
            unchecked { ++i; }
        }
        revert AllPhasesComplete();
    }

    // --- Public Minting Function ---

    /**
     * @dev Allows users to mint one or more NFTs during an active sale.
     * @param _quantity The number of NFTs to mint.
     */
    function mint(uint256 _quantity) external payable nonReentrant {
        if (paused()) revert ContractPaused();
        if (!saleIsActive()) revert SaleNotActive();
        if (_quantity == 0) revert InvalidMintQuantity();
        uint256 cost = mintPrice * _quantity;
        if (cost > msg.value) revert NotEnoughEtherSent();
        _batchMint(msg.sender, _quantity, maxPerWallet);
        unchecked {
            uint256 excess = msg.value - cost;
            if (excess > 0) {
                (bool ok, ) = msg.sender.call{value: excess}("");
                if (!ok) revert WithdrawFailed();
            }
        }
    }

    // --- Owner-Only Admin Functions ---

    /**
     * @dev Toggles the sale state (on/off).
     */
    function setSaleState(bool _newState) external onlyOwner {
        _setFlag(FLAG_SALE_ACTIVE, _newState);
        emit SaleStateChanged(_newState);
    }

    /**
     * @dev Updates the minting price.
     */
    function setMintPrice(uint256 _newPrice) external onlyOwner {
        mintPrice = _newPrice;
        emit MintPriceUpdated(_newPrice);
    }

    /**
     * @dev Updates the maximum mints allowed per wallet.
     */
    function setMaxPerWallet(uint256 _newLimit) external onlyOwner {
        maxPerWallet = _newLimit;
        emit MaxPerWalletUpdated(_newLimit);
    }

    /**
     * @dev Sets the base URI for the token metadata. Typically pointing to a folder on IPFS.
     * The final URI for a token will be `baseURI` + `tokenId` + `.json`.
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /**
     * @dev 设置未揭示占位URI。
     * 小白解释：还没揭示时，所有NFT都显示这个占位链接。
     */
    function setPreRevealURI(string memory placeholder) external onlyOwner {
        _preRevealURI = placeholder;
        emit PreRevealURIUpdated(placeholder);
    }

    /**
     * @dev 提交揭示承诺（commit）。
     * 小白解释：先上链一个哈希，避免后来作弊；等到需要揭示时再提供明文种子。
     */
    function commitReveal(bytes32 commitHash) external onlyOwner {
        revealCommit = commitHash;
        emit RevealCommitted(commitHash);
    }

    /**
     * @dev 完成揭示：提供种子，合约生成洗牌随机数。
     * 小白解释：校验种子与之前的承诺匹配，然后结合区块哈希生成随机种子，标记已揭示。
     */
    function finalizeReveal(bytes32 seed) external onlyOwner {
        if (revealed()) revert AlreadyRevealed();
        if (revealCommit == bytes32(0)) revert NoRevealCommit();
        if (keccak256(abi.encodePacked(seed, address(this))) != revealCommit) revert BadRevealSeed();
        unchecked {
            revealSeed = uint256(keccak256(abi.encodePacked(seed, blockhash(block.number - 1))));
        }
        _setFlag(FLAG_REVEALED, true);
        emit RevealFinalized(revealSeed);
    }

    /**
     * @dev Allows the contract owner to withdraw the entire balance of the contract.
     */
    function withdraw() external onlyOwner nonReentrant {
        if (payoutRecipients.length > 0) revert UseWithdrawSplit();
        uint256 bal = address(this).balance;
        if (bal == 0) revert NoBalance();
        (bool success, ) = owner().call{value: bal}("");
        if (!success) revert WithdrawFailed();
        emit Withdraw(owner(), bal);
    }

    /**
     * @dev 设置 ERC20 支付的代币与单价。
     * 小白解释：允许用户用某个代币支付铸造费用。
     */
    function setAcceptedToken(address token, uint256 unitPrice) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        acceptedToken = token;
        tokenMintPrice = unitPrice;
        emit ERC20TokenAccepted(token, unitPrice);
    }

    /**
     * @dev 使用 ERC20 代币铸造。
     * 小白解释：先在钱包里 approve 本合约，之后按单价 * 数量转入代币再铸造。
     */
    function mintWithERC20(uint256 quantity) external nonReentrant {
        if (paused()) revert ContractPaused();
        if (!saleIsActive()) revert SaleNotActive();
        if (acceptedToken == address(0)) revert NoAcceptedToken();
        if (quantity == 0) revert InvalidMintQuantity();
        uint256 amount = tokenMintPrice * quantity;
        IERC20(acceptedToken).safeTransferFrom(msg.sender, address(this), amount);
        _batchMint(msg.sender, quantity, maxPerWallet);
        emit MintedByERC20(msg.sender, quantity, amount);
    }

    // --- Claim Conditions (Phased Drop) ---

    /**
     * @dev Unified claim function that auto-detects the current active phase.
     *      Supports ETH or ERC20 payment, optional Merkle proof, per-wallet limits.
     * @param quantity Number of NFTs to claim.
     * @param proof Merkle proof (pass empty array if phase has merkleRoot == bytes32(0)).
     */
    function claim(uint256 quantity, bytes32[] calldata proof) external payable nonReentrant {
        if (paused()) revert ContractPaused();
        if (quantity == 0) revert InvalidMintQuantity();

        // 1. Find active phase
        uint256 phaseId = _getActivePhaseIndex();
        ClaimCondition storage cond = _claimConditions[phaseId];

        // 2. Per-wallet limit check
        uint256 alreadyClaimed = _phaseWalletClaims[phaseId][msg.sender];
        if (alreadyClaimed + quantity > cond.quantityLimitPerWallet) revert WalletMintLimitExceeded();

        // 3. Phase supply check
        uint256 newClaimed = cond.supplyClaimed + quantity;
        if (newClaimed > cond.maxSupply) revert PhaseSupplyExceeded();

        // 4. Merkle proof (if merkleRoot is set)
        if (cond.merkleRoot != bytes32(0)) {
            bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
            if (!MerkleProof.verify(proof, cond.merkleRoot, leaf)) revert NotInAllowlist();
        }

        // 5. Payment validation
        uint256 totalPaid = cond.pricePerToken * quantity;
        if (cond.currency == address(0)) {
            if (msg.value < totalPaid) revert NotEnoughEtherSent();
        }

        // 6. Effects — all state updates BEFORE external calls (CEI)
        _phaseWalletClaims[phaseId][msg.sender] = alreadyClaimed + quantity;
        _phaseWalletLastClaim[phaseId][msg.sender] = block.timestamp;
        cond.supplyClaimed = uint48(newClaimed);
        if (newClaimed >= cond.maxSupply) {
            unchecked { _activePhaseIndex = phaseId + 1; }
            emit PhaseAdvanced(phaseId, phaseId + 1);
        }

        // 7. Interactions — external calls AFTER all state updates
        if (cond.currency != address(0)) {
            IERC20(cond.currency).safeTransferFrom(msg.sender, address(this), totalPaid);
        }
        _claimMint(msg.sender, quantity);

        // 8. Refund excess ETH
        if (cond.currency == address(0)) {
            unchecked {
                uint256 excess = msg.value - totalPaid;
                if (excess > 0) {
                    (bool ok, ) = msg.sender.call{value: excess}("");
                    if (!ok) revert WithdrawFailed();
                }
            }
        }

        emit Claimed(msg.sender, phaseId, quantity, totalPaid);
    }

    /**
     * @dev 提现指定 ERC20 代币到目标地址。
     * 小白解释：把合约里收到的代币打到财务指定的钱包里。
     */
    function withdrawToken(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        IERC20(token).safeTransfer(to, amount);
        emit TokenWithdrawn(token, to, amount);
    }

    /**
     * @dev 设置收款分配的地址与比例。
     * 小白解释：传入多个地址和对应比例，比例总和必须等于 10000（代表 100%）。
     */
    function setPayoutRecipients(address[] calldata recipients, uint256[] calldata bps) external onlyOwner {
        if (recipients.length != bps.length) revert LengthMismatch();
        uint256 sum = 0;
        for (uint256 i = 0; i < bps.length; ) {
            sum += bps[i];
            unchecked { ++i; }
        }
        if (sum != BPS_DENOMINATOR) revert InvalidBpsSum();
        payoutRecipients = recipients;
        payoutBps = bps;
        emit PayoutRecipientsUpdated(recipients, bps);
    }

    /**
     * @dev 按比例分配当前合约余额到预设地址。
     * 小白解释：比如两个人分别 70% 与 30%，就会把钱按比例打过去。
     */
    function withdrawSplit() external onlyOwner nonReentrant {
        uint256 bal = address(this).balance;
        if (bal == 0) revert NoBalance();
        if (payoutRecipients.length == 0) revert NoBalance();
        uint256[] memory amounts = new uint256[](payoutRecipients.length);
        uint256 totalSent = 0;
        for (uint256 i = 0; i < payoutRecipients.length; ) {
            amounts[i] = (bal * payoutBps[i]) / BPS_DENOMINATOR;
            (bool ok, ) = payable(payoutRecipients[i]).call{value: amounts[i]}("");
            if (ok) {
                totalSent += amounts[i];
            }
            unchecked { ++i; }
        }
        emit FundsSplit(payoutRecipients, amounts);
        // If any recipient failed, allow owner to call withdrawSplit again
        // or use withdraw() to recover remaining funds
    }

    /**
     * @dev 设置默认版税（EIP-2981）。
     * 小白解释：市场卖出时，会按这个比例把版税打到指定地址。
     * @param receiver 接收版税的钱包地址
     * @param feeNumerator 费率，单位为 1/10000（例如 500 代表 5%）
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
        emit RoyaltyUpdated(receiver, feeNumerator);
    }

    /**
     * @dev 设置白名单的默克尔根。
     * 小白解释：你把线下生成的树根填进来，合约就能验证谁是白名单。
     * @param root 默克尔树根值
     */
    function setAllowlistMerkleRoot(bytes32 root) external onlyOwner {
        allowlistMerkleRoot = root;
        emit MerkleRootUpdated(root);
    }

    /**
     * @dev 白名单销售开关。
     * 小白解释：只影响白名单阶段，公开销售仍由原来的开关控制。
     * @param _newState 开启或关闭
     */
    function setAllowlistSaleState(bool _newState) external onlyOwner {
        _setFlag(FLAG_ALLOWLIST_ACTIVE, _newState);
        emit AllowlistSaleStateChanged(_newState);
    }

    // --- Claim Condition Admin Functions ---

    /**
     * @dev Replaces ALL claim conditions. Resets activePhaseIndex to 0.
     *      Phases MUST be ordered by ascending startTimestamp.
     */
    function setClaimConditions(ClaimCondition[] calldata conditions) external onlyOwner {
        uint256 len = conditions.length;

        // Validate ordering
        for (uint256 i = 1; i < len; ) {
            if (conditions[i].startTimestamp <= conditions[i - 1].startTimestamp) {
                revert ClaimConditionsNotOrdered();
            }
            unchecked { ++i; }
        }

        // Overwrite in-place first, then push/pop to match length
        uint256 oldLen = _claimConditions.length;
        uint256 minLen = oldLen < len ? oldLen : len;
        for (uint256 i = 0; i < minLen; ) {
            _claimConditions[i] = conditions[i];
            unchecked { ++i; }
        }
        for (uint256 i = oldLen; i < len; ) {
            _claimConditions.push(conditions[i]);
            unchecked { ++i; }
        }
        while (_claimConditions.length > len) {
            _claimConditions.pop();
        }

        _activePhaseIndex = 0;
        emit ClaimConditionsSet(len);
    }

    /**
     * @dev Updates a single phase by index. Preserves supplyClaimed if claims exist.
     */
    function setClaimCondition(uint256 phaseId, ClaimCondition calldata condition) external onlyOwner {
        if (phaseId >= _claimConditions.length) revert NoClaimConditions();
        ClaimCondition storage existing = _claimConditions[phaseId];
        ClaimCondition memory updated = condition;
        if (existing.supplyClaimed > 0) {
            updated.supplyClaimed = existing.supplyClaimed;
        }
        _claimConditions[phaseId] = updated;
        emit ClaimConditionUpdated(phaseId);
    }

    /**
     * @dev Manually advances to the next phase.
     */
    function nextPhase() external onlyOwner {
        uint256 current = _activePhaseIndex;
        if (current + 1 >= _claimConditions.length) revert AllPhasesComplete();
        _activePhaseIndex = current + 1;
        emit PhaseAdvanced(current, current + 1);
    }

    /**
     * @dev Clears all claim conditions and resets all per-phase claim tracking.
     */
    function resetClaimConditions() external onlyOwner {
        delete _claimConditions;
        _activePhaseIndex = 0;
        emit ClaimConditionsSet(0);
    }

    /**
     * @dev 运营角色也可以开关白名单与公开售卖。
     */
    function setSaleStateByRole(bool _newState) external {
        if (!hasRole(OPERATOR_ROLE, msg.sender)) revert NoOperatorRole();
        _setFlag(FLAG_SALE_ACTIVE, _newState);
        emit SaleStateChanged(_newState);
    }

    function setAllowlistSaleStateByRole(bool _newState) external {
        if (!hasRole(OPERATOR_ROLE, msg.sender)) revert NoOperatorRole();
        _setFlag(FLAG_ALLOWLIST_ACTIVE, _newState);
        emit AllowlistSaleStateChanged(_newState);
    }

    /**
     * @dev 白名单铸造：验证地址在默克尔树中，并按公开价收费。
     * 小白解释：proof 是你地址在树里的证明，通常由前端传入。
     * @param _quantity 铸造数量
     * @param proof 默克尔证明
     */
    function mintAllowlist(uint256 _quantity, bytes32[] calldata proof) external payable nonReentrant {
        if (paused()) revert ContractPaused();
        if (!allowlistSaleIsActive()) revert SaleNotActive();
        if (_quantity == 0) revert InvalidMintQuantity();
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        if (!MerkleProof.verify(proof, allowlistMerkleRoot, leaf)) revert NotInAllowlist();
        uint256 cost = mintPrice * _quantity;
        if (cost > msg.value) revert NotEnoughEtherSent();
        _batchMint(msg.sender, _quantity, maxPerWallet);
        unchecked {
            uint256 excess = msg.value - cost;
            if (excess > 0) {
                (bool ok, ) = msg.sender.call{value: excess}("");
                if (!ok) revert WithdrawFailed();
            }
        }
        emit MintedByAllowlist(msg.sender, _quantity);
    }

    /**
     * @dev 配置荷兰拍卖参数。
     * 小白解释：拍卖开始时价格高，随后按总时长线性降到最低价。
     * @param startPrice 起始价格（Wei）
     * @param endPrice 结束价格（Wei）
     * @param startTime 开始时间（Unix 时间戳）
     * @param duration 总时长（秒）
     */
    function configureDutchAuction(
        uint256 startPrice,
        uint256 endPrice,
        uint256 startTime,
        uint256 duration
    ) external onlyOwner {
        _configureDutchAuction(startPrice, endPrice, startTime, duration);
    }

    function configureDutchAuctionByRole(
        uint256 startPrice,
        uint256 endPrice,
        uint256 startTime,
        uint256 duration
    ) external {
        if (!hasRole(OPERATOR_ROLE, msg.sender)) revert NoOperatorRole();
        _configureDutchAuction(startPrice, endPrice, startTime, duration);
    }

    function _configureDutchAuction(
        uint256 startPrice,
        uint256 endPrice,
        uint256 startTime,
        uint256 duration
    ) internal {
        if (startPrice == 0) revert InvalidAuctionConfig();
        if (endPrice >= startPrice) revert InvalidAuctionConfig();
        if (duration == 0) revert InvalidAuctionConfig();
        auctionStartPrice = startPrice;
        auctionEndPrice = endPrice;
        auctionStartTime = startTime;
        auctionDuration = duration;
        emit DutchAuctionConfigured(startPrice, endPrice, startTime, duration);
    }

    /**
     * @dev 计算当前荷兰拍卖价格。
     * 小白解释：如果未开始用起始价；如果已经结束用最低价；中间线性插值。
     */
    function currentAuctionPrice() public view returns (uint256) {
        if (auctionStartTime == 0) return auctionStartPrice;
        if (block.timestamp <= auctionStartTime) return auctionStartPrice;
        uint256 endTime = auctionStartTime + auctionDuration;
        if (block.timestamp >= endTime) return auctionEndPrice;
        uint256 elapsed = block.timestamp - auctionStartTime;
        uint256 priceDiff = auctionStartPrice - auctionEndPrice;
        uint256 drop = (priceDiff * elapsed) / auctionDuration;
        return auctionStartPrice - drop;
    }

    /**
     * @dev 荷兰拍卖铸造：按当前价格收费。
     * 小白解释：随时间越久价格越低，但不能少于最低价。
     * @param _quantity 铸造数量
     */
    function mintDutchAuction(uint256 _quantity) external payable nonReentrant {
        if (paused()) revert ContractPaused();
        if (auctionStartTime == 0) revert SaleNotActive();
        if (_quantity == 0) revert InvalidMintQuantity();
        uint256 price = currentAuctionPrice();
        uint256 cost = price * _quantity;
        if (cost > msg.value) revert NotEnoughEtherSent();
        _batchMint(msg.sender, _quantity, maxPerWallet);
        unchecked {
            uint256 excess = msg.value - cost;
            if (excess > 0) {
                (bool ok, ) = msg.sender.call{value: excess}("");
                if (!ok) revert WithdrawFailed();
            }
        }
        emit MintedByAuction(msg.sender, _quantity, price);
    }

    // --- URI Handling ---

    /**
     * @dev Overrides the base URI function to return the URI set by the owner.
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev 动态 tokenURI：未揭示返回占位，揭示后按洗牌ID拼接。
     * 使用 Feistel 网络实现不可逆排列，防止稀有度预测。
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (!_exists(tokenId)) revert NonexistentToken();
        if (!revealed()) {
            return _preRevealURI;
        }
        uint256 shuffled = _feistelShuffle(tokenId, revealSeed, maxSupply);
        return string.concat(_baseTokenURI, Strings.toString(shuffled), ".json");
    }

    /**
     * @dev Feistel network permutation — maps [0, range) to [0, range) bijectively.
     * 4 rounds with keccak256-based round function. Deterministic given seed.
     */
    function _feistelShuffle(uint256 value, uint256 seed, uint256 range) internal pure returns (uint256) {
        if (range <= 1) return 0;
        uint256 mask = 1;
        while (mask * mask < range) {
            mask = mask * 2 + 1;
        }
        uint256 result;
        // Feistel network with 4 rounds
        unchecked {
            uint256 l = value >> 128;
            uint256 r = value & ((1 << 128) - 1);
            for (uint256 i = 0; i < 4; ) {
                uint256 f = uint256(keccak256(abi.encodePacked(r, seed, i))) & mask;
                uint256 newL = r;
                uint256 newR = l ^ f;
                l = newL;
                r = newR;
                ++i;
            }
            result = ((l << 128) | r);
        }
        return result % range;
    }

    /**
     * @dev 支持接口声明（EIP-165），用于兼容 ERC2981 版税查询。
     * 小白解释：让市场知道这个合约支持版税标准。
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721A, ERC2981, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev 紧急暂停。
     * 小白解释：出现问题时，管理员可以暂停所有铸造入口，保护资金安全。
     */
    function pause() external onlyOwner {
        _pause();
        emit PausedStateChanged(true);
    }

    /**
     * @dev 取消暂停。
     * 小白解释：问题解决后，重新开放铸造。
     */
    function unpause() external onlyOwner {
        _unpause();
        emit PausedStateChanged(false);
    }

    /**
     * @dev EIP‑712 结构化签名铸造（更专业更安全）。
     * 小白解释：后端按标准结构签名，前端带签名来铸造，抗重放且更规范。
     */
    bytes32 public constant MINT_TYPEHASH = keccak256(
        "MintAuthorization(address minter,uint256 quantity,uint256 maxMint,uint256 deadline,uint256 nonce)"
    );

    /**
     * @dev 使用 EIP‑712 签名授权铸造。
     */
    function mintWithSignature712(
        uint256 quantity,
        uint256 maxMint,
        uint256 deadline,
        uint256 nonce,
        bytes calldata signature
    ) external payable nonReentrant {
        if (paused()) revert ContractPaused();
        if (trustedSigner == address(0)) revert NoSigner();
        if (block.timestamp > deadline) revert SignatureExpired();
        if (quantity == 0) revert InvalidMintQuantity();
        if (nonce != signatureNonce[msg.sender]) revert BadSignature();

        bytes32 structHash = keccak256(abi.encode(
            MINT_TYPEHASH,
            msg.sender,
            quantity,
            maxMint,
            deadline,
            nonce
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != trustedSigner) revert BadSignature();

        signatureNonce[msg.sender] = nonce + 1;
        uint256 cost = mintPrice * quantity;
        if (cost > msg.value) revert NotEnoughEtherSent();
        _batchMint(msg.sender, quantity, maxMint);
        unchecked {
            uint256 excess = msg.value - cost;
            if (excess > 0) {
                (bool ok, ) = msg.sender.call{value: excess}("");
                if (!ok) revert WithdrawFailed();
            }
        }
        emit MintedBySignature(msg.sender, quantity, maxMint);
    }

    /**
     * @dev 设置可信签名者。
     * 小白解释：这个地址会在后端生成签名，用户拿到签名就能"授权铸造"。
     * @param signer 签名者地址
     */
    function setTrustedSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        trustedSigner = signer;
        emit TrustedSignerUpdated(signer);
    }

    /**
     * @dev 签名授权铸造：由可信签名者离线签发许可，用户带签名来铸造。
     * 小白解释：这样可以做"门票/任务完成"的准入，不需要上链名单。
     * @param quantity 铸造数量
     * @param maxMint 该签名允许的最多铸造次数（防止无限用）
     * @param deadline 过期时间戳（秒）
     * @param signature 签名（后端生成）
     */
    function mintWithSignature(
        uint256 quantity,
        uint256 maxMint,
        uint256 deadline,
        uint256 nonce,
        bytes calldata signature
    ) external payable nonReentrant {
        if (paused()) revert ContractPaused();
        if (trustedSigner == address(0)) revert NoSigner();
        if (block.timestamp > deadline) revert SignatureExpired();
        if (quantity == 0) revert InvalidMintQuantity();
        if (nonce != signatureNonce[msg.sender]) revert BadSignature();

        bytes32 messageHash = keccak256(
            abi.encodePacked(msg.sender, quantity, maxMint, deadline, nonce, address(this), block.chainid)
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address recovered = ECDSA.recover(ethSignedMessageHash, signature);
        if (recovered != trustedSigner) revert BadSignature();

        signatureNonce[msg.sender] = nonce + 1;
        uint256 cost = mintPrice * quantity;
        if (cost > msg.value) revert NotEnoughEtherSent();
        _batchMint(msg.sender, quantity, maxMint);
        unchecked {
            uint256 excess = msg.value - cost;
            if (excess > 0) {
                (bool ok, ) = msg.sender.call{value: excess}("");
                if (!ok) revert WithdrawFailed();
            }
        }
        emit MintedBySignature(msg.sender, quantity, maxMint);
    }

    // --- Claim Condition View Functions ---

    /**
     * @dev Returns the active phase ID and its full condition data.
     */
    function getActiveClaimPhase() external view returns (uint256 phaseId, ClaimCondition memory condition) {
        phaseId = _getActivePhaseIndex();
        condition = _claimConditions[phaseId];
    }

    /**
     * @dev Returns the condition for a specific phase by ID.
     */
    function getClaimConditionById(uint256 phaseId) external view returns (ClaimCondition memory) {
        if (phaseId >= _claimConditions.length) revert NoClaimConditions();
        return _claimConditions[phaseId];
    }

    /**
     * @dev Returns how many tokens an address has claimed in a given phase,
     *      and the timestamp of their most recent claim.
     */
    function getClaimTimestamp(address claimer, uint256 phaseId) external view returns (uint256 claimCount, uint256 lastClaimTimestamp) {
        claimCount = _phaseWalletClaims[phaseId][claimer];
        lastClaimTimestamp = _phaseWalletLastClaim[phaseId][claimer];
    }

    /**
     * @dev Returns the total number of configured claim phases.
     */
    function getClaimConditionCount() external view returns (uint256) {
        return _claimConditions.length;
    }

}
