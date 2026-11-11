import { useEffect, useState } from 'react';
import { loginWithFacebook, loginWithGoogle, saveSession } from '../../api/authApi';
import { authErrorMessage } from '../../utils/authErrors';
import { prepareFacebook, prepareGoogle, requestFacebookToken, requestGoogleToken } from '../../utils/socialSdk';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l4.01-3.1z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.02 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.09 24 12.07z"
      />
    </svg>
  );
}

function PhoneIcon() {
  return <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">smartphone</span>;
}

const buttonClass =
  'inline-flex h-12 min-w-0 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface transition duration-200 hover:-translate-y-0.5 hover:border-outline hover:bg-surface-container-low hover:shadow-card active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Hàng nút đăng nhập nhanh: Google, Facebook, số điện thoại.
 * Cấu hình (client id, app id) lấy từ backend; chưa cấu hình thì bấm vào sẽ giải thích cần làm gì.
 */
export default function SocialButtons({ providers, providersFailed, onAuthenticated, onPhone, onNotice }) {
  const [busy, setBusy] = useState(null); // 'google' | 'facebook' | null
  const [ready, setReady] = useState({ google: false, facebook: false });

  const googleId = providers?.googleClientId || null;
  const facebookId = providers?.facebookAppId || null;

  // Nạp sẵn SDK để cửa sổ đăng nhập mở được ngay khi bấm (trình duyệt chỉ cho mở cửa sổ trong lúc bấm).
  useEffect(() => {
    let alive = true;
    if (googleId) {
      prepareGoogle(googleId)
        .then(() => alive && setReady((r) => ({ ...r, google: true })))
        .catch(() => {});
    }
    if (facebookId) {
      prepareFacebook(facebookId)
        .then(() => alive && setReady((r) => ({ ...r, facebook: true })))
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [googleId, facebookId]);

  async function run(name, label, configured, isReady, getToken, exchange) {
    onNotice(null);
    if (providersFailed) {
      onNotice({ kind: 'error', text: authErrorMessage({ code: 'NETWORK_ERROR' }) });
      return;
    }
    if (!configured) {
      onNotice({
        kind: 'info',
        text: `${label} chưa được cấu hình (xem docs/AUTH_SETUP.md).`,
      });
      return;
    }
    if (!isReady) {
      onNotice({ kind: 'info', text: `Đang tải ${label}, thử lại sau giây lát.` });
      return;
    }
    setBusy(name);
    try {
      const token = await getToken();
      const session = saveSession(await exchange(token));
      onAuthenticated(session);
    } catch (err) {
      onNotice({ kind: err.code === 'POPUP_CLOSED' ? 'info' : 'error', text: authErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  const spinner = <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span>;

  return (
    <div className="grid grid-cols-3 gap-2.5">
      <button
        type="button"
        className={buttonClass}
        aria-label="Tiếp tục với Google"
        title="Google"
        disabled={busy !== null}
        onClick={() => run('google', 'Google', !!googleId, ready.google, requestGoogleToken, loginWithGoogle)}
      >
        {busy === 'google' ? spinner : <GoogleIcon />}
      </button>
      <button
        type="button"
        className={buttonClass}
        aria-label="Tiếp tục với Facebook"
        title="Facebook"
        disabled={busy !== null}
        onClick={() => run('facebook', 'Facebook', !!facebookId, ready.facebook, requestFacebookToken, loginWithFacebook)}
      >
        {busy === 'facebook' ? spinner : <FacebookIcon />}
      </button>
      <button type="button" className={buttonClass} aria-label="Tiếp tục với số điện thoại" title="Số điện thoại" disabled={busy !== null} onClick={onPhone}>
        <PhoneIcon />
      </button>
    </div>
  );
}
