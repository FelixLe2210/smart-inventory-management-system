import { useEffect, useRef } from 'react';

/**
 * Sáu ô nhập mã xác thực: gõ số tự nhảy ô tiếp theo, Backspace lùi, dán cả mã một lần.
 * `value` là chuỗi số liền nhau (tối đa `length` ký tự).
 */
export default function OtpInput({ value, onChange, length = 6, disabled = false, invalid = false, autoFocus = false }) {
  const refs = useRef([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  // Sau khi nhập sai (ô bị khóa rồi mở lại và xóa trắng), đưa con trỏ về ô đầu để nhập lại ngay.
  useEffect(() => {
    if (!disabled && value === '' && document.activeElement === document.body) refs.current[0]?.focus();
  }, [disabled, value]);

  const focusAt = (i) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  function handleChange(i, event) {
    const digit = event.target.value.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    const next = (value.slice(0, i) + digit + value.slice(i + 1)).slice(0, length);
    onChange(next);
    focusAt(Math.min(next.length, length - 1));
  }

  function handleKeyDown(i, event) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (value[i]) {
        onChange(value.slice(0, i) + value.slice(i + 1));
        focusAt(i);
      } else if (i > 0) {
        onChange(value.slice(0, i - 1) + value.slice(i));
        focusAt(i - 1);
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusAt(i - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusAt(i + 1);
    }
  }

  function handlePaste(event) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    focusAt(pasted.length >= length ? length - 1 : pasted.length);
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label={`Mã xác thực ${length} số`}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={2}
          disabled={disabled}
          aria-label={`Số thứ ${i + 1}`}
          aria-invalid={invalid ? 'true' : undefined}
          className={`h-12 w-full min-w-0 rounded-lg border bg-surface-container-lowest text-center text-[20px] font-semibold text-on-surface outline-none transition-[border-color,box-shadow] duration-200 focus:ring-4 disabled:opacity-60 ${
            invalid
              ? 'border-error focus:border-error focus:ring-error/15'
              : value[i]
                ? 'border-primary focus:border-primary focus:ring-primary/15'
                : 'border-outline-variant focus:border-primary focus:ring-primary/15'
          }`}
        />
      ))}
    </div>
  );
}
