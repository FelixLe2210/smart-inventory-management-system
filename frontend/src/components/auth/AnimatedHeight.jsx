import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Bọc nội dung đổi kích thước (đổi tab, hiện lỗi, sang bước nhập mã) để chiều cao thay đổi mượt thay vì giật.
 * Vùng đệm 8px quanh nội dung để vòng sáng khi focus của ô nhập không bị cắt (bù lại bằng lề âm 8px,
 * nên không đặt lề bằng class cho phần tử này; hãy bọc ngoài nếu cần khoảng cách).
 */
export default function AnimatedHeight({ children, className = '' }) {
  const innerRef = useRef(null);
  const [height, setHeight] = useState('auto');

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const update = () => setHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`auth-height ${className}`}
      style={{ height, boxSizing: 'content-box', margin: -8, padding: 8, overflow: 'hidden' }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
}
