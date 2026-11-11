import { useState } from 'react';
import { register, saveSession } from '../../api/authApi';
import { authErrorMessage } from '../../utils/authErrors';
import { passwordStrength, validateRegister } from '../../utils/authValidation';
import AuthAlert from './AuthAlert';
import AuthField from './AuthField';
import AuthSubmit from './AuthSubmit';

const STRENGTH_COLOR = ['bg-surface-container-high', 'bg-red-500', 'bg-amber-400', 'bg-sky-400', 'bg-emerald-500'];

/** Đăng ký bằng tên đăng nhập, email và mật khẩu; đăng ký xong là đăng nhập luôn. */
export default function RegisterForm({ onAuthenticated }) {
  const [values, setValues] = useState({ username: '', email: '', password: '' });
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [failures, setFailures] = useState(0);

  const live = validateRegister(values);
  const strength = passwordStrength(values.password);
  const errorOf = (name) => serverErrors[name] || (touched[name] ? live[name] : undefined);

  const set = (name) => (event) => {
    setValues((v) => ({ ...v, [name]: event.target.value }));
    setServerErrors((s) => (s[name] ? { ...s, [name]: undefined } : s));
  };
  const blur = (name) => () => setTouched((t) => ({ ...t, [name]: true }));

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setTouched({ username: true, email: true, password: true });
    if (Object.keys(live).length > 0) return;
    setSubmitting(true);
    try {
      const session = saveSession(
        await register({ username: values.username.trim(), email: values.email.trim(), password: values.password })
      );
      onAuthenticated?.(session);
    } catch (err) {
      if (err.code === 'USERNAME_TAKEN') setServerErrors({ username: authErrorMessage(err) });
      else if (err.code === 'EMAIL_TAKEN') setServerErrors({ email: authErrorMessage(err) });
      else {
        setError(authErrorMessage(err));
        setFailures((n) => n + 1);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <AuthField
        id="register-username"
        label="Tên đăng nhập"
        icon="person"
        value={values.username}
        onChange={set('username')}
        onBlur={blur('username')}
        error={errorOf('username')}
        autoComplete="username"
        autoFocus
      />
      <AuthField
        id="register-email"
        label="Email"
        icon="mail"
        type="email"
        value={values.email}
        onChange={set('email')}
        onBlur={blur('email')}
        error={errorOf('email')}
        autoComplete="email"
      />

      <div>
        <AuthField
          id="register-password"
          label="Mật khẩu"
          icon="lock"
          type={showPassword ? 'text' : 'password'}
          value={values.password}
          onChange={set('password')}
          onBlur={blur('password')}
          error={errorOf('password')}
          autoComplete="new-password"
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
        {values.password && (
          <div className="mt-2.5 px-1">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${n <= strength.score ? STRENGTH_COLOR[strength.score] : 'bg-surface-container-high'}`}
                />
              ))}
              <span className="ml-1 w-12 text-right text-[11px] font-medium text-secondary">{strength.label}</span>
            </div>
          </div>
        )}
      </div>


      {error && <AuthAlert shakeKey={failures}>{error}</AuthAlert>}

      <AuthSubmit loading={submitting} loadingText="Đang tạo tài khoản...">Tạo tài khoản</AuthSubmit>
    </form>
  );
}
