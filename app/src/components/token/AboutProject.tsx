import { Button } from '@/components/ui/button';

export function AboutProject() {
  return (
    <div className="relative w-full backdrop-blur-[2px] bg-[rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)] p-[1px]">
       {/* Corner Borders */}
       <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-[#d08700] z-10"></div>
       <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-[#d08700] z-10"></div>
       <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-white z-10"></div>
       <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-white z-10"></div>

      <div className="p-4 sm:p-5 md:p-6 flex flex-col gap-4 sm:gap-5 md:gap-6 relative overflow-hidden">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#d08700]"></div>
            <h3 className="font-rajdhani font-bold text-lg sm:text-xl md:text-2xl text-white">ABOUT PROJECT</h3>
          </div>
          <p className="font-rajdhani text-sm sm:text-base text-gray-400 leading-relaxed">
            DarkFi DEX utilizes Multi-Party Computation (MPC) to enable swaps without revealing trade size or direction until execution. The protocol creates a dark pool effect for all assets. DARK token holders capture protocol fees. This launch aims to bootstrap the initial liquidity pools.
          </p>
        </div>

        <div className="border-t border-[rgba(255,255,255,0.05)] pt-3 sm:pt-4 flex justify-between items-center">
             <div className="flex gap-1.5 sm:gap-2 items-center">
                 {/* Raise Progress Icon Placeholder */}
                 <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gray-700"></div>
                 <span className="font-rajdhani text-xs sm:text-sm text-gray-400">12 ZEC</span>
             </div>
             <div className="flex gap-1.5 sm:gap-2 items-center">
                 {/* Participants Icon Placeholder */}
                 <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gray-700"></div>
                 <span className="font-rajdhani text-xs sm:text-sm text-gray-400">420</span>
             </div>
        </div>
        
        <div className="flex justify-center mt-1 sm:mt-2">
            <Button variant="outline" className="border-2 border-[#d08700] text-[#d08700] hover:bg-[#d08700] hover:text-white font-share-tech-mono uppercase tracking-wider px-6 sm:px-8 md:px-10 py-1.5 sm:py-2 h-auto bg-transparent text-xs sm:text-sm">
                VIEW Pool
            </Button>
        </div>
      </div>
    </div>
  );
}

