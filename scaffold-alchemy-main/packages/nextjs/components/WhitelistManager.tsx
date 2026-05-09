"use client";

import { useCallback, useState } from "react";
import { generateMerkleTree, getProof, parseAddressList } from "~~/utils/merkle";

/**
 * 白名单管理器 — CSV 上传 → Merkle Root 生成 → 一键设置
 * 参考 thirdweb Dashboard 的 allowlist 管理流程
 */
export function WhitelistManager({ onSetRoot }: { onSetRoot: (root: string) => void }) {
  const [input, setInput] = useState("");
  const [addresses, setAddresses] = useState<string[]>([]);
  const [root, setRoot] = useState<string | null>(null);
  const [testAddr, setTestAddr] = useState("");
  const [testProof, setTestProof] = useState<string[] | null>(null);
  const [testValid, setTestValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParse = useCallback(() => {
    setError(null);
    setRoot(null);
    setTestProof(null);
    setTestValid(null);

    const parsed = parseAddressList(input);
    if (parsed.length === 0) {
      setError("No valid addresses found. Format: 0x... one per line or comma-separated.");
      return;
    }
    if (parsed.length > 10000) {
      setError(`Too many addresses (${parsed.length}). Max 10,000 per batch.`);
      return;
    }
    setAddresses(parsed);
    const tree = generateMerkleTree(parsed);
    setRoot(tree.root);
  }, [input]);

  const handleTest = useCallback(() => {
    if (!addresses.length || !root) return;
    if (!/^0x[a-fA-F0-9]{40}$/.test(testAddr)) {
      setTestValid(false);
      setTestProof(null);
      return;
    }
    const tree = generateMerkleTree(addresses);
    const proof = getProof(tree, testAddr);
    const isValid = proof.length > 0;
    setTestProof(proof);
    setTestValid(isValid);
  }, [addresses, root, testAddr]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setInput(text);
    };
    reader.readAsText(file);
  }, []);

  return (
    <div className="space-y-5">
      {/* Input area */}
      <div className="rounded-2xl border border-base-content/5 bg-base-100 p-5">
        <h3 className="font-bold mb-1">Upload Addresses</h3>
        <p className="text-xs text-base-content/30 mb-3">
          Paste addresses (comma or newline separated) or upload a CSV file. Max 10,000 addresses.
        </p>

        <div className="flex gap-2 mb-3">
          <label className="btn btn-outline btn-sm gap-2 cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Upload CSV
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
          </label>
          {addresses.length > 0 && (
            <span className="badge badge-success gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {addresses.length} addresses parsed
            </span>
          )}
        </div>

        <textarea
          className="w-full rounded-xl border border-base-content/10 bg-base-200/30 p-3 font-mono text-xs h-32 focus:outline-none focus:border-primary transition-colors resize-none"
          placeholder={"0xAddr1\n0xAddr2\n0xAddr3\n..."}
          value={input}
          onChange={e => setInput(e.target.value)}
        />

        {error && (
          <div className="alert alert-error text-xs mt-2 py-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            {error}
          </div>
        )}

        <button className="btn btn-primary btn-sm mt-3" onClick={handleParse} disabled={!input.trim()}>
          Generate Merkle Root
        </button>
      </div>

      {/* Result */}
      {root && (
        <div className="rounded-2xl border border-success/20 bg-success/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-success">Merkle Root Generated</h3>
            <span className="badge badge-success">{addresses.length} leaves</span>
          </div>

          <div className="rounded-xl bg-base-200/50 p-3 font-mono text-xs break-all mb-4 select-all">{root}</div>

          <div className="flex gap-2">
            <button className="btn btn-success btn-sm flex-1" onClick={() => onSetRoot(root)}>
              Set as Contract Merkle Root
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                navigator.clipboard.writeText(root);
              }}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Proof tester */}
      {root && (
        <div className="rounded-2xl border border-base-content/5 bg-base-100 p-5">
          <h3 className="font-bold mb-1">Test Proof</h3>
          <p className="text-xs text-base-content/30 mb-3">Verify an address is in the whitelist and get its proof.</p>

          <div className="flex gap-2">
            <input
              className="Inp flex-1 font-mono text-xs"
              placeholder="0x..."
              value={testAddr}
              onChange={e => setTestAddr(e.target.value)}
            />
            <button className="btn btn-info btn-sm" onClick={handleTest} disabled={!testAddr}>
              Verify
            </button>
          </div>

          {testValid !== null && (
            <div
              className={`mt-3 rounded-xl p-3 text-sm ${testValid ? "bg-success/10 border border-success/20" : "bg-error/10 border border-error/20"}`}
            >
              {testValid ? (
                <div>
                  <p className="font-bold text-success mb-2">Address is whitelisted!</p>
                  <p className="text-xs text-base-content/40 mb-1">Proof (paste into mintAllowlist):</p>
                  <code className="block text-xs font-mono break-all bg-base-200/50 p-2 rounded">
                    {testProof?.join(", ")}
                  </code>
                </div>
              ) : (
                <p className="text-error">Address is NOT in the whitelist.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
