"use client";

/**
 * CreateCollection — no-code collection creator wizard (#34).
 *
 * Flow (borrowed from the thirdweb dashboard pattern):
 *   1. Basic info (name, symbol, supply, price, cover image via IPFS)
 *   2. Deploy on-chain via the NFTLaunchpadKitFactory (browser wallet signs)
 *   3. Register the collection in the platform backend
 *   4. Guided next steps (sale / royalty / whitelist)
 */
import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, parseEventLogs } from "viem";
import type { Address } from "viem";
import deployedContracts from "~~/contracts/deployedContracts";

interface CreateCollectionProps {
  /** Called after the collection is deployed + registered. */
  onCreated: (collectionId: string) => void;
}

const STEPS = ["基本信息", "链上部署", "平台注册", "完成"];

export default function CreateCollection({ onCreated }: CreateCollectionProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const factory = useMemo(
    () => (deployedContracts as Record<number, any>)?.[chainId]?.NFTLaunchpadKitFactory,
    [chainId],
  );

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [maxSupply, setMaxSupply] = useState("1000");
  const [maxPerWallet, setMaxPerWallet] = useState("5");
  const [mintPrice, setMintPrice] = useState("0.01");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloneAddress, setCloneAddress] = useState<string | null>(null);
  const [collectionId, setCollectionId] = useState<string | null>(null);

  // AI metadata pipeline (#36)
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaImageUrl, setMetaImageUrl] = useState("");
  const [metaCount, setMetaCount] = useState("100");
  const [metaBusy, setMetaBusy] = useState(false);
  const [baseUri, setBaseUri] = useState("");

  const { writeContractAsync, isPending: isDeploying } = useWriteContract();
  const [deployTxHash, setDeployTxHash] = useState<`0x${string}` | null>(null);
  const { data: deployReceipt, isError: deployFailed } = useWaitForTransactionReceipt({
    hash: deployTxHash ?? undefined,
  });

  // Typed minimal ABI for the event we parse (keeps parseEventLogs fully typed).
  const CollectionClonedAbi = [
    {
      type: "event",
      name: "CollectionCloned",
      inputs: [
        { type: "address", name: "cloneAddress", indexed: true },
        { type: "address", name: "owner", indexed: true },
        { type: "string", name: "name" },
        { type: "string", name: "symbol" },
        { type: "uint256", name: "maxSupply" },
      ],
    },
  ] as const;

  // When the deploy tx confirms, parse the CollectionCloned event → clone address.
  useEffect(() => {
    if (!deployReceipt || step !== 1) return;
    try {
      const [cloneEvent] = parseEventLogs({
        logs: deployReceipt.logs,
        abi: CollectionClonedAbi,
        eventName: "CollectionCloned",
      });
      if (!cloneEvent) throw new Error("部署成功但未找到 CollectionCloned 事件");
      const addr = (cloneEvent.args as any).cloneAddress as string;
      setCloneAddress(addr);
      setStep(2);
    } catch (e: any) {
      setError(e?.message || "解析部署事件失败");
    }
  }, [deployReceipt, step, factory]);

  // Deploy tx failed on-chain.
  useEffect(() => {
    if (deployFailed) setError("部署交易失败，请重试或检查钱包");
  }, [deployFailed]);

  const isValid = useMemo(
    () =>
      name.trim().length > 0 &&
      symbol.trim().length > 0 &&
      Number(maxSupply) > 0 &&
      Number(maxPerWallet) > 0 &&
      Number(mintPrice) > 0,
    [name, symbol, maxSupply, maxPerWallet, mintPrice],
  );

  async function handleUpload() {
    if (!coverImage) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/ipfs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "collection", description, image: coverImage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "upload failed");
      setCoverImage(data.ipfsUrl || coverImage);
    } catch (e: any) {
      setError(e.message || "图片上传失败");
    } finally {
      setUploading(false);
    }
  }

  /** AI metadata pipeline (#36): generate N metadata files and pin the folder to IPFS. */
  async function handleGenerateMetadata() {
    if (!metaImageUrl.trim()) return;
    setMetaBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/metadata/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Collection",
          imageUrl: metaImageUrl.trim(),
          count: Number(metaCount) || 100,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      if (data.baseUri) setBaseUri(data.baseUri);
      setError(data.mock ? "（开发模式）未配置 PINATA_JWT，返回了模拟 CID —— 配置后即为真实 IPFS 地址" : null);
    } catch (e: any) {
      setError(e.message || "元数据生成失败");
    } finally {
      setMetaBusy(false);
    }
  }

  async function handleDeploy() {
    setError(null);
    if (!address || !factory) return;
    try {
      const txHash = await writeContractAsync({
        address: factory.address as Address,
        abi: factory.abi,
        functionName: "deployCollection",
        args: [name.trim(), symbol.trim(), Number(maxSupply), Number(maxPerWallet), parseEther(mintPrice)],
      });
      setDeployTxHash(txHash);
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "部署失败（请检查钱包是否已连接/网络是否正确）");
    }
  }

  async function handleRegister() {
    setError(null);
    if (!address || !cloneAddress) return;
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          symbol: symbol.trim(),
          description: description.trim() || undefined,
          maxSupply: Number(maxSupply),
          mintPrice,
          maxPerWallet: Number(maxPerWallet),
          ownerAddress: address,
          coverImage: coverImage || undefined,
          contractAddress: cloneAddress,
          chainId,
          baseURI: baseUri || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "注册失败");
      setCollectionId(data.id);
      setStep(3);
      onCreated(data.id);
    } catch (e: any) {
      setError(e.message || "注册失败");
    }
  }

  return (
    <div className="card bg-base-100 border border-base-300 shadow-lg">
      <div className="card-body">
        {/* Step indicator */}
        <ul className="steps steps-horizontal w-full mb-6 text-sm">
          {STEPS.map((label, i) => (
            <li key={label} className={`step ${i <= step ? "step-primary" : ""}`}>
              {label}
            </li>
          ))}
        </ul>

        {error && (
          <div className="alert alert-error text-sm mb-4">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Step 1 — basic info */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="form-control">
                <span className="label-text">集合名称 *</span>
                <input
                  className="input input-bordered"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="例如：Agent Club"
                />
              </label>
              <label className="form-control">
                <span className="label-text">符号 *</span>
                <input
                  className="input input-bordered"
                  value={symbol}
                  onChange={e => setSymbol(e.target.value.toUpperCase())}
                  placeholder="例如：AGT"
                  maxLength={8}
                />
              </label>
              <label className="form-control">
                <span className="label-text">总供应量 *</span>
                <input
                  type="number"
                  min={1}
                  className="input input-bordered"
                  value={maxSupply}
                  onChange={e => setMaxSupply(e.target.value)}
                />
              </label>
              <label className="form-control">
                <span className="label-text">每钱包限购 *</span>
                <input
                  type="number"
                  min={1}
                  className="input input-bordered"
                  value={maxPerWallet}
                  onChange={e => setMaxPerWallet(e.target.value)}
                />
              </label>
              <label className="form-control">
                <span className="label-text">铸造价格（ETH）*</span>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  className="input input-bordered"
                  value={mintPrice}
                  onChange={e => setMintPrice(e.target.value)}
                />
              </label>
              <label className="form-control">
                <span className="label-text">封面图 URL（可选，支持 IPFS）</span>
                <div className="flex gap-2">
                  <input
                    className="input input-bordered flex-1"
                    value={coverImage}
                    onChange={e => setCoverImage(e.target.value)}
                    placeholder="https://… 或 ipfs://…"
                  />
                  <button className="btn btn-outline" onClick={handleUpload} disabled={uploading || !coverImage}>
                    {uploading ? "上传中…" : "上传 IPFS"}
                  </button>
                </div>
              </label>
            </div>
            <label className="form-control">
              <span className="label-text">描述（可选）</span>
              <textarea className="textarea textarea-bordered" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </label>

            {/* AI metadata pipeline (#36) — generate + pin the whole folder in one click */}
            <div className="border border-base-300 rounded-xl">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
                onClick={() => setMetaOpen(o => !o)}
              >
                <span>⚡ AI 元数据生成（可选）</span>
                <span className="text-base-content/40">{metaOpen ? "▾" : "▸"}</span>
              </button>
              {metaOpen && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="text-xs text-base-content/50">
                    输入图片 URL（支持 <code>{`{id}`}</code> 占位符）和数量，一键生成 {`{id}.json`} 元数据并打包上传 IPFS，产出可直接用作 Base URI 的地址。
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      className="input input-bordered input-sm"
                      value={metaImageUrl}
                      onChange={e => setMetaImageUrl(e.target.value)}
                      placeholder="https://cdn.example.com/agents/{id}.png"
                    />
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      className="input input-bordered input-sm"
                      value={metaCount}
                      onChange={e => setMetaCount(e.target.value)}
                      placeholder="数量（1-10000）"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn btn-sm btn-outline" onClick={handleGenerateMetadata} disabled={metaBusy || !metaImageUrl.trim()}>
                      {metaBusy ? "生成中…" : "🚀 生成并上传"}
                    </button>
                    {baseUri && (
                      <div className="text-xs text-success break-all flex-1">
                        Base URI: <code>{baseUri}</code>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-primary" disabled={!isValid} onClick={() => setStep(1)}>
                下一步：链上部署 →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — deploy via Factory */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="alert alert-info text-sm">
              <span>
                即将通过 Factory 部署集合 <b>{name || "—"}</b>（{symbol}）：
                {Number(maxSupply)} 个 · {mintPrice} ETH · 每钱包 {maxPerWallet} 个。
                部署 Gas 约 371k（最小代理克隆，比全量部署省 93%）。请用浏览器钱包确认交易。
              </span>
            </div>
            {!isConnected && <div className="alert alert-warning text-sm">请先连接钱包（右上角 Connect 按钮）。</div>}
            {isConnected && !factory && (
              <div className="alert alert-warning text-sm">当前网络（chainId {chainId}）没有配置 Factory，请切换到 Sepolia 或本地链。</div>
            )}
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => setStep(0)}>
                ← 返回
              </button>
              <button className="btn btn-primary" disabled={!isConnected || !factory || isDeploying} onClick={handleDeploy}>
                {isDeploying ? "部署中…" : "🚀 部署集合"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — register in backend */}
        {step === 2 && cloneAddress && (
          <div className="space-y-4">
            <div className="alert alert-success text-sm">
              <span>
                ✅ 合约已部署：<code className="break-all">{cloneAddress}</code>
              </span>
            </div>
            <div className="alert alert-info text-sm">
              <span>最后一步：把集合注册到平台（记录所有权、展示在集合页和管理后台）。</span>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-primary" onClick={handleRegister}>
                注册到平台 →
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — done + guided next steps */}
        {step === 3 && collectionId && (
          <div className="space-y-4">
            <div className="alert alert-success text-sm">
              <span>🎉 集合「{name}」创建成功！已切换到新集合的管理面板。</span>
            </div>
            <div className="text-sm text-base-content/70">
              接下来可以：
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="border border-base-300 rounded-xl p-3">
                <div className="font-bold mb-1">⚡ 开启销售</div>
                <div className="text-base-content/50 text-xs mb-2">设置价格、开关公开/白名单销售</div>
                <button className="btn btn-sm btn-outline w-full" onClick={() => onCreated(collectionId)}>
                  去 Sale Control
                </button>
              </div>
              <div className="border border-base-300 rounded-xl p-3">
                <div className="font-bold mb-1">💰 设置版税</div>
                <div className="text-base-content/50 text-xs mb-2">EIP-2981 版税接收地址和比例</div>
                <button className="btn btn-sm btn-outline w-full" onClick={() => onCreated(collectionId)}>
                  去 Royalty
                </button>
              </div>
              <div className="border border-base-300 rounded-xl p-3">
                <div className="font-bold mb-1">📋 白名单</div>
                <div className="text-base-content/50 text-xs mb-2">CSV 上传 → Merkle Root → 白名单铸造</div>
                <button className="btn btn-sm btn-outline w-full" onClick={() => onCreated(collectionId)}>
                  去 Whitelist
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
