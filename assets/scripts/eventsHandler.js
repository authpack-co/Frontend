const utils = {
    showModal(modalName, itemId) {
        const modal = document.getElementById(modalName + 'Modal');
        modal.classList.add('show');

        if (itemId) {
            modal.dataset.itemId = itemId;
        }
    },

    closeModals() {
        const modals = document.querySelectorAll(".modals .show");
        modals.forEach(item => {
            item.classList.remove("show");
            this.resetModal(item);
        });
    },

    resetModal(modal) {
        // Limpa erro no input
        this.clearInputError(modal);

        // Retorna botão para estado inicial
        const buttonContent = modal.querySelector(".buttonContent");

        if (buttonContent && !buttonContent.classList.contains("content-state")) setElementState(buttonContent, "content");
    },

    setModalError(modal, message) {
        const inputElement = modal.querySelector("input");
        const errorMessage = modal.querySelector(".error-message");

        if (inputElement) {
            inputElement.classList.add("invalid");
        }

        errorMessage.classList.remove("hidden");
        errorMessage.textContent = message;
    },

    clearInputError(modal) {
        const inputElement = modal.querySelector("input");
        const errorMessage = modal.querySelector(".error-message");

        if (inputElement) {
            inputElement.classList.remove("invalid");
        }

        if (errorMessage) {
            errorMessage.textContent = "";
            errorMessage.classList.add("hidden");
        }
    },

    toggleShareModalState() {
        const toggle = document.querySelector('.toggle-switch');
        const statusBadge = document.querySelector('#statusBadge');
        const statusText = statusBadge.querySelector('span');

        const isActive = toggle.classList.contains("active");

        if (isActive) {
            toggle.classList.remove('active');
            statusBadge.className = 'status-badge status-closed';
            statusText.textContent = 'Acesso Restrito';
        } else {
            toggle.classList.add('active');
            statusBadge.className = 'status-badge status-open';
            statusText.textContent = 'Acesso Público';
        }
    },

    validateField(value, config = {}) {
        const trimmed = value.trim();
        const type = config.type;

        // impede valores vazios
        if (!config.allowEmpty && trimmed.length === 0) {
            if (type === "name") {
                return { valid: false, reason: 'O nome não pode estar vazio.' };
            } else if (type === "key") {
                return { valid: false, reason: 'A chave não pode estar vazia.' };
            } else {
                return { valid: false, reason: 'Este campo não pode estar vazio.' };
            }
        }

        // checa tamanho mínimo
        if (config.minLength && trimmed.length < config.minLength) {
            return { valid: false, reason: `Mínimo de ${config.minLength} caracteres.` };
        }

        // checa tamanho máximo
        if (config.maxLength && trimmed.length > config.maxLength) {
            return { valid: false, reason: `Máximo de ${config.maxLength} caracteres.` };
        }

        // validações específicas por tipo de campo
        if (type === "name") {
            if (trimmed.length > 20) {
                return { valid: false, reason: "O nome deve ter no máximo 20 caracteres." };
            }

            if (/[<>/"'{};]/.test(trimmed)) {
                return { valid: false, reason: "O nome contém caracteres não permitidos." };
            }
        }

        if (type === "key") {
            const isUUIDv4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!isUUIDv4.test(trimmed)) {
                return { valid: false, reason: "Chave inválida." };
            }
        }

        return { valid: true };
    },

    getElementState(el) {
        const state = el.classList.endsWith("-state") ? el.classList.toString().split(" ").find(c => c.endsWith("-state")).replace("-state", "") : null;
        return state;
    }
}

// Dynamic Event Listeners ==========

const listenerMap = [
    { selector: '.options-btn', event: 'click', handler: handleToggleOptions },
    { selector: '.preset-collection .list-item', event: 'click', handler: handleListItemClick },
    { selector: '.edit-package-btn', event: 'click', handler: setupEditPackageForm },
    { selector: '.delete-package-btn', event: 'click', handler: setupDeletePackageForm },
    { selector: '.abort-package-access-btn', event: 'click', handler: setupAbortPackageAccessForm },
    { selector: '.remove-user-access-btn', event: 'click', handler: setupRemoveUserAccessForm },
    { selector: '.share-package-btn', event: 'click', handler: setupSharePackageForm },
    { selector: '.edit-session-btn', event: 'click', handler: setupEditSessionForm },
    { selector: '.delete-session-btn', event: 'click', handler: setupDeleteSessionForm },
    { selector: '.connect-session-btn', event: 'click', handler: handleConnectSession },
    { selector: '.list-item.user .details-btn', event: 'click', handler: showUserScreen },
    { selector: '.list-item.session .details-btn', event: 'click', handler: showSessionScreen }
];

const listenerSelectors = listenerMap.map(l => l.selector).join(',');

function processElement(el) {
    if (!(el instanceof HTMLElement) || el.dataset.listenersBound) return;
    el.dataset.listenersBound = 'true';

    for (const { selector, event, handler } of listenerMap) {
        if (el.matches(selector)) el.addEventListener(event, handler);
    }

    // Tratamentos especiais
    if (el.matches('.session-icon img')) {
        el.addEventListener('error', e => {
            e.target.src = chrome.runtime.getURL('popup/images/fallbackIcon.png');
        });
    }
}

function initExistingElements() {
    for (const { selector } of listenerMap) {
        document.querySelectorAll(selector).forEach(processElement);
    }
}

initExistingElements();

// Observa mudanças no DOM para aplicar listeners a novos elementos

const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (!(node instanceof HTMLElement)) continue;
            processElement(node);
            node.querySelectorAll?.(listenerSelectors).forEach(processElement);
        }
    }
});

observer.observe(document, { childList: true, subtree: true });


// Handlers dos eventos


function handleToggleOptions(e) {
    e.stopPropagation();
    const activePackageOptions = document.querySelectorAll('.package-options:not(.hidden)');
    activePackageOptions.forEach(packageOptions => {
        packageOptions.classList.add('hidden');
    });

    const packageOptions = e.currentTarget.nextElementSibling;
    packageOptions?.classList.toggle('hidden');
}

function handleListItemClick(e) {
    const clickedItem = e.target.closest('.list-item');
    if (!clickedItem) return;

    const isSession = clickedItem.classList.contains('session');
    const isExpanded = clickedItem.classList.contains('expanded');

    const itemsToCollapse = isSession
        ? document.querySelectorAll('.session')
        : document.querySelectorAll('.user');

    itemsToCollapse.forEach(i => i.classList.remove('expanded'));

    clickedItem.classList.toggle('expanded', !isExpanded);
}

async function handleRemoveUser(e) {
    e.stopPropagation();

    const removeUserAccessModal = document.querySelector('#removeUserAccessModal');
    const packageId = removeUserAccessModal.dataset.packageId;
    const userId = removeUserAccessModal.dataset.userId;

    const buttonContent = removeUserAccessBtn.closest('.buttonContent');

    // Verifica se já está em estado de loading (evita múltiplas ações)
    const isLoadingState = buttonContent.classList.contains("loading-state");

    if (isLoadingState) return;

    setElementState(buttonContent, "loading");

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Envia fetch para remover usuário do package
    const fetchRemoveUser = await fetchManager.removeUserFromPackage({ packageId, userId });

    if (!fetchRemoveUser.ok) {
        notify("error", "Não foi possível remover o usuário do pacote.");
        setElementState(buttonContent, "content");
        return;
    }

    // fecha modal
    utils.closeModals();

    // Remove usuário do array local de usuários do package
    const packageData = packagesList.userCollection.find(pkg => pkg.id == packageId);
    const userIdx = packageData.users.findIndex(user => user.id == userId);
    packageData.users.splice(userIdx, 1);

    // Atualiza stats do package em cache
    packageData.stats.totalUsers -= 1;

    // Notifica ação
    notify("success", "Usuário removido do pacote.");

    // Remove usuário da tela
    const userEl = document.querySelector("#package-details .users-panel .user[data-user-id='" + userId + "']");
    userEl.classList.add("fadeOut");

    userEl.addEventListener("animationend", () => {
        userEl.remove();

        // Renderiza package stats atualizados
        const periodSelected = document.querySelector(".usage-chart-container .chart-period-select option:checked").value;
        const period = periodSelected === "today" ? 1 : (periodSelected === "7days" ? 7 : 30);
        loadPackageStats(packageData, period);

        // Se não houver mais usuários, seta estado para empty
        if (packageData.users.length === 0) {
            const usersPanelContainer = document.querySelector("#package-details .users-panel-container");
            setElementState(usersPanelContainer, "empty");
        }
    }, { once: true });
}

async function handleConnectSession(e) {
    e.stopPropagation();

    function addURLParams(url, parameters) {
        // Verifique se há uma interrogação (?) na URL
        const separator = url.includes('?') ? '&' : '?';

        // Construa uma string com os novos parâmetros
        const newParameters = Object.keys(parameters).map(key => `${key}=${encodeURIComponent(parameters[key])}`).join('&');

        // Concatene a URL original com os novos parâmetros
        return `${url}${separator}${newParameters}`;
    }

    // Obtém detalhes do pacote e da sessão
    const packageEl = this.closest('#package-details');
    const packageId = packageEl.dataset.packageId;

    const sessionEl = this.closest('.session-card') || this.closest('.list-item.session');
    const sessionId = sessionEl.dataset.sessionId;

    const isAccess = sessionEl.closest('.preset-collection') ? false : true;

    const packageIdx = isAccess ? packagesList.userAccess.findIndex(pkg => pkg.id == packageId) : packagesList.userCollection.findIndex(pkg => pkg.id == packageId);
    const sessionData = isAccess ? packagesList.userAccess[packageIdx].sessions.find(session => session.id == sessionId) : packagesList.userCollection[packageIdx].sessions.find(session => session.id == sessionId);

    const sessionConnectUrl = sessionData.url;

    // redireciona para a URL de conexão da sessão
    const urlProcessced = addURLParams(sessionConnectUrl, { authpack_session_id: sessionId, authpack_package_id: packageId, authpack_is_acquired: isAccess });

    window.open(urlProcessced, '_blank');
}

function setupEditPackageForm(e) {
    e.stopPropagation();

    // Fecha modais abertos
    const activePackageOptions = document.querySelectorAll('.package-options:not(.hidden)');
    activePackageOptions.forEach(packageOptions => {
        packageOptions.classList.add('hidden');
    });

    const packageEl = this.closest('.access-item');
    const packageId = packageEl.dataset.packageId;
    const packageName = packageEl.querySelector(".access-title").textContent;

    const editPackageModal = document.querySelector("#editPackageModal");
    const editPackageInput = editPackageModal.querySelector("input");

    editPackageInput.value = packageName;

    utils.showModal("editPackage", packageId);

    editPackageModal.addEventListener('transitionend', () => {
        editPackageInput.focus();

        // coloca o cursor no final
        const len = editPackageInput.value.length;
        editPackageInput.setSelectionRange(len, len);
    }, { once: true });

}

function setupSharePackageForm(e) {
    e.stopPropagation();
    // Fecha modais abertos
    const activePackageOptions = document.querySelectorAll('.package-options:not(.hidden)');
    activePackageOptions.forEach(packageOptions => {
        packageOptions.classList.add('hidden');
    });

    const packageEl = this.closest('.access-item');
    const packageId = packageEl.dataset.packageId;

    const sharePackageModal = document.querySelector("#sharePackageModal");
    const inputName = sharePackageModal.querySelector(".modal-body .form-input.readonly");
    const keyValue = sharePackageModal.querySelector(".modal-body #keyValue");
    const statusBadge = sharePackageModal.querySelector(".status-badge");

    const packageData = packagesList.userCollection.find(pkg => pkg.id == packageId);
    const isOpen = packageData.open === 0 ? false : true;

    if (statusBadge.classList.contains("status-closed") && isOpen) {
        utils.toggleShareModalState();
    } else if (statusBadge.classList.contains("status-open") && !isOpen) {
        utils.toggleShareModalState();
    }

    inputName.value = packageData.name;
    keyValue.textContent = packageData.key;
    utils.showModal("sharePackage", packageId);
}

function setupDeletePackageForm(e) {
    e.stopPropagation();

    // Fecha modais abertos
    const activePackageOptions = document.querySelectorAll('.package-options:not(.hidden)');
    activePackageOptions.forEach(packageOptions => {
        packageOptions.classList.add('hidden');
    });

    const packageEl = this.closest('.access-item');
    const packageId = packageEl.dataset.packageId;
    const packageName = packageEl.querySelector(".access-title").textContent;

    const deletePackageModal = document.querySelector("#deletePackageModal");
    const dynamicTitle = deletePackageModal.querySelector(".modal-body .form-text strong");

    dynamicTitle.textContent = packageName;
    utils.showModal("deletePackage", packageId);
}

function setupAbortPackageAccessForm(e) {
    e.stopPropagation();

    // Fecha modais abertos 
    const activePackageOptions = document.querySelectorAll('.package-options:not(.hidden)');
    activePackageOptions.forEach(packageOptions => {
        packageOptions.classList.add('hidden');
    });

    const packageEl = this.closest('.access-item');
    const packageId = packageEl.dataset.packageId;
    const packageName = packageEl.querySelector(".access-title").textContent;

    const abortPackageModal = document.querySelector("#abortPackageAccessModal");
    const dynamicTitle = abortPackageModal.querySelector(".modal-body .form-text strong");

    dynamicTitle.textContent = packageName;
    utils.showModal("abortPackageAccess", packageId);
}

function setupRemoveUserAccessForm(e) {
    e.stopPropagation();

    const userEl = this.closest(".user");
    const userId = userEl.dataset.userId;
    const userName = userEl.querySelector(".item-name").textContent;

    const packageDetailsEl = document.querySelector("#package-details");
    const packageId = packageDetailsEl.dataset.packageId;

    const removeUserAccessModal = document.querySelector("#removeUserAccessModal");
    removeUserAccessModal.dataset.packageId = packageId;
    removeUserAccessModal.dataset.userId = userId;

    const dynamicTitle = removeUserAccessModal.querySelector(".modal-body .form-text strong");
    dynamicTitle.textContent = userName;
    utils.showModal("removeUserAccess");
}

function setupEditSessionForm(event) {
    event.stopPropagation();

    const sessionEl = this.closest(".session");
    const sessionId = sessionEl.dataset.sessionId;
    const sessionName = sessionEl.querySelector(".item-name").textContent;

    const editSessionModal = document.querySelector("#editSessionModal");
    const editSessionInput = editSessionModal.querySelector("input");

    editSessionInput.value = sessionName;

    utils.showModal("editSession", sessionId);

    editSessionModal.addEventListener('transitionend', () => {
        editSessionInput.focus();

        // coloca o cursor no final
        const len = editSessionInput.value.length;
        editSessionInput.setSelectionRange(len, len);
    }, { once: true });
}

function setupDeleteSessionForm(event) {
    event.stopPropagation();

    const sessionEl = this.closest(".session");
    const sessionId = sessionEl.dataset.sessionId;
    const sessionName = sessionEl.querySelector(".item-name").textContent;
    const deleteSessionModal = document.querySelector("#deleteSessionModal");
    const dynamicTitle = deleteSessionModal.querySelector(".modal-body .form-text strong");

    dynamicTitle.textContent = sessionName;
    utils.showModal("deleteSession", sessionId);
}

function showUserScreen(event) {
    event.stopPropagation();
    const userEl = this.closest(".user");
    const userId = userEl.dataset.userId;

    const packageDetails = document.querySelector("#package-details");
    const packageId = packageDetails.dataset.packageId;

    const screensContainer = document.querySelector(".screens-container");
    screensContainer.classList.add("show-next-screen");

    const secondaryScreenSection = screensContainer.querySelector(".screen-section.secondary");
    const presetUserOverview = secondaryScreenSection.querySelector(".preset-user-overview");
    presetUserOverview.dataset.userId = userId;

    setElementState(secondaryScreenSection, "user-overview");

    // scroll até screens container
    const yOffset = -120;
    const y = screensContainer.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });

    screensContainer.addEventListener('transitionend', () => {
        const primaryScreenSection = screensContainer.querySelector(".screen-section.primary");
        setElementState(primaryScreenSection, "none");
    }, { once: true });

    const package = packagesList.userCollection.find(p => p.id === packageId);
    const user = package.users.find(u => u.id === userId);

    // Obtém o período selecionado
    const periodSelected = document.querySelector("#packageChartPeriodSelect option:checked").value;
    const userPeriodSelect = document.querySelector("#userChartPeriodSelect");
    userPeriodSelect.value = periodSelected;

    const chartContainer = userPeriodSelect.closest(".usage-chart-container");
    const chartTitle = chartContainer.querySelector('.chart-title');

    switch (periodSelected) {
        case "today":
            chartTitle.textContent = "Uso do pacote hoje";
            break;
        case "7days":
            chartTitle.textContent = "Uso do pacote nos últimos 7 dias";
            break;
        case "30days":
            chartTitle.textContent = "Uso do pacote nos últimos 30 dias";
            break;
    }

    const period = periodSelected === "today" ? 0 : (periodSelected === "7days" ? 7 : 30);

    renderUserDetails(user, package, period);
}

function showSessionScreen(event) {
    event.stopPropagation();
    const sessionEl = this.closest(".session");
    const sessionId = sessionEl.dataset.sessionId;

    const packageDetails = document.querySelector("#package-details");
    const packageId = packageDetails.dataset.packageId;

    const screensContainer = document.querySelector(".screens-container");
    screensContainer.classList.add("show-next-screen");

    const secondaryScreenSection = screensContainer.querySelector(".screen-section.secondary");
    const presetSessionOverview = secondaryScreenSection.querySelector(".preset-session-overview");
    presetSessionOverview.dataset.sessionId = sessionId;

    setElementState(secondaryScreenSection, "session-overview");

    // scroll até screens container
    const yOffset = -120;
    const y = screensContainer.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });

    screensContainer.addEventListener('transitionend', () => {
        const primaryScreenSection = screensContainer.querySelector(".screen-section.primary");
        setElementState(primaryScreenSection, "none");
    }, { once: true });

    const package = packagesList.userCollection.find(p => p.id === packageId);
    const session = package.sessions.find(s => s.id === sessionId);

    // Obtém o período selecionado
    const periodSelected = document.querySelector("#packageChartPeriodSelect option:checked").value;
    const sessionPeriodSelect = document.querySelector("#sessionChartPeriodSelect");
    sessionPeriodSelect.value = periodSelected;

    const chartContainer = sessionPeriodSelect.closest(".usage-chart-container");
    const chartTitle = chartContainer.querySelector('.chart-title');

    switch (periodSelected) {
        case "today":
            chartTitle.textContent = "Uso do pacote hoje";
            break;
        case "7days":
            chartTitle.textContent = "Uso do pacote nos últimos 7 dias";
            break;
        case "30days":
            chartTitle.textContent = "Uso do pacote nos últimos 30 dias";
            break;
    }

    const period = periodSelected === "today" ? 0 : (periodSelected === "7days" ? 7 : 30);

    renderSessionDetails(session, package, period);
}

// Fixed Event Listeners ==========

// Close modals
const closeBtns = document.querySelectorAll(".close-btn");
closeBtns.forEach(item => item.addEventListener("click", event => {
    utils.closeModals();
}));

// Plus Subscribe
const plusSubscribeBtns = document.querySelectorAll('.plus-subscribe-btn');
plusSubscribeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        utils.showModal("plusSubscribe");
    });
});

const cancelBtns = document.querySelectorAll(".cancel-btn");
cancelBtns.forEach(item => item.addEventListener("click", event => {
    utils.closeModals();
}));

// ==== Click outside to close
document.addEventListener('click', e => {
    // Close package options if click outside
    if (!e.target.closest('.options-btn')) {
        const activePackageOptions = document.querySelectorAll('.package-options:not(.hidden)');
        activePackageOptions.forEach(packageOptions => {
            packageOptions.classList.add('hidden');
        });
    }
});

// Create package
const createPackageModal = document.querySelector('#createPackageModal');
const createPackageInput = createPackageModal.querySelector('input');
const confirmCreatePackageBtn = createPackageModal.querySelector('.confirm-btn');

const createPackageBtns = document.querySelectorAll('.create-package-btn');
createPackageBtns.forEach(createPackageBtn => {
    createPackageBtn.addEventListener('click', () => {
        utils.showModal("createPackage");
        createPackageInput.value = "";

        createPackageModal.addEventListener('transitionend', () => {
            createPackageInput.focus();

            // coloca o cursor no final
            const len = createPackageInput.value.length;
            createPackageInput.setSelectionRange(len, len);
        }, { once: true });
    });
});

const createPackageHandler = async (event) => {
    // Valida valor do input
    const packageName = createPackageInput.value.trim();
    const isValidName = utils.validateField(packageName, { maxLength: 20, allowEmpty: false, type: "name" });
    if (!isValidName.valid) {
        return utils.setModalError(createPackageModal, isValidName.reason);
    }

    // Verifica se já está em estado de loading (evita múltiplas ações)
    let buttonContent;
    if (event.currentTarget.classList.contains("confirm-btn")) {
        buttonContent = event.currentTarget.closest(".buttonContent");
    } else {
        const container = createPackageInput.closest(".input-actions");
        buttonContent = container.querySelector(".buttonContent");
    }
    const isLoadingState = buttonContent.classList.contains("loading-state");

    if (isLoadingState) return;

    // Seta estado de loading
    setElementState(buttonContent, "loading");

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Envia fetch para criar novo package
    const fetchCreatePackage = await fetchManager.createPackage({ name: packageName });

    console.log(fetchCreatePackage);

    // Se houver erro durante a criação do package
    if (!fetchCreatePackage.ok) {
        notify("error", "Não foi possível criar pacote.");
        return utils.closeModals();
    }

    // Se não tiver packages, seta estado de content
    if (packagesList.userCollection.length === 0) {
        setElementState(document.querySelector("#packages-list"), "collection");
    }

    // Adiciona novo package no array local de packages
    const packageData = fetchCreatePackage.result.data;
    packagesList.userCollection.push(packageData);

    // fecha modal
    utils.closeModals();

    // Notifica ação
    notify("success", "Pacote criado.");

    // Adiciona novo package na tela
    const createdPackageEl = createPackageElement(packageData, false);
    createdPackageEl.classList.add("fadeInFromRight");

    const packagesGrid = document.querySelector("#packages-list .preset-collection .access-grid");
    packagesGrid.insertBefore(createdPackageEl, packagesGrid.lastChild);

    // Seleciona package
    selectPackage(packageData.id)

    createdPackageEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest", // evita scroll vertical
        inline: "end"     // rola horizontalmente até o fim
    });

    createdPackageEl.addEventListener("animationend", () => {
        createdPackageEl.classList.remove("fadeInFromRight");
    }, { once: true });
};

confirmCreatePackageBtn.addEventListener('click', createPackageHandler);
createPackageInput.addEventListener('keydown', event => {
    const isErrorShown = !createPackageModal.querySelector(".error-message").classList.contains("hidden");
    if (isErrorShown) {
        utils.clearInputError(createPackageModal);
    }

    if (event.key === "Enter") {
        createPackageHandler(event);
    }
});

// Edit Package
const editPackageModal = document.querySelector('#editPackageModal');
const editPackageInput = editPackageModal.querySelector('input');
const confirmEditPackageBtn = editPackageModal.querySelector('.confirm-btn');

const editPackageHandler = async (event) => {
    // Valida valor do input
    const newPackageName = editPackageInput.value.trim();
    const isValidName = utils.validateField(newPackageName, { maxLength: 20, allowEmpty: false, type: "name" });
    if (!isValidName.valid) {
        return utils.setModalError(editPackageModal, isValidName.reason);
    }

    // Verifica se já está em estado de loading (evita múltiplas ações)
    let buttonContent;
    if (event.currentTarget.classList.contains("confirm-btn")) {
        buttonContent = event.currentTarget.closest(".buttonContent");
    } else {
        const container = editPackageInput.closest(".input-actions");
        buttonContent = container.querySelector(".buttonContent");
    }
    const isLoadingState = buttonContent.classList.contains("loading-state");

    if (isLoadingState) return;


    // Seta estado de loading
    setElementState(buttonContent, "loading");

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Envia fetch para editar package
    const packageId = editPackageModal.dataset.itemId;
    const fetchEditPackage = await fetchManager.editPackage({ id: packageId, name: newPackageName });

    console.log(fetchEditPackage);

    // Se houver erro durante a edição do package
    if (!fetchEditPackage.ok) {
        notify("error", "Não foi possível editar pacote.");
        return utils.closeModals();
    }

    // Edita package no array local de packages
    const packageIdx = packagesList.userCollection.findIndex(pkg => pkg.id == packageId);
    packagesList.userCollection[packageIdx].name = newPackageName;

    // fecha modal
    utils.closeModals();

    // Notifica ação
    notify("success", "Pacote editado.");

    // Edita package na tela
    const packageToEdit = document.querySelector(`#packages-list .preset-collection .access-grid .access-item[data-package-id="${packageId}"]`);

    const packageTitle = packageToEdit.querySelector(".access-title");
    packageTitle.textContent = newPackageName;
    packageToEdit.classList.add("fadeIn");

    renderPackageDetails(packagesList.userCollection[packageIdx]);

    packageToEdit.addEventListener("animationend", () => {
        packageToEdit.classList.remove("fadeIn");
    }, { once: true });
}

confirmEditPackageBtn.addEventListener('click', editPackageHandler);
editPackageInput.addEventListener('keydown', event => {
    const isErrorShown = !editPackageModal.querySelector(".error-message").classList.contains("hidden");
    if (isErrorShown) {
        utils.clearInputError(editPackageModal);
    }

    if (event.key === "Enter") {
        editPackageHandler(event);
    }
});

// Delete Package
const deletePackageModal = document.querySelector('#deletePackageModal');
const confirmDeletePackageBtn = deletePackageModal.querySelector('.confirm-btn');

const deletePackageHandler = async (event) => {
    // Verifica se já está em estado de loading (evita múltiplas ações)
    let buttonContent;
    if (event.currentTarget.classList.contains("confirm-btn")) {
        buttonContent = event.currentTarget.closest(".buttonContent");
    } else {
        const container = deletePackageModal.closest(".input-actions");
        buttonContent = container.querySelector(".buttonContent");
    }
    const isLoadingState = buttonContent.classList.contains("loading-state");

    if (isLoadingState) return;

    // Seta estado de loading
    setElementState(buttonContent, "loading");

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Envia fetch para excluir package
    const packageId = deletePackageModal.dataset.itemId;
    const fetchDeletePackage = await fetchManager.deletePackage({ id: packageId });

    console.log(fetchDeletePackage);

    // Se houver erro durante a  do session
    if (!fetchDeletePackage.ok) {
        notify("error", "Não foi possível excluir pacote.");
        return utils.closeModals();
    }

    // Deleta package no array local de packages
    const packageIdx = packagesList.userCollection.findIndex(pkg => pkg.id == packageId);
    packagesList.userCollection.splice(packageIdx, 1);

    // fecha modal
    utils.closeModals();

    // Notifica ação
    notify("success", "Pacote deletado.");

    // Remove package da tela
    const packageToDelete = document.querySelector(`#packages-list .preset-collection .access-grid .access-item[data-package-id="${packageId}"]`);
    packageToDelete.classList.add("fadeOut");

    packageToDelete.addEventListener("animationend", () => {
        packageToDelete.remove();

        // Se não houver mais packages, seta estado para empty
        if (packagesList.userCollection.length === 0) {
            setElementState(document.querySelector("#packages-list"), "empty-collection");
        }

        // Se não houver nenhum package selecionado, deseleciona detalhes
        const selectedPackageEl = document.querySelector(`#packages-list .preset-collection .access-grid .access-item.selected`);
        if (!selectedPackageEl) {
            setElementState(document.querySelector("#package-details"), "empty");
        }
    }, { once: true });
}

confirmDeletePackageBtn.addEventListener('click', deletePackageHandler);

// Abort Package Access
const abortPackageAccessModal = document.querySelector('#abortPackageAccessModal');
const confirmAbortPackageAccessBtn = abortPackageAccessModal.querySelector('.confirm-btn');

const abortPackageAccessHandler = async (event) => {
    // Verifica se já está em estado de loading (evita múltiplas ações)
    let buttonContent;
    if (event.currentTarget.classList.contains("confirm-btn")) {
        buttonContent = event.currentTarget.closest(".buttonContent");
    } else {
        const container = abortPackageAccessModal.closest(".input-actions");
        buttonContent = container.querySelector(".buttonContent");
    }
    const isLoadingState = buttonContent.classList.contains("loading-state");

    if (isLoadingState) return;

    // Seta estado de loading
    setElementState(buttonContent, "loading");

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Envia fetch para encerrar acesso
    const packageId = abortPackageAccessModal.dataset.itemId;
    const fetchAbortAccess = await fetchManager.abortPackageAccess({ id: packageId });

    console.log(fetchAbortAccess);

    // Se houver erro durante a criação do session
    if (!fetchAbortAccess.ok) {
        notify("error", "Não foi possível encerrar acesso ao pacote.");
        return utils.closeModals();
    }

    // Deleta package no array local de packages
    const packageIdx = packagesList.userAccess.findIndex(pkg => pkg.id == packageId);
    packagesList.userAccess.splice(packageIdx, 1);

    // fecha modal
    utils.closeModals();

    // Notifica ação
    notify("success", "Acesso Encerrado.");

    // Remove package da tela
    const packageToDelete = document.querySelector(`#packages-list .preset-access .access-grid .access-item[data-package-id="${packageId}"]`);
    packageToDelete.classList.add("fadeOut");

    packageToDelete.addEventListener("animationend", () => {
        packageToDelete.remove();

        // Se não houver mais packages, seta estado para empty
        if (packagesList.userAccess.length === 0) {
            setElementState(document.querySelector("#packages-list"), "empty-access");
        }

        // Se não houver nenhum package selecionado, deseleciona detalhes
        const selectedPackageEl = document.querySelector(`#packages-list .preset-access .access-grid .access-item.selected`);
        if (!selectedPackageEl) {
            setElementState(document.querySelector("#package-details"), "empty");
        }
    }, { once: true });
};

confirmAbortPackageAccessBtn.addEventListener('click', abortPackageAccessHandler);

// Remove User
const removeUserAccessModal = document.querySelector("#removeUserAccessModal");
const removeUserAccessBtn = removeUserAccessModal.querySelector(".confirm-btn");
removeUserAccessBtn.addEventListener('click', handleRemoveUser);


// Activate Package
const activationInputs = document.querySelectorAll(".activation-input input");
const activationBtns = document.querySelectorAll(".activation-input button");
const activatePackageHandler = async event => {
    // Valida valor do input
    const activationSection = event.currentTarget.closest(".activation-input");
    const activationBtn = activationSection.querySelector("button");
    const activationInput = activationSection.querySelector("input");
    const key = activationInput.value.trim();
    const isValidKey = utils.validateField(key, { allowEmpty: false, type: "key" });

    // Se a chave não for válida
    if (!isValidKey.valid) {
        return utils.setModalError(activationSection, isValidKey.reason);
    }

    // Verifica se já está em estado de loading (evita múltiplas ações)
    const buttonContent = activationBtn.closest(".buttonContent");
    const isLoadingState = buttonContent.classList.contains("loading-state");

    if (isLoadingState) return;

    // Seta estado de loading
    setElementState(buttonContent, "loading");

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Envia fetch para usar package key
    const fetchUsePackageKey = await fetchManager.usePackageKey({ key });

    console.log(fetchUsePackageKey);

    // Se houver erro durante a ativação
    if (!fetchUsePackageKey.ok) {
        // Seta botão para estado inicial
        setElementState(buttonContent, "content");

        if (fetchUsePackageKey.status === 400) {
            notify("error", fetchUsePackageKey.result.errorMessage);
        } else {
            notify("error", fetchUsePackageKey.result.errorMessage);
        }

        return;
    }

    // Se não tiver packages, seta estado de content
    if (packagesList.userAccess.length === 0) {
        setElementState(document.querySelector("#packages-list"), "access");
    }

    // Adiciona novo package no array local de packages
    const packageData = fetchUsePackageKey.result.data;
    packagesList.userAccess.push(packageData);

    // Notifica ação
    notify("success", "Pacote Ativado.");

    // Seta estado do botão para content, reseta e limpa input
    setElementState(buttonContent, "content");
    activationInput.value = "";
    utils.clearInputError(activationSection);

    // Adiciona novo package na tela
    const packageEl = createPackageElement(packageData, true);
    packageEl.classList.add("fadeInFromRight");

    const packagesGrid = document.querySelector("#packages-list .preset-access .access-grid");
    packagesGrid.insertBefore(packageEl, packagesGrid.lastChild);

    // Seleciona package
    selectPackage(packageData.id, false)

    packageEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest", // evita scroll vertical
        inline: "end"     // rola horizontalmente até o fim
    });

    packageEl.addEventListener("animationend", () => {
        packageEl.classList.remove("fadeInFromRight");
    }, { once: true });
};

activationBtns.forEach(activationBtn => {
    activationBtn.addEventListener('click', activatePackageHandler);
});

activationInputs.forEach(input => {
    input.addEventListener('keydown', event => {
        const activationSection = event.currentTarget.closest(".activation-input");
        const isErrorShown = !activationSection.querySelector(".error-message").classList.contains("hidden");
        if (isErrorShown) {
            utils.clearInputError(activationSection);
        }
        if (event.key === "Enter") {
            activatePackageHandler(event);
        }
    });
});

// Share Package
const sharePackageModal = document.querySelector('#sharePackageModal');
const toggleShareAccessBtn = sharePackageModal.querySelector('.toggle-switch');
const copyKeyBtn = sharePackageModal.querySelector('.copy-key-btn');
const renewKeyBtn = sharePackageModal.querySelector('.renew-key-btn');

toggleShareAccessBtn.addEventListener('click', async () => {
    const packageId = sharePackageModal.dataset.itemId;
    const fetchToggleAccess = await fetchManager.togglePackageState({ id: packageId });

    console.log(fetchToggleAccess);

    if (!fetchToggleAccess.ok) {
        notify("error", "Não foi possível alterar o acesso.");
        return utils.closeModals();
    }

    const packageIdx = packagesList.userCollection.findIndex(pkg => pkg.id == packageId);
    const packageData = packagesList.userCollection[packageIdx];
    const isOpen = packageData.open === 0 ? false : true;

    packagesList.userCollection[packageIdx].open = isOpen ? 0 : 1;

    utils.toggleShareModalState();
});

copyKeyBtn.addEventListener('click', () => {
    const keyValue = sharePackageModal.querySelector("#keyValue").textContent;
    navigator.clipboard.writeText(keyValue).then(() => {
        copyKeyBtn.textContent = "Copiado";
        setTimeout(() => {
            copyKeyBtn.textContent = "Copiar";
        }, 1000);
    }).catch(() => {
        notify("error", "Não foi possível copiar a chave.");
    });
});

renewKeyBtn.addEventListener('click', async () => {
    const packageId = sharePackageModal.dataset.itemId;
    const fetchRenewKey = await fetchManager.renewPackageKey({ id: packageId });

    console.log(fetchRenewKey);

    if (!fetchRenewKey.ok) {
        notify("error", "Não foi possível renovar a chave.");
        return utils.closeModals();
    }

    const newKey = fetchRenewKey.result.data.key;

    // Atualiza chave no array local de packages
    const packageIdx = packagesList.userCollection.findIndex(pkg => pkg.id == packageId);
    packagesList.userCollection[packageIdx].key = newKey;

    // Atualiza chave na tela
    const keyValue = sharePackageModal.querySelector("#keyValue");
    keyValue.textContent = newKey;

    notify("success", "Chave renovada com sucesso.");
});

// Edit Session
const editSessionModal = document.querySelector('#editSessionModal');
const editSessionInput = editSessionModal.querySelector('input');
const confirmEditSessionBtn = editSessionModal.querySelector('.confirm-btn');
const editSessionHandler = async (event) => {
    // Valida valor do input
    const newSessionName = editSessionInput.value.trim();
    const isValidName = utils.validateField(newSessionName, { maxLength: 50, allowEmpty: false, type: "name" });
    if (!isValidName.valid) {
        return utils.setModalError(editSessionModal, isValidName.reason);
    }
    // Verifica se já está em estado de loading (evita múltiplas ações)
    let buttonContent;
    if (event.currentTarget.classList.contains("confirm-btn")) {
        buttonContent = event.currentTarget.closest(".buttonContent");
    } else {
        const container = editSessionInput.closest(".input-actions");
        buttonContent = container.querySelector(".buttonContent");
    }
    const isLoadingState = buttonContent.classList.contains("loading-state");

    if (isLoadingState) return;
    // Seta estado de loading
    setElementState(buttonContent, "loading");

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Envia fetch para editar session
    const sessionId = editSessionModal.dataset.itemId;
    const fetchEditSession = await fetchManager.editSession({ id: sessionId, name: newSessionName });

    console.log(fetchEditSession);

    // Se houver erro durante a edição da session
    if (!fetchEditSession.ok) {
        notify("error", "Não foi possível editar sessão.");
        return utils.closeModals();
    }

    // Edita session no array local de packages
    const sessionIdx = packagesList.userCollection.flatMap(pkg => pkg.sessions).findIndex(sess => sess.id == sessionId);
    packagesList.userCollection.flatMap(pkg => pkg.sessions)[sessionIdx].name = newSessionName;

    // fecha modal
    utils.closeModals();

    // Notifica ação
    notify("success", "Sessão editada.");

    // Edita session na tela
    const sessionToEdit = document.querySelector(`.sessions-panel .session[data-session-id="${sessionId}"]`);
    sessionToEdit.querySelector(".item-name").textContent = newSessionName;
    sessionToEdit.classList.add("fadeIn");

    sessionToEdit.addEventListener("animationend", () => {
        sessionToEdit.classList.remove("fadeIn");
    }, { once: true });
}

confirmEditSessionBtn.addEventListener('click', editSessionHandler);
editSessionInput.addEventListener('keydown', event => {
    const isErrorShown = !editSessionModal.querySelector(".error-message").classList.contains("hidden");
    if (isErrorShown) {
        utils.clearInputError(editSessionModal);
    }
    if (event.key === "Enter") {
        editSessionHandler(event);
    }
});

// Delete Session
const deleteSessionModal = document.querySelector('#deleteSessionModal');
const confirmDeleteSessionBtn = deleteSessionModal.querySelector('.confirm-btn');
const deleteSessionHandler = async (event) => {
    // Verifica se já está em estado de loading (evita múltiplas ações)
    let buttonContent;
    if (event.currentTarget.classList.contains("confirm-btn")) {
        buttonContent = event.currentTarget.closest(".buttonContent");
    } else {
        const container = deleteSessionModal.closest(".input-actions");
        buttonContent = container.querySelector(".buttonContent");
    }
    const isLoadingState = buttonContent.classList.contains("loading-state");

    if (isLoadingState) return;

    // Seta estado de loading
    setElementState(buttonContent, "loading");

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Envia fetch para excluir session
    const sessionId = deleteSessionModal.dataset.itemId;
    const fetchDeleteSession = await fetchManager.deleteSession({ id: sessionId });

    console.log(fetchDeleteSession);

    // Se houver erro durante a  do session
    if (!fetchDeleteSession.ok) {
        notify("error", "Não foi possível excluir sessão.");
        return utils.closeModals();
    }

    // Deleta session no array local de packages
    const sessionPkgIdx = packagesList.userCollection.findIndex(pkg => pkg.sessions.some(sess => sess.id == sessionId));
    const sessionIdx = packagesList.userCollection[sessionPkgIdx].sessions.findIndex(sess => sess.id == sessionId);
    packagesList.userCollection[sessionPkgIdx].sessions.splice(sessionIdx, 1);

    // fecha modal
    utils.closeModals();

    // Notifica ação
    notify("success", "Sessão deletada.");

    // Remove session da tela
    const sessionToDelete = document.querySelector(`.sessions-panel .session[data-session-id="${sessionId}"]`);
    sessionToDelete.classList.add("fadeOut");

    sessionToDelete.addEventListener("animationend", () => {
        sessionToDelete.remove();

        // Renderiza coleção do usuário
        renderPackages(
            packagesList.userCollection,
            '.preset-collection .access-grid',
            false
        );
    }, { once: true });

}

confirmDeleteSessionBtn.addEventListener('click', deleteSessionHandler);

// Back buttons
const backBtns = document.querySelectorAll('.screen-section.secondary .back-btn');
backBtns.forEach(btn => btn.addEventListener('click', (e) => {
    const screensContainer = e.target.closest('.screens-container');
    const screenSection = e.target.closest('.screen-section');

    // Se a screen section for secondary, pega a primary e seta estado de content
    if (screenSection.classList.contains('secondary')) {
        const primaryScreenSection = screensContainer.querySelector('.screen-section.primary');
        setElementState(primaryScreenSection, "content");
    }

    screensContainer.classList.remove('show-next-screen');

    screensContainer.addEventListener('transitionend', () => {
        setElementState(screenSection, "none");
    }, { once: true });
}));