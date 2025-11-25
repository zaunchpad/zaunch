import TokenSearch from "@/components/token/TokenSearch";
export const dynamic = 'force-dynamic';

export default async function Home() {
  return (
    <div className="min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-white mb-2">EXPLORE LAUNCHES</h1>
        <p className="text-gray-500 mb-8 text-base">
        Verified encrypted sales. Capital secured by math.
        </p>
        
        <TokenSearch />
      </div>
    </div>
  );
}