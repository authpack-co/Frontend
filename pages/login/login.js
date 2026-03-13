const IS_DEV = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';

const GOOGLE_AUTH_URL = IS_DEV
    ? 'http://127.0.0.1:3000/api/auth/google'
    : 'https://api.authpack.co/api/auth/google';

const SERVER_URL = IS_DEV
    ? 'http://127.0.0.1:3000'
    : 'https://api.authpack.co';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Read redirect param from URL
    const params = new URLSearchParams(window.location.search);
    const redirectPath = params.get('redirect') || '/pages/dashboard/';

    // 2. Check if user is already logged in
    try {
        const res = await fetch(SERVER_URL + '/api/auth/', { credentials: 'include' });
        if (res.ok) {
            // Already logged in — redirect to target page
            window.location.replace(redirectPath);
            return;
        }
    } catch (e) { /* not logged in, continue */ }

    // 3. Login button action — pass redirect param to Google OAuth
    const loginBtn = document.getElementById('btn-login-google');
    if (loginBtn) {
        const authUrl = GOOGLE_AUTH_URL + '?redirect=' + encodeURIComponent(redirectPath);
        loginBtn.addEventListener('click', () => {
            window.location.href = authUrl;
        });
    }
});
