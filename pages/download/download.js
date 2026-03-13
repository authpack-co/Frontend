document.addEventListener('DOMContentLoaded', () => {
    const isDev = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    const serverURL = isDev ? 'http://127.0.0.1:3000' : 'https://api.authpack.co';

    // Check auth and populate navbar
    fetch(serverURL + '/api/users/info', { credentials: 'include' })
        .then(res => {
            if (!res.ok) return;
            return res.json();
        })
        .then(data => {
            if (!data || !data.data) return;

            const avatar = document.querySelector('.lp-nav-avatar');
            if (avatar && data.data.picture) avatar.src = data.data.picture;
            document.body.classList.add('user-logged-in');
        })
        .catch(() => { /* not logged in */ });
});
