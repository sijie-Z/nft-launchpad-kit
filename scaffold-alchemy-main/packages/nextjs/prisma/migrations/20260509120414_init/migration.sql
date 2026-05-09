-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "contractAddress" TEXT,
    "chainId" INTEGER NOT NULL DEFAULT 11155111,
    "maxSupply" INTEGER NOT NULL,
    "mintPrice" TEXT NOT NULL,
    "maxPerWallet" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "ownerId" TEXT NOT NULL,
    "baseURI" TEXT,
    "preRevealURI" TEXT,
    "revealSeed" INTEGER,
    "platformFeeBps" INTEGER NOT NULL DEFAULT 500,
    "royaltyBps" INTEGER NOT NULL DEFAULT 500,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Collection_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MintRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "txHash" TEXT NOT NULL,
    "minterAddress" TEXT NOT NULL,
    "tokenId" INTEGER,
    "quantity" INTEGER NOT NULL,
    "totalPaid" TEXT NOT NULL,
    "mintMode" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL DEFAULT 11155111,
    "collectionId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MintRecord_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MintRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClaimPhase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phaseId" INTEGER NOT NULL,
    "startTimestamp" DATETIME NOT NULL,
    "maxSupply" INTEGER NOT NULL,
    "quantityLimitPerWallet" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT '0x0000000000000000000000000000000000000000',
    "pricePerToken" TEXT NOT NULL,
    "merkleRoot" TEXT,
    "metadata" TEXT,
    "collectionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClaimPhase_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WhitelistEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "maxMint" INTEGER NOT NULL DEFAULT 1,
    "collectionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhitelistEntry_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlatformConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "platformFeeBps" INTEGER NOT NULL DEFAULT 500,
    "platformWallet" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_contractAddress_key" ON "Collection"("contractAddress");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimPhase_collectionId_phaseId_key" ON "ClaimPhase"("collectionId", "phaseId");

-- CreateIndex
CREATE UNIQUE INDEX "WhitelistEntry_collectionId_address_key" ON "WhitelistEntry"("collectionId", "address");
