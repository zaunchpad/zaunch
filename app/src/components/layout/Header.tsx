"use client"

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { WalletButton } from '../wallet/WalletButton';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

    const isActive = (path: string) => {
        switch (path) {
            case '/token/bridge':
            case '/token/me':
                return pathname === path;
            case '/token':
                return pathname === '/token';
            case '/create':
                return pathname === path || pathname?.startsWith('/create/');
            default:
                return pathname === path;
        }
    };

    return (
        <header className="absolute top-0 left-0 right-0 z-50 backdrop-blur-[6px] bg-[rgba(0,0,0,0.8)] border-b-[0.667px] border-gray-800">
            <div className="w-full px-4 md:px-[76px] h-[64px] flex items-center justify-center">
                <div className="max-w-[1280px] w-full px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="bg-[rgba(234,179,8,0.2)] border border-yellow-500 w-8 h-8 flex items-center justify-center">
                                <span className="font-consolas font-bold text-yellow-500 text-[20px] leading-[28px]">Z</span>
                            </div>
                            <span className="text-[20px] font-bold font-space-grotesk text-white tracking-[-1px] leading-[28px] md:block hidden">ZAUNCHPAD</span>
                        </Link>
                    </div>
                    <nav className="hidden md:flex items-center gap-8">
                        <Link href="/token" className="font-consolas text-sm text-gray-400 hover:text-white transition-colors leading-[20px]">
                            EXPLORE
                        </Link>
                        <Link href="/create" className="font-consolas text-sm text-gray-400 hover:text-white transition-colors leading-[20px]">
                            CREATE
                        </Link>
                        <a href="https://www.zaunchpad.com/docs" target="_blank" className="font-consolas text-sm text-gray-400 hover:text-white transition-colors leading-[20px]">
                            DOCS
                        </a>
                    </nav>
                    <div className="flex items-center gap-8">
                        <div className="hidden md:flex items-center">
                            <WalletButton />
                        </div>
                        
                        <div className='flex flex-row items-center gap-4 md:hidden'>
                            <a href='/create' className='flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-[#d08700] text-black hover:bg-[#d08700]/85 transition-all duration-300'>
                                <PlusIcon className='w-4 h-4' />
                                <span className='text-sm font-share-tech-mono uppercase'>Create</span>
                            </a>
                            <button
                                className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 text-white"
                                onClick={() => setSidebarOpen(true)}
                                aria-label="Open menu"
                            >
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {sidebarOpen && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-black opacity-40" onClick={() => setSidebarOpen(false)}></div>
                    <div className="relative bg-[#000000] w-64 h-full shadow-lg flex flex-col p-6 border-r border-gray-800">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                            onClick={() => setSidebarOpen(false)}
                            aria-label="Close menu"
                        >
                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                        <div className="flex items-center gap-2 mb-8">
                            <div className="bg-[rgba(234,179,8,0.2)] border border-yellow-500 w-8 h-8 flex items-center justify-center">
                                <span className="font-consolas font-bold text-yellow-500 text-xl">Z</span>
                            </div>
                            <span className="text-xl font-bold font-space-grotesk text-white tracking-[-1px]">ZAUNCHPAD</span>
                        </div>
                        <nav className="flex flex-col space-y-4 mb-8">
                            <Link href="/token" className="font-consolas text-sm text-gray-400 hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
                                EXPLORE
                            </Link>
                            <Link
                                href="/create"
                                className="font-consolas text-sm text-gray-400 hover:text-white transition-colors"
                                onClick={() => setSidebarOpen(false)}
                            >
                                CREATE
                            </Link>
                            <Link href="/token/bridge" className="font-consolas text-sm text-gray-400 hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
                                BRIDGE
                            </Link>
                            <Link href="/token/me" className="font-consolas text-sm text-gray-400 hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
                                MY TOKENS
                            </Link>
                        </nav>
                        <div className="mt-auto">
                            <WalletButton />
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}