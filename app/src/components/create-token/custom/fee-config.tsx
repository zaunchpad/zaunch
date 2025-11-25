"use client"

import React, { useState, useCallback, useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { InfoTooltip, DBC_TOOLTIPS } from '@/components/ui/info-tooltip';

interface FeeConfigProps {
  onNext: (data: FeeConfigData) => void;
  onBack: () => void;
  onCancel: () => void;
  currentStep?: number;
  totalSteps?: number;
  initialData?: FeeConfigData;
}

export interface FeeConfigData {
  baseFeeMode: "0" | "1" | "2";
  feeSchedulerParam?: {
    startingFeeBps: number;
    endingFeeBps: number;
    numberOfPeriod: number;
    totalDuration: number;
  };
  rateLimiterParam?: {
    baseFeeBps: number;
    feeIncrementBps: number;
    referenceAmount: number;
    maxLimiterDuration: number;
  };
}

const baseFeeModes = [
  { value: "0", label: "Linear Fee Scheduler", description: "Fees decrease linearly over time" },
  { value: "1", label: "Exponential Fee Scheduler", description: "Fees decrease exponentially" },
  { value: "2", label: "Rate Limiter", description: "Limits transaction rate with dynamically increasing fees" }
];

export default function FeeConfig({
  onNext,
  onBack,
  onCancel,
  currentStep = 3,
  totalSteps = 7,
  initialData
}: FeeConfigProps) {
  const [formData, setFormData] = useState<FeeConfigData>({
    baseFeeMode: initialData?.baseFeeMode || "0",
    feeSchedulerParam: initialData?.feeSchedulerParam || {
      startingFeeBps: 100,
      endingFeeBps: 100,
      numberOfPeriod: 10,
      totalDuration: 3600,
    },
    rateLimiterParam: initialData?.rateLimiterParam || {
      baseFeeBps: 200,
      feeIncrementBps: 200,
      referenceAmount: 0,
      maxLimiterDuration: 0,
    },
  });

  const progressPercentage = useMemo(() =>
    (currentStep / totalSteps) * 100,
    [currentStep, totalSteps]
  );

  const handleInputChange = useCallback((field: keyof FeeConfigData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSchedulerChange = useCallback((field: 'startingFeeBps' | 'endingFeeBps' | 'numberOfPeriod' | 'totalDuration', value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      feeSchedulerParam: {
        ...prev.feeSchedulerParam!,
        [field]: numValue
      }
    }));
  }, []);

  const handleRateLimiterChange = useCallback((field: 'baseFeeBps' | 'feeIncrementBps' | 'referenceAmount' | 'maxLimiterDuration', value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      rateLimiterParam: {
        ...prev.rateLimiterParam!,
        [field]: numValue
      }
    }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  }, [formData, onNext]);

  const isSchedulerMode = useMemo(() =>
    ["0", "1"].includes(formData.baseFeeMode),
    [formData.baseFeeMode]
  );

  const isRateLimiterMode = useMemo(() =>
    formData.baseFeeMode === "2",
    [formData.baseFeeMode]
  );

  const feePreview = useMemo(() => {
    if (isSchedulerMode && formData.feeSchedulerParam) {
      return {
        startingFeePercent: (formData.feeSchedulerParam.startingFeeBps / 100).toFixed(2),
        endingFeePercent: (formData.feeSchedulerParam.endingFeeBps / 100).toFixed(2),
      };
    }
    if (isRateLimiterMode && formData.rateLimiterParam) {
      return {
        baseFeePercent: (formData.rateLimiterParam.baseFeeBps / 100).toFixed(2),
        maxFeePercent: ((formData.rateLimiterParam.baseFeeBps + formData.rateLimiterParam.feeIncrementBps) / 100).toFixed(2),
      };
    }
    return null;
  }, [formData, isSchedulerMode, isRateLimiterMode]);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex flex-col items-center pt-8 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2 font-share-tech-mono uppercase tracking-wider">
          Fee Configuration
        </h1>
        <p className="text-gray-400 text-lg font-share-tech-mono">
          Configure fee structure and schedule for your token.
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
          {/* Base Fee Mode */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 font-share-tech-mono uppercase">Fee Mode</h3>

            <div className="mb-3 sm:mb-4">
              <label className="text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                Base Fee Mode <strong className="text-[#d08700]">*</strong>
                <InfoTooltip content="Select how fees change over time" />
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full px-3 py-2 border border-[rgba(255,255,255,0.1)] bg-transparent text-white rounded-none focus:outline-none focus:border-[#d08700] text-sm sm:text-base text-left flex justify-between items-center cursor-pointer font-share-tech-mono">
                  {baseFeeModes.find(mode => mode.value === formData.baseFeeMode)?.label || 'Select mode'}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#000000] border border-[rgba(255,255,255,0.1)]">
                  {baseFeeModes.map(mode => (
                    <DropdownMenuItem
                      key={mode.value}
                      onClick={() => handleInputChange('baseFeeMode', mode.value as "0" | "1" | "2")}
                      className="cursor-pointer text-gray-300 hover:bg-[rgba(255,255,255,0.1)] hover:text-white focus:bg-[rgba(255,255,255,0.1)] focus:text-white font-share-tech-mono"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{mode.label}</span>
                        <span className="text-xs text-gray-500">{mode.description}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mode Description */}
            <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] p-4 rounded-none">
              <h4 className="font-semibold text-sm mb-2 text-[#d08700] font-share-tech-mono">
                {baseFeeModes.find(m => m.value === formData.baseFeeMode)?.label}
              </h4>
              <p className="text-xs text-gray-400 font-share-tech-mono">
                {baseFeeModes.find(m => m.value === formData.baseFeeMode)?.description}
              </p>
            </div>
          </div>

          {/* Fee Scheduler Parameters */}
          {isSchedulerMode && formData.feeSchedulerParam && (
            <div className="mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 font-share-tech-mono uppercase">Fee Scheduler Parameters</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                    Starting Fee (BPS) <strong className="text-[#d08700]">*</strong>
                    <InfoTooltip content={DBC_TOOLTIPS.feeScheduler.startingFeeBps} />
                  </label>
                  <input
                    type="number"
                    placeholder="100"
                    value={formData.feeSchedulerParam.startingFeeBps}
                    onChange={(e) => handleSchedulerChange('startingFeeBps', e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder-gray-500 focus:outline-none focus:border-[#d08700] text-sm sm:text-base font-share-tech-mono"
                    min="1"
                    max="9900"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1 font-share-tech-mono">100 bps = 1%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                    Ending Fee (BPS) <strong className="text-[#d08700]">*</strong>
                    <InfoTooltip content={DBC_TOOLTIPS.feeScheduler.endingFeeBps} />
                  </label>
                  <input
                    type="number"
                    placeholder="50"
                    value={formData.feeSchedulerParam.endingFeeBps}
                    onChange={(e) => handleSchedulerChange('endingFeeBps', e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder-gray-500 focus:outline-none focus:border-[#d08700] text-sm sm:text-base font-share-tech-mono"
                    min="1"
                    max="9900"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1 font-share-tech-mono">Minimum 1 bps (0.01%)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                    Number of Periods <strong className="text-[#d08700]">*</strong>
                    <InfoTooltip content={DBC_TOOLTIPS.feeScheduler.numberOfPeriod} />
                  </label>
                  <input
                    type="number"
                    placeholder="10"
                    value={formData.feeSchedulerParam.numberOfPeriod}
                    onChange={(e) => handleSchedulerChange('numberOfPeriod', e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder-gray-500 focus:outline-none focus:border-[#d08700] text-sm sm:text-base font-share-tech-mono"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                    Total Duration <strong className="text-[#d08700]">*</strong>
                    <InfoTooltip content={DBC_TOOLTIPS.feeScheduler.totalDuration} />
                  </label>
                  <input
                    type="number"
                    placeholder="3600"
                    value={formData.feeSchedulerParam.totalDuration}
                    onChange={(e) => handleSchedulerChange('totalDuration', e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder-gray-500 focus:outline-none focus:border-[#d08700] text-sm sm:text-base font-share-tech-mono"
                    min="1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1 font-share-tech-mono">Based on selected activation type</p>
                </div>
              </div>
            </div>
          )}

          {/* Rate Limiter Parameters */}
          {isRateLimiterMode && formData.rateLimiterParam && (
            <div className="mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 font-share-tech-mono uppercase">Rate Limiter Parameters</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                    Base Fee (BPS) <strong className="text-[#d08700]">*</strong>
                    <InfoTooltip content={DBC_TOOLTIPS.rateLimiter.baseFeeBps} />
                  </label>
                  <input
                    type="number"
                    placeholder="200"
                    value={formData.rateLimiterParam.baseFeeBps}
                    onChange={(e) => handleRateLimiterChange('baseFeeBps', e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder-gray-500 focus:outline-none focus:border-[#d08700] text-sm sm:text-base font-share-tech-mono"
                    min="0"
                    max="9900"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1 font-share-tech-mono">Phí cơ bản khi không vượt ngưỡng</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                    Fee Increment (BPS) <strong className="text-[#d08700]">*</strong>
                    <InfoTooltip content={DBC_TOOLTIPS.rateLimiter.feeIncrementBps} />
                  </label>
                  <input
                    type="number"
                    placeholder="200"
                    value={formData.rateLimiterParam.feeIncrementBps}
                    onChange={(e) => handleRateLimiterChange('feeIncrementBps', e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder-gray-500 focus:outline-none focus:border-[#d08700] text-sm sm:text-base font-share-tech-mono"
                    min="0"
                    max={9900 - formData.rateLimiterParam.baseFeeBps}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1 font-share-tech-mono">Phí tăng thêm khi vượt ngưỡng</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                    Reference Amount <strong className="text-[#d08700]">*</strong>
                    <InfoTooltip content={DBC_TOOLTIPS.rateLimiter.referenceAmount} />
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.rateLimiterParam.referenceAmount}
                    onChange={(e) => handleRateLimiterChange('referenceAmount', e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder-gray-500 focus:outline-none focus:border-[#d08700] text-sm sm:text-base font-share-tech-mono"
                    min="0"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1 font-share-tech-mono">Ngưỡng kích hoạt fee increment</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 flex items-center font-share-tech-mono">
                    Max Limiter Duration <strong className="text-[#d08700]">*</strong>
                    <InfoTooltip content={DBC_TOOLTIPS.rateLimiter.maxLimiterDuration} />
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.rateLimiterParam.maxLimiterDuration}
                    onChange={(e) => handleRateLimiterChange('maxLimiterDuration', e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder-gray-500 focus:outline-none focus:border-[#d08700] text-sm sm:text-base font-share-tech-mono"
                    min="0"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1 font-share-tech-mono">Thời gian tối đa của limiter</p>
                </div>
              </div>
            </div>
          )}

          {/* Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] p-6 rounded-none">
              <h3 className="font-semibold text-[#d08700] mb-2 font-share-tech-mono">Fee Structure</h3>
              <p className="text-sm text-gray-400 font-share-tech-mono">
                Phí được tính trên các giao dịch và giúp duy trì tính thanh khoản.
                Cân nhắc điều kiện thị trường khi thiết lập mức phí.
              </p>
            </div>
            <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] p-6 rounded-none">
              <h3 className="font-semibold text-[#d08700] mb-2 font-share-tech-mono">
                {isSchedulerMode ? "Scheduler Benefits" : "Rate Limiter Benefits"}
              </h3>
              <p className="text-sm text-gray-400 font-share-tech-mono">
                {isSchedulerMode
                  ? "Fee scheduling cho phép giảm phí dần theo thời gian, khuyến khích early adoption trong khi duy trì tính bền vững."
                  : "Rate limiter giúp kiểm soát khối lượng giao dịch lớn bằng cách tăng phí khi vượt ngưỡng tham chiếu."
                }
              </p>
            </div>
          </div>

          {/* Fee Preview */}
          {feePreview && (
            <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] p-6 mb-8">
              <h3 className="font-semibold text-white mb-4 font-share-tech-mono uppercase">Fee Preview</h3>
              <div className="space-y-2 font-share-tech-mono">
                {isSchedulerMode && 'startingFeePercent' in feePreview && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Starting Fee:</span>
                      <span className="text-sm font-medium text-white">{feePreview.startingFeePercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Ending Fee:</span>
                      <span className="text-sm font-medium text-white">{feePreview.endingFeePercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Duration:</span>
                      <span className="text-sm font-medium text-white">{formData.feeSchedulerParam?.totalDuration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Periods:</span>
                      <span className="text-sm font-medium text-white">{formData.feeSchedulerParam?.numberOfPeriod}</span>
                    </div>
                  </>
                )}
                {isRateLimiterMode && 'baseFeePercent' in feePreview && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Base Fee:</span>
                      <span className="text-sm font-medium text-white">{feePreview.baseFeePercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Max Fee (with increment):</span>
                      <span className="text-sm font-medium text-white">{feePreview.maxFeePercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Reference Amount:</span>
                      <span className="text-sm font-medium text-white">{formData.rateLimiterParam?.referenceAmount.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
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
            className="w-full sm:w-auto px-6 py-3 bg-[#d08700] text-black font-share-tech-mono uppercase rounded-none transition-colors hover:bg-[#e89600] flex items-center justify-center cursor-pointer"
          >
            Continue to Vesting
            <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
