import { NextRequest, NextResponse } from "next/server";

// POST /api/ipfs — 上传元数据到 IPFS (Pinata)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, image, attributes } = body;

    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretKey = process.env.PINATA_SECRET_KEY;

    if (!pinataApiKey || !pinataSecretKey) {
      // 无 Pinata 配置时返回模拟 hash（开发模式）
      const mockHash = `QmMock${Date.now().toString(36)}`;
      return NextResponse.json({
        ipfsHash: mockHash,
        ipfsUrl: `ipfs://${mockHash}`,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${mockHash}`,
        mock: true,
      });
    }

    const metadata = {
      name,
      description: description || "",
      image: image || "",
      attributes: attributes || [],
    };

    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: pinataApiKey,
        pinata_secret_api_key: pinataSecretKey,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: { name: `nft-metadata-${Date.now()}` },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Pinata error: ${err}` }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({
      ipfsHash: data.IpfsHash,
      ipfsUrl: `ipfs://${data.IpfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
