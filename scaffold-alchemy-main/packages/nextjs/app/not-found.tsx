import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
          404
        </div>
        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-base-content/50 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="btn btn-primary">
            Mint NFT
          </Link>
          <Link href="/admin" className="btn btn-ghost">
            Admin Panel
          </Link>
        </div>
      </div>
    </div>
  );
}
