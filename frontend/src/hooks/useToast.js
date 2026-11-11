import { useCallback, useEffect, useRef, useState } from 'react';

/** Toast tự tắt sau vài giây, dùng chung cho các trang. */
export function useToast(durationMs = 3500) {
  const [toast, setToast] = useState({ visible: false, text: '', icon: 'check_circle' });
  const timerRef = useRef(null);

  const show = useCallback(
    (text, icon = 'check_circle') => {
      clearTimeout(timerRef.current);
      setToast({ visible: true, text, icon });
      timerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), durationMs);
    },
    [durationMs]
  );

  useEffect(() => () => clearTimeout(timerRef.current), []);
  return { toast, showToast: show };
}
