/** Nút gửi biểu mẫu có trạng thái đang xử lý. */
export default function AuthSubmit({ loading, loadingText, children, disabled, ...rest }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-on-primary transition duration-200 hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      {...rest}
    >
      {loading && <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span>}
      {loading ? loadingText : children}
    </button>
  );
}
