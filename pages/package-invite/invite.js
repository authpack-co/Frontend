/* ============================================================================
   AuthPack — Package Invite (solicitação de acesso)

   O link do pacote não dá acesso: dá a chance de pedir. Quem abre vê o que tem
   dentro e manda uma solicitação; o dono aprova no painel dele. Esta tela cobre
   os quatro desfechos disso — link quebrado, pedido a fazer, pedido já feito e
   acesso que a pessoa já tinha.
   ============================================================================ */

(function () {
    'use strict';

    const stateLoading = document.getElementById('state-loading');
    const stateError = document.getElementById('state-error');
    const stateInvite = document.getElementById('state-invite');
    const stateSent = document.getElementById('state-sent');
    const stateOwned = document.getElementById('state-owned');

    // Nome do dono, guardado do preview para a tela de "solicitação enviada".
    let ownerName = 'o dono';

    function show(el) {
        [stateLoading, stateError, stateInvite, stateSent, stateOwned].forEach(s => s.classList.add('hidden'));
        el.classList.remove('hidden');
        // re-trigger CSS animations by reflowing
        // eslint-disable-next-line no-unused-expressions
        void el.offsetWidth;
    }

    function getInviteKey() {
        const params = new URLSearchParams(window.location.search);
        return (params.get('key') || '').trim();
    }

    function renderStack(sessions) {
        const stack = document.getElementById('stack-preview');
        stack.innerHTML = '';
        if (!sessions || sessions.length === 0) return;
        const preview = sessions.slice(0, 5);
        preview.forEach(s => {
            const av = document.createElement('span');
            av.className = 'inv-stack-av';
            const img = document.createElement('img');
            img.alt = s.name || '';
            AuthPackFavicon.apply(img, {
                icon: s.icon, url: s.url,
                onFinalError: () => {
                    img.style.display = 'none';
                    av.textContent = (s.name || '?').charAt(0).toUpperCase();
                }
            });
            av.appendChild(img);
            stack.appendChild(av);
        });
        const remaining = sessions.length - preview.length;
        if (remaining > 0) {
            const more = document.createElement('span');
            more.className = 'inv-stack-more';
            more.textContent = `+${remaining} ${remaining === 1 ? 'serviço' : 'serviços'}`;
            stack.appendChild(more);
        } else if (sessions.length > 0) {
            const more = document.createElement('span');
            more.className = 'inv-stack-more';
            more.textContent = `${sessions.length} ${sessions.length === 1 ? 'serviço' : 'serviços'}`;
            stack.appendChild(more);
        }
    }

    function initials(name) {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    function renderOwner(owner) {
        const avatar = document.getElementById('owner-avatar');
        const nameEl = document.getElementById('owner-name');
        ownerName = owner.name || 'Alguém';
        nameEl.textContent = ownerName;
        avatar.textContent = '';
        if (owner.picture) {
            const img = document.createElement('img');
            img.src = owner.picture;
            img.alt = owner.name || '';
            img.onerror = function () {
                this.remove();
                avatar.textContent = initials(owner.name);
            };
            avatar.appendChild(img);
        } else {
            avatar.textContent = initials(owner.name);
        }
    }

    function showError(message) {
        if (message) {
            document.getElementById('error-desc').textContent = message;
        }
        show(stateError);
    }

    /* ── Desfechos ──────────────────────────────────────────────────────── */

    // Pedido registrado. `alreadyPending` separa o pedido feito agora do que já
    // estava esperando desde antes — o segundo caso não é uma novidade para
    // quem chega, e dizer "enviada" de novo soaria como se algo tivesse mudado.
    function showSent(pkgName, alreadyPending) {
        document.getElementById('sent-pkg-name').textContent = pkgName || 'este pacote';
        document.getElementById('sent-owner-name').textContent = ownerName;
        document.getElementById('sent-title').textContent = alreadyPending
            ? 'Seu pedido está com o dono'
            : 'Solicitação enviada';
        show(stateSent);
    }

    // Dono ou membro abrindo o próprio link: não há o que pedir, o destino é o
    // pacote.
    function showAlreadyOwns(pkgName, pkgId) {
        document.getElementById('owned-pkg-name').textContent = pkgName || 'Pacote';
        const qs = pkgId ? `?package=${encodeURIComponent(pkgId)}` : '';
        document.getElementById('owned-cta').href = `/pages/dashboard/${qs}`;
        show(stateOwned);
        setTimeout(() => { window.location.href = `/pages/dashboard/${qs}`; }, 2600);
    }

    /* ── Flow ───────────────────────────────────────────────────────────── */
    async function loadPreview(key) {
        // O preview é público; a situação da pessoa (já é membro? já pediu?) só
        // faz sentido logada. As duas rodam juntas para não somar latência antes
        // do primeiro render.
        const [res, auth] = await Promise.all([
            fetchManager.getInvitePreview(key),
            fetchManager.getAuthenticatedUser(),
        ]);

        if (!res.ok) {
            const msg = res.result && res.result.errorMessage
                ? res.result.errorMessage
                : 'Não foi possível carregar este link.';
            return showError(msg);
        }
        const { package: pkg, owner } = res.result.data;

        document.getElementById('package-name').textContent = pkg.name;
        renderStack(pkg.sessions);
        renderOwner(owner);

        if (auth.ok) {
            const status = await fetchManager.getInviteStatus(key);
            const data = status.ok && status.result ? status.result.data : null;
            if (data && data.hasAccess) return showAlreadyOwns(pkg.name, pkg.id);
            if (data && data.request && data.request.status === 'pending') {
                return showSent(pkg.name, true);
            }
        }

        show(stateInvite);
    }

    async function requestAccess(key) {
        const btn = document.getElementById('activate-btn');
        const spinner = document.getElementById('activate-spinner');

        btn.classList.add('loading');
        btn.disabled = true;
        spinner.hidden = false;

        // 1. Sem login não há a quem atribuir o pedido — manda logar e volta.
        const auth = await fetchManager.getAuthenticatedUser();
        if (!auth.ok) {
            const here = window.location.pathname + window.location.search;
            window.location.href = `/pages/login/?redirect=${encodeURIComponent(here)}`;
            return;
        }

        // 2. Pede.
        const res = await fetchManager.requestPackageAccess(key);
        btn.classList.remove('loading');
        btn.disabled = false;
        spinner.hidden = true;

        if (!res.ok) {
            const msg = res.result && res.result.errorMessage
                ? res.result.errorMessage
                : 'Não foi possível enviar sua solicitação.';
            return showError(msg);
        }

        const data = res.result.data;
        const pkgName = data.package && data.package.name ? data.package.name : 'Pacote';
        const pkgId = data.package && data.package.id;

        // Rede de segurança do preview: quem chegou aqui deslogado e logou no
        // meio do caminho só descobre a posse na resposta do pedido.
        if (data.alreadyOwns) return showAlreadyOwns(pkgName, pkgId);

        if (data.owner && data.owner.name) ownerName = data.owner.name;
        showSent(pkgName, data.alreadyPending);
    }

    /* ── Boot ───────────────────────────────────────────────────────────── */
    const key = getInviteKey();
    if (!key) {
        showError('Link ausente ou inválido.');
        return;
    }

    document.getElementById('activate-btn').addEventListener('click', () => requestAccess(key));

    loadPreview(key);
})();
