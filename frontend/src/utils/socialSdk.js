/**
 * Nạp SDK đăng nhập Google và Facebook và lấy access token ở trình duyệt.
 * Backend mới là nơi xác minh token (xem GoogleTokenVerifier, FacebookTokenVerifier).
 * Cửa sổ đăng nhập chỉ mở được khi gọi trực tiếp trong lúc bấm nút, nên SDK được nạp sẵn (prepare...)
 * ngay khi trang mở, còn request... được gọi thẳng trong sự kiện bấm.
 */

export class SocialSdkError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'SocialSdkError';
    this.code = code;
  }
}

const scripts = new Map();

function loadScript(src, id) {
  if (scripts.has(src)) return scripts.get(src);
  const promise = new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.id = id;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      scripts.delete(src);
      el.remove();
      reject(new SocialSdkError('SDK_LOAD_FAILED'));
    };
    document.head.appendChild(el);
  });
  scripts.set(src, promise);
  return promise;
}

// ---------------------------------------------------------------- Google

let google = null; // { clientId, client, pending }

export async function prepareGoogle(clientId) {
  await loadScript('https://accounts.google.com/gsi/client', 'google-gsi');
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new SocialSdkError('SDK_LOAD_FAILED');
  if (google?.clientId === clientId) return;
  const state = { clientId, client: null, pending: null };
  state.client = oauth2.initTokenClient({
    client_id: clientId,
    scope: 'openid email profile',
    callback: (response) => {
      const pending = state.pending;
      state.pending = null;
      if (!pending) return;
      if (response?.access_token) pending.resolve(response.access_token);
      else pending.reject(new SocialSdkError('POPUP_CLOSED'));
    },
    error_callback: (error) => {
      const pending = state.pending;
      state.pending = null;
      if (!pending) return;
      pending.reject(new SocialSdkError(error?.type === 'popup_failed_to_open' ? 'POPUP_BLOCKED' : 'POPUP_CLOSED'));
    },
  });
  google = state;
}

/** Gọi trực tiếp trong sự kiện bấm nút, sau khi prepareGoogle đã xong. */
export function requestGoogleToken() {
  if (!google) return Promise.reject(new SocialSdkError('SDK_LOAD_FAILED'));
  const state = google;
  return new Promise((resolve, reject) => {
    state.pending = { resolve, reject };
    state.client.requestAccessToken({ prompt: 'select_account' });
  });
}

// ---------------------------------------------------------------- Facebook

let facebookAppId = null;

export async function prepareFacebook(appId) {
  await loadScript('https://connect.facebook.net/vi_VN/sdk.js', 'facebook-jssdk');
  if (!window.FB) throw new SocialSdkError('SDK_LOAD_FAILED');
  if (facebookAppId === appId) return;
  window.FB.init({ appId, cookie: false, xfbml: false, version: 'v23.0' });
  facebookAppId = appId;
}

/** Gọi trực tiếp trong sự kiện bấm nút, sau khi prepareFacebook đã xong. */
export function requestFacebookToken() {
  return new Promise((resolve, reject) => {
    if (!window.FB || !facebookAppId) {
      reject(new SocialSdkError('SDK_LOAD_FAILED'));
      return;
    }
    window.FB.login(
      (response) => {
        const token = response?.authResponse?.accessToken;
        if (token) resolve(token);
        else reject(new SocialSdkError('POPUP_CLOSED'));
      },
      { scope: 'public_profile,email' }
    );
  });
}
