"use client"

import { useState } from "react";
import { TermsPrivacyModal } from "./TermsPrivacyModal";
import Link from "next/link";

export const Footer = () => {
    const [openModal, setOpenModal] = useState<null | "privacy" | "terms">(null);
    return(
        <div className="w-full bg-[#050505] border-t border-gray-900 pt-12 pb-12 mt-20">
            <div className="lg:container mx-auto px-4 lg:px-6">
                <div className="flex flex-col gap-12">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-12">
                        <div className="flex flex-col gap-4 min-w-[320px]">
                            <Link href={"/"} className="flex flex-row gap-2 items-center">
                                <div className="bg-[rgba(234,179,8,0.2)] border border-yellow-500 w-6 h-6 flex items-center justify-center">
                                    <span className="font-consolas font-bold text-yellow-500 text-xs">Z</span>
                                </div>
                                <span className="text-base font-bold font-space-grotesk text-gray-200 tracking-[-0.8px]">ZAUNCHPAD</span>
                            </Link>
                            <p className="font-rajdhani text-sm text-gray-600 leading-5">
                                Decentralized. Private. Unstoppable. Built on<br />
                                Zcash, Solana, and NEAR.
                            </p>
                        </div>
                        <div className="flex flex-col md:flex-row gap-12">
                            <div className="flex flex-col gap-4">
                                <h3 className="font-consolas font-bold text-sm text-gray-300 uppercase">Platform</h3>
                                <div className="flex flex-col gap-2">
                                    <a href="/token" className="font-rajdhani text-sm text-gray-600 hover:text-gray-400 transition-colors">Launches</a>
                                    <a href="/create" className="font-rajdhani text-sm text-gray-600 hover:text-gray-400 transition-colors">Create</a>
                                    <a href="/token/me" className="font-rajdhani text-sm text-gray-600 hover:text-gray-400 transition-colors">Dashboard</a>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <h3 className="font-consolas font-bold text-sm text-gray-300 uppercase">Resources</h3>
                                <div className="flex flex-col gap-2">
                                    <a href="https://www.zaunchpad.com/docs" target="_blank" className="font-rajdhani text-sm text-gray-600 hover:text-gray-400 transition-colors">Docs</a>
                                    <a href="#" className="font-rajdhani text-sm text-gray-600 hover:text-gray-400 transition-colors">Security</a>
                                    <a href="https://github.com/zaunchpad" target="_blank" className="font-rajdhani text-sm text-gray-600 hover:text-gray-400 transition-colors">Github</a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-900 pt-8">
                        <p className="font-rajdhani text-sm text-gray-700">© 2025 Zaunchpad Protocol. Open Source.</p>
                    </div>
                </div>
                <TermsPrivacyModal
                    open={openModal === "privacy"}
                    onOpenChange={(open: boolean) => setOpenModal(open ? openModal : null)}
                    type="privacy"
                />
                <TermsPrivacyModal
                    open={openModal === "terms"}
                    onOpenChange={(open: boolean) => setOpenModal(open ? openModal : null)}
                    type="terms"
                />
            </div>
        </div>
    )
}