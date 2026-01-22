const serverURL = "https://api.authpack.co";

async function fetchRoutes(route, options = {}, rawResponse = false) {
    try {
        // Configurações padrão (método GET)
        const defaultOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
        };

        // Mescla as opções fornecidas com as padrões
        const fetchOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {}) // Mescla cabeçalhos fornecidos
            },
        };

        // Faz a requisição com as opções configuradas
        const fetchURL = `${serverURL}${route}`
        const response = await fetch(fetchURL, fetchOptions);

        // Se rawResponse for true, retorna a resposta completa
        if (rawResponse) {
            return response;
        }

        // Tenta obter os dados JSON da resposta
        const data = await response.json().catch(() => null); // Captura erros de parsing

        return {
            status: response.status, // Status HTTP da resposta
            ok: response.ok,         // Indica se a resposta foi bem-sucedida
            result: data,                    // Conteúdo do JSON (ou null se falhou)
        };
    } catch (err) {
        console.error("Erro:", err.message);
        return {
            status: null,  // Sem status HTTP (erro de rede, etc.)
            ok: false,     // Requisição falhou
            result: null,    // Nenhum dado retornado
        };
    }
}

const fetchManager = {
    // Packages
    async getCollectionPackages() {
        const response = await fetchRoutes("/api/packages/created");
        return response;
    },

    async getAccessPackages() {
        const response = await fetchRoutes("/api/packages/acquired");
        return response;
    },

    async createPackage(packageDetails) {
        const processedData = JSON.stringify(packageDetails);
        const response = await fetchRoutes("/api/packages", {
            method: "POST",
            body: processedData
        });
        return response;
    },
    async editPackage(packageDetails) {
        const { id: packageId, name } = packageDetails;
        const processedData = JSON.stringify({ name });
        const response = await fetchRoutes(`/api/packages/${packageId}`, {
            method: "PATCH",
            body: processedData
        });

        return response;
    },
    async deletePackage(packageDetails) {
        const { id } = packageDetails;
        const response = await fetchRoutes(`/api/packages/${id}`, {
            method: "DELETE",
        });
        return response;
    },

    async usePackageKey(key) {
        const processedData = JSON.stringify(key);
        const response = await fetchRoutes("/api/packages/access", {
            method: "POST",
            body: processedData
        });
        return response;
    },

    async renewPackageKey(packageDetails) {
        const { id } = packageDetails;
        const response = await fetchRoutes(`/api/packages/${id}/key`, {
            method: "PATCH"
        });
        return response;
    },

    async abortPackageAccess(packageDetails) {
        const { id } = packageDetails;
        const response = await fetchRoutes(`/api/packages/access/${id}`, {
            method: "DELETE"
        });
        return response;
    },

    async togglePackageState(packageDetails) {
        const { id } = packageDetails;
        const response = await fetchRoutes(`/api/packages/${id}/state`, {
            method: "PATCH"
        });
        return response;
    },

    // Sessions

    async editSession(sessionDetails) {
        const { id: sessionId, name } = sessionDetails;

        const processedData = JSON.stringify({ name });
        const response = await fetchRoutes(`/api/sessions/${sessionId}`, {
            method: "PATCH",
            body: processedData
        });

        return response;
    },
    async deleteSession(sessionDetails) {
        const { id } = sessionDetails;
        const response = await fetchRoutes(`/api/sessions/${id}`, {
            method: "DELETE"
        });
        return response;
    },
    async getAcquiredSession(sessionDetails) {
        const { id } = sessionDetails;

        const response = await fetchRoutes(`/api/sessions/acquired/${id}`);
        return response;
    },
    async getCreatedSession(sessionDetails) {
        const { id } = sessionDetails;

        const response = await fetchRoutes(`/api/sessions/created/${id}`);
        return response;
    },

    // Users

    async removeUserFromPackage(fetchDetails) {
        const { packageId, userId } = fetchDetails;
        const response = await fetchRoutes(`/api/packages/${packageId}/users/${userId}`, {
            method: "DELETE"
        });
        return response;
    },

    // Devices

    async removeDevice(deviceId) {
        const response = await fetchRoutes(`/api/devices/${deviceId}`, {
            method: "DELETE"
        });
        return response;
    },

    // Stats

    async getPackageOverviewStats(packageDetails) {
        const { id } = packageDetails;

        const response = await fetchRoutes(`/api/stats/package/overview/${id}`);
        return response;
    },

    async getSessionOverviewStats(sessionDetails) {
        const { id } = sessionDetails;

        const response = await fetchRoutes(`/api/stats/session/overview/${id}`);
        return response;
    },

    // Auth

    async getAuthenticatedUser() {
        const response = await fetchRoutes(`/api/auth/`, {
            credentials: "include"
        });

        return response;
    },

    // Users

    async getUserInfo() {
        const response = await fetchRoutes(`/api/users/info`);

        return response;
    }
}