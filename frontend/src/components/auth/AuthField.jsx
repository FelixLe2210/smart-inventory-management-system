/**
 * Ô nhập có nhãn nổi: nhãn nằm trong ô, thu nhỏ lên trên khi bấm vào hoặc đã có chữ.
 * `right` là phần phụ bên phải (ví dụ nút hiện mật khẩu). Lỗi hiện ngay dưới ô.
 */
export default function AuthField({ id, label, icon, error, right, className = '', ...input }) {
  const border = error
    ? 'border-error focus:border-error focus:ring-error/15'
    : 'border-outline-variant focus:border-primary focus:ring-primary/15';
  const left = icon ? 'pl-11' : 'pl-4';
  return (
    <div className={className}>
      <div className="auth-field group relative">
        {icon && (
          <span
            className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[19px] text-outline transition-colors duration-200 group-focus-within:text-primary"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <input
          id={id}
          placeholder=" "
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`peer h-[52px] w-full rounded-xl border bg-surface-container-lowest pb-1 pt-5 ${left} ${right ? 'pr-12' : 'pr-4'} text-[14px] text-on-surface outline-none transition-[border-color,box-shadow] duration-200 focus:ring-4 ${border}`}
          {...input}
        />
        <label
          htmlFor={id}
          className={`pointer-events-none absolute top-0 origin-left translate-y-[16px] text-[14px] text-secondary transition-[transform,color] duration-200 ease-out peer-focus:translate-y-[7px] peer-focus:scale-[0.8] peer-focus:text-primary peer-[:not(:placeholder-shown)]:translate-y-[7px] peer-[:not(:placeholder-shown)]:scale-[0.8] ${icon ? 'left-11' : 'left-4'}`}
        >
          {label}
        </label>
        {right && <div className="absolute right-2 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 pl-1 text-[12px] text-error">
          {error}
        </p>
      )}
    </div>
  );
}
