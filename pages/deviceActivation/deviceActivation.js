// Initialize the agent on page load.
const fpPromise = import('https://api.authpack.co/web/v3/WhjnKdImdrIFK4nCzKLI')
    .then(FingerprintJS => FingerprintJS.load({
        endpoint: [
            "https://api.authpack.co",
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

// Handlers de ação (você implementará a lógica posteriormente)
function handleSuccessAction() {
    console.log('Sucesso: Continuar clicado');
    // Sua lógica aqui
}

function handleRetry() {
    console.log('Tentando novamente...');
    const container = document.getElementById('activationContainer');
    setElementState(container, 'loading');
    // Sua lógica de retry aqui
}

function handleCancel() {
    console.log('Cancelado');
    // Sua lógica de cancelamento aqui
}

window.addEventListener("message", async (event) => {
    if (event.data?.source !== "authpack-extension") return;

    if (event.data.type === "authpack:getFingerprint") {
        const fp = await fpPromise;
        const result = await fp.get({ extendedResult: true });

        // Envia fingerprint de volta
        window.postMessage({
            source: "authpack-page",
            type: "authpack:fingerprintResponse",
            fingerprint: result
        });
    } else if (event.data.type === "authpack:activationStatus") {
        const { fetchResult } = event.data;
        const { ok } = fetchResult;

        const container = document.getElementById('activationContainer');

        if (ok) {
            setElementState(container, 'success');

            setTimeout(() => window.location.href = "/", 1000)
        } else {
            setElementState(container, 'error');
        }
    }
});


// Simular sucesso após 3 segundos
// setTimeout(() => {
//     const container = document.getElementById('activationContainer');
//     setElementState(container, 'success');
// }, 3000);

// Simular erro após 3 segundos
// setTimeout(() => {
//     const container = document.getElementById('activationContainer');
//     setElementState(container, 'error');
// }, 3000);