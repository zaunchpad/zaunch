interface TokenHeaderProps {
    token: any;
    address: string;
}

export function TokenHeader({ token, address }: TokenHeaderProps) {
  // Using dummy data from props or falling back to defaults
  const name = token?.name || "DarkFi DEX";
  const symbol = token?.symbol ? `$${token.symbol}` : "$DARK";
  const status = "Active Sale";
  const timeLeft = "04d 12h 33m";

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full mb-4 sm:mb-6 gap-4 sm:gap-6">
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
        {/* Token Logo Box */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-[#301342] border border-[rgba(20,184,166,0.5)] rounded-lg flex items-center justify-center p-2 sm:p-2.5 md:p-3 shrink-0">
             {/* Placeholder for logo */}
             <div className="w-full h-full bg-purple-900/50 rounded flex items-center justify-center text-white font-bold text-base sm:text-lg md:text-xl">D</div>
        </div>
        
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
             <h1 className="font-rajdhani font-bold text-2xl sm:text-3xl md:text-4xl text-white leading-tight truncate">{name}</h1>
             <div className="flex flex-wrap gap-1.5">
                 <div className="border border-gray-600 px-1.5 sm:px-2 py-0.5 flex items-center justify-center">
                     <span className="font-rajdhani font-bold text-sm sm:text-base md:text-lg text-gray-600">{symbol}</span>
                 </div>
                 <div className="border border-[#34c759] px-1.5 sm:px-2 py-0.5 flex items-center justify-center">
                     <span className="font-rajdhani font-bold text-sm sm:text-base md:text-lg text-[#34c759]">{status}</span>
                 </div>
             </div>
        </div>
      </div>

      <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
          <span className="font-rajdhani text-xs text-gray-500">SALE ENDS IN</span>
          <span className="font-rajdhani font-bold text-2xl sm:text-3xl md:text-4xl text-white">{timeLeft}</span>
      </div>
    </div>
  );
}
