const IS_DEV = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';

const GOOGLE_AUTH_URL = IS_DEV
    ? 'http://127.0.0.1:3000/api/auth/google'
    : 'https://api.authpack.co/api/auth/google';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Extension detection for the navbar
    const isExtensionActive = document.documentElement.hasAttribute('data-authpack-active');
    
    if (isExtensionActive) {
        document.body.classList.add('extension-detected');
    }

    // 2. Login button action
    const loginBtn = document.getElementById('btn-login-google');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = GOOGLE_AUTH_URL;
        });
    }
});
