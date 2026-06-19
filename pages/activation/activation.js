// Initialize the agent on page load.
const fpPromise = import('https://fp.authpack.co/web/v3/WhjnKdImdrIFK4nCzKLI')
    .then(FingerprintJS => FingerprintJS.load({
        endpoint: [
            "https://fp.authpack.co",
            FingerprintJS.defaultEndpoint
        ]
    }))



// Função para alterar estado
function setElementState(element, newState) {
    // Remove todas as classes que terminam com "-state"
    element.classList.forEach(cls => {
        if (cls.endsWith("-state")) element.classList.remove(cls);
    });

    // Adiciona o novo estado
    element.classList.add(`${newState}-state`);
}

// Em qualquer erro (limite de dispositivos, erro desconhecido, etc.) não faz sentido
// repetir — provavelmente falharia de novo. Leva o usuário de volta para o início.
function goHome() {
    window.location.href = "/pages/dashboard/";
}

// Preenche a tela "Conectando" com a conta que está sendo ativada (foto + nome + email).
// A autenticação já foi garantida pelo guard no <head>, então essa busca é rápida.
async function renderConnectingAccount() {
    try {
        const res = await fetchManager.getAuthenticatedUser();
        if (!res.ok) return;

        const user = res.result.data;
        const nameEl = document.getElementById('connectName');
        const emailEl = document.getElementById('connectEmail');
        const avatarImg = document.getElementById('connectAvatar');
        const avatarInitials = document.getElementById('connectAvatarInitials');

        if (nameEl) nameEl.textContent = user.name || 'sua conta';
        if (emailEl) emailEl.textContent = user.email || '';

        if (user.picture && avatarImg) {
            avatarImg.onload = () => {
                avatarImg.classList.remove('hidden');
                if (avatarInitials) avatarInitials.classList.add('hidden');
            };
            // Se a foto falhar ao carregar, mantém as iniciais como fallback
            avatarImg.onerror = () => {
                avatarImg.classList.add('hidden');
                if (avatarInitials) avatarInitials.classList.remove('hidden');
            };
            avatarImg.src = user.picture;
        } else if (avatarInitials) {
            avatarInitials.textContent = (user.name || '?').trim().charAt(0).toUpperCase();
        }
    } catch (err) {
        // Mantém o placeholder genérico — não bloqueia a ativação
        console.error("[DeviceActivation] Failed to load account:", err);
    }
}

// ─── Main Activation Flow ───
// Order: 1. Extension flag (handled in HTML inline script)
//        2. Authentication check
//        3. Fingerprint + activation

async function startActivation() {
    const container = document.getElementById('activationContainer');

    // Mostra qual conta está sendo conectada (em paralelo com a ativação)
    renderConnectingAccount();

    try {
        // Get fingerprint
        const fp = await fpPromise;
        const result = await fp.get({ extendedResult: true });
        const { visitorId, requestId } = result;

        // Call backend activation endpoint
        const fetchResult = await fetchManager.activateDevice({ visitorId, requestId });

        if (!fetchResult.ok) {
            const errorMsg = fetchResult.result?.errorMessage || "Erro desconhecido";

            const errorDesc = document.getElementById('errorDescription');
            if (errorDesc) errorDesc.textContent = errorMsg;

            setElementState(container, 'error');
            return;
        }

        // Activation successful — relay JWT to extension
        const jwt = fetchResult.result.data.jwt;

        window.postMessage({
            source: "authpack-page",
            type: "authpack:activationPayload",
            jwt
        });

        // Wait for extension confirmation (with timeout)
        const confirmed = await waitForExtensionConfirmation(5000);

        if (!confirmed) {
            const errorDesc = document.getElementById('errorDescription');
            if (errorDesc) errorDesc.textContent = "A extensão não confirmou o armazenamento. Tente novamente.";
            setElementState(container, 'error');
            return;
        }

        // Success!
        setElementState(container, 'success');
        setTimeout(() => window.location.href = "/pages/dashboard/", 1500);

    } catch (err) {
        console.error("[DeviceActivation] Error:", err);
        setElementState(container, 'error');
    }
}

function waitForExtensionConfirmation(timeoutMs) {
    return new Promise((resolve) => {
        let resolved = false;

        const handler = (event) => {
            if (event.data?.source !== "authpack-extension") return;

            if (event.data.type === "authpack:payloadStored") {
                resolved = true;
                window.removeEventListener("message", handler);
                resolve(event.data.success === true);
            }
        };

        window.addEventListener("message", handler);

        setTimeout(() => {
            if (!resolved) {
                window.removeEventListener("message", handler);
                resolve(false);
            }
        }, timeoutMs);
    });
}

// ─── Page Load: Start Activation ───
// Auth is guaranteed by the block-style guard in the HTML <head>.

document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById('activationContainer');
    setElementState(container, 'connecting');
    await startActivation();
});