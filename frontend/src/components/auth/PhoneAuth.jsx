import { useEffect, useRef, useState } from 'react';
import { requestPhoneOtp, saveSession, verifyPhoneOtp } from '../../api/authApi';
import { authErrorMessage } from '../../utils/authErrors';
import { formatPhone, normalizePhone } from '../../utils/authValidation';
import AuthAlert from './AuthAlert';
import AuthField from './AuthField';
import AuthSubmit from './AuthSubmit';
import OtpInput from './OtpInput';

/**
 * Đăng nhập / đăng ký bằng số điện thoại: nhập số, nhận mã 6 số, nhập mã.
 * Số chưa có tài khoản sẽ được tạo tài khoản ngay sau khi xác thực.
 */
export default function PhoneAuth({ enabled = true, onAuthenticated }) {
  const [step, setStep] = useState('phone'); // 'phone' | 'code'
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState(null); // E.164 sau khi gửi mã
  const [info, setInfo] = useState(null); // { devCode, expiresInSeconds }
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [failures, setFailures] = useState(0);
  const verifying = useRef(false);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  function fail(err) {
    setError(authErrorMessage(err));
    setFailures((n) => n + 1);
  }

  async function sendCode(target) {
    setError(null);
    setLoading(true);
    try {
      const result = await requestPhoneOtp(target);
      setPhone(result.phone);
      setInfo(result);
      setCountdown(result.resendAfterSeconds ?? 30);
      setCode('');
      setStep('code');
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmitPhone(event) {
    event.preventDefault();
    if (loading) return;
    const normalized = normalizePhone(phoneInput);
    if (!normalized) {
      fail({ code: 'INVALID_PHONE' });
      return;
    }
    sendCode(normalized);
  }

  async function verify(value) {
    if (verifying.current) return;
    verifying.current = true;
    setError(null);
    setLoading(true);
    try {
      const session = saveSession(await verifyPhoneOtp(phone, value));
      onAuthenticated?.(session);
    } catch (err) {
      fail(err);
      setCode('');
    } finally {
      verifying.current = false;
      setLoading(false);
    }
  }

  function handleCodeChange(value) {
    setCode(value);
    if (value.length === 6) verify(value);
  }

  if (!enabled) {
    return <AuthAlert kind="info">Đăng nhập bằng số điện thoại đang tắt.</AuthAlert>;
  }

  if (step === 'phone') {
    return (
      <form onSubmit={handleSubmitPhone} className="space-y-4" noValidate>
        <AuthField
          id="phone-number"
          label="Số điện thoại"
          icon="smartphone"
          type="tel"
          inputMode="tel"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          autoComplete="tel"
          autoFocus
        />
        {error && <AuthAlert shakeKey={failures}>{error}</AuthAlert>}
        <AuthSubmit loading={loading} loadingText="Đang gửi mã...">Gửi mã</AuthSubmit>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-secondary">
        Nhập mã gửi tới <strong className="font-semibold text-on-surface">{formatPhone(phone)}</strong>
      </p>

      <OtpInput value={code} onChange={handleCodeChange} disabled={loading} invalid={!!error} autoFocus />

      {info?.devCode && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-outline-variant px-3 py-2.5 text-[12px] text-secondary">
          <span>
            Dev: <strong className="font-semibold tracking-widest text-on-surface">{info.devCode}</strong>
          </span>
          <button
            type="button"
            onClick={() => handleCodeChange(info.devCode)}
            disabled={loading}
            className="shrink-0 rounded-md px-2 py-1 font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
          >
            Điền mã
          </button>
        </div>
      )}

      {error && <AuthAlert shakeKey={failures}>{error}</AuthAlert>}

      <div className="flex items-center justify-between text-[13px]">
        <button
          type="button"
          onClick={() => { setStep('phone'); setError(null); setCode(''); }}
          className="font-medium text-secondary transition-colors hover:text-on-surface"
        >
          Đổi số
        </button>
        <button
          type="button"
          onClick={() => sendCode(phone)}
          disabled={countdown > 0 || loading}
          className="font-semibold text-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {countdown > 0 ? `Gửi lại mã (${countdown}s)` : 'Gửi lại mã'}
        </button>
      </div>
    </div>
  );
}
