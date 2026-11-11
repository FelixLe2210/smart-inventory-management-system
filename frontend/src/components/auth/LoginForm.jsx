import { useEffect, useState } from 'react';
import { login, saveSession } from '../../api/authApi';
import { authErrorMessage } from '../../utils/authErrors';
import AuthAlert from './AuthAlert';
import AuthField from './AuthField';
import AuthSubmit from './AuthSubmit';

/** Đăng nhập bằng tên đăng nhập hoặc email và mật khẩu. */
export default function LoginForm({ onAuthenticated, prefill }) {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [failures, setFailures] = useState(0);

  // Chip tài khoản mẫu (chỉ khi chạy dev) điền sẵn tên và mật khẩu.
  useEffect(() => {
    if (!prefill) return;
    setIdentity(prefill.identity);
    setPassword(prefill.password);
    setError(null);
  }, [prefill]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const session = saveSession(await login(identity.trim(), password));
      onAuthenticated?.(session);
    } catch (err) {
      setError(authErrorMessage(err, 'Không đăng nhập được. Kiểm tra lại tên đăng nhập và mật khẩu.'));
      setFailures((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthField
        id="login-identity"
        label="Tên đăng nhập hoặc email"
        icon="person"
        type="text"
        value={identity}
        onChange={(e) => setIdentity(e.target.value)}
        required
        autoComplete="username"
        autoFocus
      />
      <AuthField
        id="login-password"
        label="Mật khẩu"
        icon="lock"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
        right={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="grid h-8 w-8 place-items-center rounded-md text-secondary transition-colors hover:bg-surface-container-low hover:text-on-surface"
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        }
      />

      {error && <AuthAlert shakeKey={failures}>{error}</AuthAlert>}

      <AuthSubmit loading={submitting} loadingText="Đang đăng nhập...">Đăng nhập</AuthSubmit>
    </form>
  );
}
