import React from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

interface WizardNavProps {
  wizardStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
}

export function WizardNav({ wizardStep, totalSteps, onNext, onBack }: WizardNavProps) {
  const isFirst = wizardStep === 0;
  const isLast = wizardStep === totalSteps - 1;

  return (
    <div className="flex justify-between items-center pt-2 pb-4 px-1">
      {/* Back Button */}
      <div className="flex justify-start min-w-[100px]">
        {!isFirst && (
          <button
            type="button"
            onClick={onBack}
            className="wizard-btn wizard-btn-back"
          >
            <ArrowLeft size={16} className="wizard-btn-icon" />
            Back
          </button>
        )}
      </div>

      {/* Next / Finish Button */}
      <div className="flex justify-end min-w-[100px]">
        {isLast ? (
          <button
            type="button"
            onClick={onNext}
            className="wizard-btn wizard-btn-finish"
          >
            <Check size={16} className="wizard-btn-icon" />
            Finish
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="wizard-btn wizard-btn-next"
          >
            Next
            <ArrowRight size={16} className="wizard-btn-icon" />
          </button>
        )}
      </div>
    </div>
  );
}
