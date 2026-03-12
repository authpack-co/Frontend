// Initialize the agent on page load.
const fpPromise = import('https://fp.authpack.co/web/v3/WhjnKdImdrIFK4nCzKLI')
    .then(FingerprintJS => FingerprintJS.load({
        endpoint: [
            "https://fp.authpack.co",
            FingerprintJS.defaultEndpoint
        ]
    }))

const googleLoginBase = IS_DEV ? "http://127.0.0.1:3000/api/auth/google" : "https://api.authpack.co/api/auth/google";
const googleLoginUrl = `${googleLoginBase}?redirect=${encodeURIComponent("/pages/activation/")}`;

// Set Google login button href
const googleLoginBtn = document.getElementById('googleLoginBtn');
if (googleLoginBtn) {
    googleLoginBtn.href = googleLoginUrl;
}

// Função para alterar estado
function setElementState(element, newState) {
    // Remove todas as classes que terminam com "-state"
    element.classList.forEach(cls => {
        if (cls.endsWith("-state")) element.classList.remove(cls);
    });

    // Adiciona o novo estado
    element.classList.add(`${newState}-state`);
}

// Retry handler
function handleRetry() {
    const container = document.getElementById('activationContainer');
    setElementState(container, 'loading');
    startActivation();
}

// ─── Main Activation Flow ───
// Order: 1. Extension flag (handled in HTML inline script)
//        2. Authentication check
//        3. Fingerprint + activation

async function startActivation() {
    const container = document.getElementById('activationContainer');

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

// ─── Page Load: Check Auth → Start Activation ───

document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById('activationContainer');

    // Step 2: Check if user is authenticated
    const fetchUser = await fetchManager.getAuthenticatedUser();

    if (!fetchUser.ok) {
        // Not authenticated — show login state
        setElementState(container, 'login');
        return;
    }

    // User is authenticated — start activation
    setElementState(container, 'loading');
    await startActivation();
});