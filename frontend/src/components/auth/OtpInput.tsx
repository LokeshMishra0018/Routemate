import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  autoFocus = true,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split string into array of characters
  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      // Clear current digit
      const newDigits = [...digits];
      newDigits[index] = ' ';
      const newVal = newDigits.join('').trimEnd();
      onChange(newVal);
      return;
    }

    // Single or multi-character entered
    const char = raw[raw.length - 1]; // pick last typed digit
    const newDigits = [...digits];
    newDigits[index] = char;
    const newVal = newDigits.join('').trimEnd();
    onChange(newVal);

    // Auto advance to next input
    if (index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all digits filled
    const completedStr = newDigits.join('').replace(/\s/g, '');
    if (completedStr.length === length) {
      onComplete?.(completedStr);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index] === ' ' || !digits[index]) {
        // If current cell is empty, backspace moves to previous cell
        if (index > 0 && inputRefs.current[index - 1]) {
          inputRefs.current[index - 1]?.focus();
        }
      } else {
        const newDigits = [...digits];
        newDigits[index] = ' ';
        onChange(newDigits.join('').trimEnd());
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pastedData) return;

    onChange(pastedData);

    const focusIndex = Math.min(pastedData.length, length - 1);
    if (inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex]?.focus();
    }

    if (pastedData.length === length) {
      onComplete?.(pastedData);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 my-2" onPaste={handlePaste}>
      {Array.from({ length }, (_, i) => {
        const digit = digits[i] && digits[i] !== ' ' ? digits[i] : '';
        const isFilled = digit.length > 0;

        return (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-xl transition-all duration-200 focus:outline-none ${
              hasError
                ? 'bg-rose-950/40 border-2 border-rose-500/80 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : isFilled
                ? 'bg-indigo-950/50 border-2 border-indigo-500/80 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                : 'bg-slate-900/80 border border-slate-700 hover:border-slate-600 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
          />
        );
      })}
    </div>
  );
};
