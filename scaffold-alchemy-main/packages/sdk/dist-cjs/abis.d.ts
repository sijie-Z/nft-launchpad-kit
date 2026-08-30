export declare const factoryAbi: readonly [{
    readonly type: "function";
    readonly name: "deployCollection";
    readonly inputs: readonly [{
        readonly internalType: "string";
        readonly name: "name_";
        readonly type: "string";
    }, {
        readonly internalType: "string";
        readonly name: "symbol_";
        readonly type: "string";
    }, {
        readonly internalType: "uint256";
        readonly name: "maxSupply";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "maxPerWallet";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "mintPrice";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "clone";
        readonly type: "address";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "event";
    readonly name: "CollectionCloned";
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "cloneAddress";
        readonly type: "address";
    }, {
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "owner";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "string";
        readonly name: "name";
        readonly type: "string";
    }, {
        readonly indexed: false;
        readonly internalType: "string";
        readonly name: "symbol";
        readonly type: "string";
    }, {
        readonly indexed: false;
        readonly internalType: "uint256";
        readonly name: "maxSupply";
        readonly type: "uint256";
    }];
    readonly anonymous: false;
}];
export declare const kitAbi: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "_initialOwner";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "_mintPrice";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "_maxSupply";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "_maxPerWallet";
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "constructor";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "uid";
        readonly type: "bytes32";
    }];
    readonly name: "isSignatureUsed";
    readonly outputs: readonly [{
        readonly internalType: "bool";
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "maxSupply";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "mintPrice";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "quantity";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "maxMint";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "deadline";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "pricePerToken";
        readonly type: "uint256";
    }, {
        readonly internalType: "bytes32";
        readonly name: "uid";
        readonly type: "bytes32";
    }, {
        readonly internalType: "bytes";
        readonly name: "signature";
        readonly type: "bytes";
    }];
    readonly name: "mintWithSignature712V2";
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "tokenId";
        readonly type: "uint256";
    }];
    readonly name: "ownerOf";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "paused";
    readonly outputs: readonly [{
        readonly internalType: "bool";
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "signer";
        readonly type: "address";
    }];
    readonly name: "setTrustedSigner";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "totalSupply";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "result";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "trustedSigner";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}];
