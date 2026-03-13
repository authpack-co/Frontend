let userData = null;

// Initialize the agent on page load.
const fpPromise = import('https://fp.authpack.co/web/v3/WhjnKdImdrIFK4nCzKLI')
    .then(FingerprintJS => FingerprintJS.load({
        endpoint: [
            "https://fp.authpack.co",
            FingerprintJS.defaultEndpoint
        ]
    }))

const signupLink = document.querySelectorAll(".signup-link");
signupLink.forEach(link => link.href = IS_DEV ? "http://127.0.0.1:3000/api/auth/google" : "https://api.authpack.co/api/auth/google");

const downloadButton = document.querySelector(".preset-logged .btn-download");
const downloadRoute = IS_DEV ? "http://127.0.0.1:3000/api/extensions/build/chrome" : "https://api.authpack.co/api/extensions/build/chrome";
downloadButton.addEventListener("click", () => downloadExtension(downloadRoute));

const manageDevicesButton = document.querySelector(".preset-logged .manageDevices");
manageDevicesButton.addEventListener("click", () => {
    const modal = document.getElementById("removeDeviceAccessModal");
    modal.classList.add("show");
});

const removeDeviceButton = document.querySelector("#removeDeviceAccessModal .btn-remove");
removeDeviceButton.addEventListener("click", () => handleRemoveDevice());

async function downloadExtension(route) {
    try {
        if (!userData) return;

        const fp = await fpPromise;
        const result = await fp.get({ extendedResult: true });
        const { visitorId, requestId } = result;

        const response = await fetch(route, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ visitorId, requestId })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Erro ao baixar:", error.errorMessage);

            if (error.errorMessage === "Limite de dispositivos atingido para esta conta") {
                const modal = document.getElementById("removeDeviceAccessModal");
                modal.classList.add("show");
            }

            return;
        }

        const blob = await response.blob(); // <- só sai daqui quando terminou de baixar

        // Tenta extrair o nome do arquivo do header "Content-Disposition"
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = "AuthPack.zip"; // fallback

        if (contentDisposition) {
            const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
            if (match && match[1]) {
                filename = match[1].replace(/['"]/g, '');
            }
        }

        // Cria o link temporário e dispara o download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        requestAnimationFrame(() => {
            const guide = document.querySelector(".installation-guide");
            if (guide) {
                guide.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    } catch (error) {
        console.error("Erro inesperado ao baixar:", error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const isExtensionPresent = document.documentElement.hasAttribute("data-authpack-active");

    if (isExtensionPresent) {
        const enterButtons = document.querySelectorAll(".enter-btn");
        enterButtons.forEach(btn => btn.parentElement.classList.remove("hidden"));
    }

    const fetchUser = await fetchManager.getAuthenticatedUser();

    if (!fetchUser.ok) return;

    userData = fetchUser.result.data;

    setUserData(userData);
    setElementState(document.body, "logged");
});

// Função para setar dados do usuário no html
function setUserData(userData) {
    const { email, name, picture, devices } = userData;

    const profileName = document.querySelector(".profile-name");
    const profilePictureImg = document.querySelector(".profile-picture img");

    profileName.textContent = name;
    profilePictureImg.src = picture;

    setupRemoveDeviceAccessModal(userData.devices);
}

// Setup do modal de remover dispositivos
function setupRemoveDeviceAccessModal(devices) {
    function getDeviceIconSVG(deviceType) {
        switch (deviceType) {
            case 'mobile':
                return `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                    <line x1="12" y1="18" x2="12.01" y2="18"></line>
                    <path d="M8 2v4M16 2v4" stroke-linecap="round"></path>
                </svg>
            `;

            case 'tablet':
                return `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                    <line x1="12" y1="18" x2="12" y2="18"/>
                </svg>
            `;

            case 'desktop':
            default:
                return `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
            `;
        }
    }

    function resetModal() {
        // Desmarca todos os radios
        modal.querySelectorAll(".radio-input").forEach(radio => radio.checked = false);
        modal.querySelectorAll(".device-item").forEach(item => item.classList.remove("selected"));
        removeBtn.classList.add("disabled");
    }

    const modal = document.getElementById("removeDeviceAccessModal");
    const deviceListContainer = modal.querySelector(".device-list-container");
    const deviceList = modal.querySelector(".device-list");
    const warningFull = modal.querySelector(".warning-full");
    const removeBtn = modal.querySelector(".btn-remove");

    // Limpa lista anterior
    deviceList.innerHTML = "";

    resetModal();

    if (devices.length === 0) {
        // Mostra estado vazio
        setElementState(deviceListContainer, "empty");
    } else {
        // Mostra lista normal
        setElementState(deviceListContainer, "content");
    }

    // Mostra warning de conta cheia se tiver 2 dispositivos
    if (devices.length >= 2) {
        warningFull.classList.remove("hidden");
    } else {
        warningFull.classList.add("hidden");
    }

    // Renderiza cada dispositivo
    devices.forEach((device, index) => {
        console.log(device)
        const deviceItem = document.createElement("div");
        deviceItem.className = "device-item";
        deviceItem.dataset.deviceId = device.id;

        // Formata a data
        const date = new Date(device.createdAt);
        const formattedDate = date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        deviceItem.innerHTML = `
            <div class="device-info">
                <div class="device-icon">
                    ${getDeviceIconSVG(device.device)}
                </div>
                <div class="device-details">
                    <div class="device-name"></div>
                    <div class="device-meta">
                        <span class="device-version"></span>
                        <span class="device-date"></span>
                    </div>
                </div>
            </div>
            <div class="device-actions">
                <div class="device-radio">
                    <input type="radio" name="device-select" id="device-${index}" class="radio-input">
                    <label for="device-${index}" class="radio-label"></label>
                </div>
            </div>
`;

        // Seta textos com textContent para segurança
        deviceItem.querySelector(".device-name").textContent = `${device.osName} • ${device.browserName}`;
        deviceItem.querySelector(".device-version").textContent = `v${device.version}`;
        deviceItem.querySelector(".device-date").textContent = `Registrado em ${formattedDate}`;

        deviceList.appendChild(deviceItem);

        // Event listener no radio button
        const radioInput = deviceItem.querySelector(".radio-input");

        // Event listener no device item inteiro
        deviceItem.addEventListener("click", () => {
            // Se já está selecionado, desmarca
            if (radioInput.checked) {
                radioInput.checked = false;
                deviceItem.classList.remove("selected");
                removeBtn.classList.add("disabled");
            } else {
                // Marca o radio
                radioInput.checked = true;

                // Remove selected de todos
                modal.querySelectorAll(".device-item").forEach(item => {
                    item.classList.remove("selected");
                });

                // Adiciona selected no item atual
                deviceItem.classList.add("selected");

                // Mostra warning de perigo e habilita botão
                removeBtn.classList.remove("disabled");
            }
        });
    });

    // Reset ao fechar o modal
    const cancelBtn = modal.querySelector(".cancel-btn");
    cancelBtn.addEventListener("click", () => {
        modal.classList.remove("show");

        resetModal();
    });
}

async function handleRemoveDevice() {
    const modal = document.getElementById("removeDeviceAccessModal");

    const selectedDeviceItem = modal.querySelector(".device-item.selected");
    if (!selectedDeviceItem) return;

    // Verifica se já está em estado de loading
    const buttonContent = modal.querySelector(".buttonContent");
    const isLoading = buttonContent.classList.contains("loading-state");

    if (isLoading) return;

    // Adiciona estado de loading
    setElementState(buttonContent, "loading");

    const deviceId = selectedDeviceItem.dataset.deviceId;

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    const response = await fetchManager.removeDevice(deviceId);

    if (!response.ok) {
        alert("Erro ao remover dispositivo. Tente novamente.");
        return;
    }

    // Remove estado de loading
    setElementState(buttonContent, "content");

    // Remove device do array userData.devices
    userData.devices = userData.devices.filter(device => device.id !== deviceId);

    // // Remove o item da lista no modal
    selectedDeviceItem.classList.add("fadeOut");

    // // Fecha o modal após a animação
    selectedDeviceItem.addEventListener("animationend", () => {
        setupRemoveDeviceAccessModal(userData.devices);
    }, { once: true });
}