"use client"

import React, { useState, useMemo, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { InfoTooltip, DBC_TOOLTIPS } from '@/components/ui/info-tooltip';

interface LiquidityProps {
  onNext: (data: LiquidityData) => void;
  onBack: () => void;
  onCancel: () => void;
  currentStep?: number;
  totalSteps?: number;
  initialData?: LiquidityData;
}

export interface LiquidityData {
  partnerLpPercentage: number;
  creatorLpPercentage: number;
  partnerLockedLpPercentage: number;
  creatorLockedLpPercentage: number;
  creatorTradingFeePercentage: number;
  leftover: number;
  // Migration Fee (optional)
  migrationFee?: {
    feePercentage: number;
    creatorFeePercentage: number;
  };
}

export default function Liquidity({
  onNext,
  onBack,
  onCancel,
  currentStep = 5,
  totalSteps = 7,
  initialData
}: LiquidityProps) {
  const [formData, setFormData] = useState<LiquidityData>({
    partnerLpPercentage: initialData?.partnerLpPercentage || 50,
    creatorLpPercentage: initialData?.creatorLpPercentage || 50,
    partnerLockedLpPercentage: initialData?.partnerLockedLpPercentage || 0,
    creatorLockedLpPercentage: initialData?.creatorLockedLpPercentage || 0,
    creatorTradingFeePercentage: initialData?.creatorTradingFeePercentage || 50,
    leftover: initialData?.leftover || 0,
    migrationFee: initialData?.migrationFee || {
      feePercentage: 0,
      creatorFeePercentage: 0,
    },
  });

  const progressPercentage = useMemo(() =>
    (currentStep / totalSteps) * 100,
    [currentStep, totalSteps]
  );

  const handleInputChange = useCallback((field: keyof LiquidityData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
  }, []);

  const handleMigrationFeeChange = useCallback((field: 'feePercentage' | 'creatorFeePercentage', value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      migrationFee: {
        ...prev.migrationFee!,
        [field]: numValue
      }
    }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  }, [formData, onNext]);

  // Memoize liquidity calculations
  const liquidityCalculations = useMemo(() => {
    const totalLpPercentage = formData.partnerLpPercentage + formData.creatorLpPercentage;
    const isLpValid = totalLpPercentage <= 100;

    const partnerUnlockedLp = formData.partnerLpPercentage * (100 - formData.partnerLockedLpPercentage) / 100;
    const partnerLockedLp = formData.partnerLpPercentage * formData.partnerLockedLpPercentage / 100;
    const creatorUnlockedLp = formData.creatorLpPercentage * (100 - formData.creatorLockedLpPercentage) / 100;
    const creatorLockedLp = formData.creatorLpPercentage * formData.creatorLockedLpPercentage / 100;

    return {
      totalLpPercentage,
      isLpValid,
      partnerUnlockedLp,
      partnerLockedLp,
      creatorUnlockedLp,
      creatorLockedLp
    };
  }, [
    formData.partnerLpPercentage,
    formData.creatorLpPercentage,
    formData.partnerLockedLpPercentage,
    formData.creatorLockedLpPercentage
  ]);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex flex-col items-center pt-8 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2 font-share-tech-mono uppercase tracking-wider">
          Liquidity Configuration
        </h1>
        <p className="text-gray-400 text-lg font-share-tech-mono">
          Configure liquidity pool distribution and locking percentages.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="px-4 mb-8 max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-center mb-2">
          <span className="text-white font-medium font-share-tech-mono">Step {currentStep} of {totalSteps}</span>
          <span className="text-white font-medium font-share-tech-mono">{Math.round(progressPercentage)}% Complete</span>
        </div>
        <Progress 
          value={progressPercentage} 
          className="h-2"
          bgProgress="bg-[#d08700]"
        />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full px-4 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* LP Distribution */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 font-share-tech-mono uppercase">LP Distribution</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                  Partner LP Percentage
                  <InfoTooltip content={DBC_TOOLTIPS.lpDistribution.partnerLpPercentage} />
                </label>
                <input
                  type="number"
                  placeholder="20"
                  value={formData.partnerLpPercentage}
                  onChange={(e) => handleInputChange('partnerLpPercentage', e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder-gray-500 focus:outline-none focus:border-[#d08700] text-sm sm:text-base font-share-tech-mono"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                  Creator LP Percentage
                  <InfoTooltip content={DBC_TOOLTIPS.lpDistribution.creatorLpPercentage} />
                </label>
                <input
                  type="number"
                  placeholder="30"
                  value={formData.creatorLpPercentage}
                  onChange={(e) => handleInputChange('creatorLpPercentage', e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder-gray-500 focus:outline-none focus:border-[#d08700] text-sm sm:text-base font-share-tech-mono"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            {/* Total LP Validation */}
            <div className={cn(
              "p-4 rounded-lg mt-2 font-share-tech-mono",
              liquidityCalculations.isLpValid ? "bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)]" : "bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)]"
            )}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white">Total LP Distribution:</span>
                <span className={cn(
                  "text-sm font-bold",
                  liquidityCalculations.isLpValid ? "text-green-500" : "text-red-500"
                )}>
                  {liquidityCalculations.totalLpPercentage.toFixed(1)}%
                </span>
              </div>
              {!liquidityCalculations.isLpValid && (
                <p className="text-xs text-red-500 mt-1">
                  Total LP percentage cannot exceed 100%
                </p>
              )}
            </div>
          </div>

          {/* LP Locking */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 font-share-tech-mono uppercase">LP Locking</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                  Partner Locked LP Percentage
                  <InfoTooltip content={DBC_TOOLTIPS.lpDistribution.partnerLockedLpPercentage} />
                </label>
                <input
                  type="number"
                  placeholder="50"
                  value={formData.partnerLockedLpPercentage}
                  onChange={(e) => handleInputChange('partnerLockedLpPercentage', e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder-gray-500 focus:outline-none focus:border-[#d08700] text-sm sm:text-base font-share-tech-mono"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                  Creator Locked LP Percentage
                  <InfoTooltip content={DBC_TOOLTIPS.lpDistribution.creatorLockedLpPercentage} />
                </label>
                <input
                  type="number"
                  placeholder="70"
                  value={formData.creatorLockedLpPercentage}
                  onChange={(e) => handleInputChange('creatorLockedLpPercentage', e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder-gray-500 focus:outline-none focus:border-[#d08700] text-sm sm:text-base font-share-tech-mono"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          {/* Trading Fee & Leftover */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 font-share-tech-mono uppercase">Trading Fee & Leftover</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                  Creator Trading Fee Percentage (%)
                  <InfoTooltip content={DBC_TOOLTIPS.lpDistribution.creatorTradingFeePercentage} />
                </label>
                <input
                  type="number"
                  placeholder="50"
                  value={formData.creatorTradingFeePercentage}
                  onChange={(e) => handleInputChange('creatorTradingFeePercentage', e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder-gray-500 focus:outline-none focus:border-[#d08700] text-sm sm:text-base font-share-tech-mono"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-gray-500 mt-1 font-share-tech-mono">0% = all fees go to partner</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                  Leftover Amount
                  <InfoTooltip content={DBC_TOOLTIPS.lpDistribution.leftover} />
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.leftover}
                  onChange={(e) => handleInputChange('leftover', e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder-gray-500 focus:outline-none focus:border-[#d08700] text-sm sm:text-base font-share-tech-mono"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1 font-share-tech-mono">Claimable after pool migrates</p>
              </div>
            </div>
          </div>

          {/* Migration Fee */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 font-share-tech-mono uppercase">Migration Fee (Optional)</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                  Migration Fee Percentage (%)
                  <InfoTooltip content={DBC_TOOLTIPS.migrationFee.feePercentage} />
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.migrationFee?.feePercentage || 0}
                  onChange={(e) => handleMigrationFeeChange('feePercentage', e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder-gray-500 focus:outline-none focus:border-[#d08700] text-sm sm:text-base font-share-tech-mono"
                  min="0"
                  max="50"
                />
                <p className="text-xs text-gray-500 mt-1 font-share-tech-mono">Fee taken from migration threshold (0-50%)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                  Creator Migration Fee Percentage (%)
                  <InfoTooltip content={DBC_TOOLTIPS.migrationFee.creatorFeePercentage} />
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.migrationFee?.creatorFeePercentage || 0}
                  onChange={(e) => handleMigrationFeeChange('creatorFeePercentage', e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder-gray-500 focus:outline-none focus:border-[#d08700] text-sm sm:text-base font-share-tech-mono"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-gray-500 mt-1 font-share-tech-mono">Creator's share of migration fee (0-100%)</p>
              </div>
            </div>
          </div>

          {/* LP Distribution Preview */}
          <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] p-6 mb-8">
            <h3 className="font-semibold text-white mb-4 font-share-tech-mono uppercase">LP Distribution Preview</h3>
            <div className="space-y-4 font-share-tech-mono">
              {/* Partner LP Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-white">Partner LP ({formData.partnerLpPercentage}%)</span>
                  <span className="text-sm text-gray-400">{formData.partnerLpPercentage}% of total LP</span>
                </div>
                <div className="ml-4 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Unlocked:</span>
                    <span className="font-medium text-white">{liquidityCalculations.partnerUnlockedLp.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Locked:</span>
                    <span className="font-medium text-white">{liquidityCalculations.partnerLockedLp.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Creator LP Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-white">Creator LP ({formData.creatorLpPercentage}%)</span>
                  <span className="text-sm text-gray-400">{formData.creatorLpPercentage}% of total LP</span>
                </div>
                <div className="ml-4 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Unlocked:</span>
                    <span className="font-medium text-white">{liquidityCalculations.creatorUnlockedLp.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Locked:</span>
                    <span className="font-medium text-white">{liquidityCalculations.creatorLockedLp.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="pt-2 border-t border-[rgba(255,255,255,0.1)]">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-400">Total Unlocked LP:</span>
                  <span className="text-white">{(liquidityCalculations.partnerUnlockedLp + liquidityCalculations.creatorUnlockedLp).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-400">Total Locked LP:</span>
                  <span className="text-white">{(liquidityCalculations.partnerLockedLp + liquidityCalculations.creatorLockedLp).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] p-6 rounded-none">
              <h3 className="font-semibold text-[#d08700] mb-2 font-share-tech-mono">LP Distribution</h3>
              <p className="text-sm text-gray-400 font-share-tech-mono">
                LP tokens represent ownership in the liquidity pool. 
                Distribute them carefully between partners and creators.
              </p>
            </div>
            <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] p-6 rounded-none">
              <h3 className="font-semibold text-[#d08700] mb-2 font-share-tech-mono">LP Locking</h3>
              <p className="text-sm text-gray-400 font-share-tech-mono">
                Locking LP tokens prevents immediate withdrawal and 
                helps maintain liquidity stability in the pool.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 max-w-4xl mx-auto px-4">
          <button 
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-6 py-3 border border-[rgba(255,255,255,0.1)] text-gray-400 font-share-tech-mono uppercase transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.2)]"
          >
            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <button
            type="submit"
            disabled={!liquidityCalculations.isLpValid}
            className={`w-full sm:w-auto px-6 py-3 font-share-tech-mono uppercase rounded-none transition-colors flex items-center justify-center ${
              !liquidityCalculations.isLpValid
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                : 'bg-[#d08700] text-black hover:bg-[#e89600] cursor-pointer'
            }`}
          >
            Continue to Authority
            <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
