const serverURL = IS_DEV ? "http://127.0.0.1:3000" : "https://api.authpack.co";

async function fetchRoutes(route, options = {}, rawResponse = false) {
    try {
        // Configurações padrão (método GET)
        const defaultOptions = {
            method: "GET",
            credentials: "include",
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
            method: "DELETE",
            credentials: "include"
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

    async getPackageAccessOverview(packageDetails) {
        const { id } = packageDetails;

        const response = await fetchRoutes(`/api/stats/package/access-overview/${id}`);
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
    },

    // Billing

    async checkoutPlus() {
        const response = await fetchRoutes(`/api/subscription/checkout`, {
            method: "POST",
            credentials: "include"
        });
        return response;
    },

    async cancelBilling() {
        const response = await fetchRoutes(`/api/subscription/cancel`, {
            method: "POST",
            credentials: "include"
        });
        return response;
    },

    async reactivateBilling() {
        const response = await fetchRoutes(`/api/subscription/reactivate`, {
            method: "POST",
            credentials: "include"
        });
        return response;
    },

    // Auth

    async logout() {
        const response = await fetchRoutes(`/api/auth/logout`, {
            method: "POST",
            credentials: "include"
        });
        return response;
    },

    // Extension

    async downloadExtension() {
        const response = await fetchRoutes(`/api/extensions/build/chrome`, {
            method: "POST",
            credentials: "include",
        }, true); // rawResponse = true
        return response;
    },

    // Device Activation (universal)

    async activateDevice({ visitorId, requestId }) {
        const response = await fetchRoutes(`/api/devices/activate`, {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({ visitorId, requestId })
        });
        return response;
    },

    // ==================== Marketplace ====================

    async getSellerAccountStatus() {
        const response = await fetchRoutes(`/api/marketplace/seller/account/status`);
        return response;
    },

    async startSellerOnboarding() {
        const response = await fetchRoutes(`/api/marketplace/seller/onboarding`, {
            method: "POST",
            credentials: "include"
        });
        return response;
    },

    async getSellerProducts() {
        const response = await fetchRoutes(`/api/marketplace/seller/products`);
        return response;
    },

    async createProduct(productData) {
        const response = await fetchRoutes(`/api/marketplace/seller/products`, {
            method: "POST",
            body: JSON.stringify(productData)
        });
        return response;
    },

    async deleteProduct(productId) {
        const response = await fetchRoutes(`/api/marketplace/seller/products/${productId}`, {
            method: "DELETE"
        });
        return response;
    },

    async updateProduct(productId, data) {
        const response = await fetchRoutes(`/api/marketplace/seller/products/${productId}`, {
            method: "PATCH",
            body: JSON.stringify(data)
        });
        return response;
    },

    async reactivateProduct(productId) {
        const response = await fetchRoutes(`/api/marketplace/seller/products/${productId}/reactivate`, {
            method: "PATCH"
        });
        return response;
    },

    async hardDeleteProduct(productId) {
        const response = await fetchRoutes(`/api/marketplace/seller/products/${productId}/permanent`, {
            method: "DELETE"
        });
        return response;
    },

    async getMarketplaceProducts() {
        const response = await fetchRoutes(`/api/marketplace/products`);
        return response;
    },

    async getProductBySlug(slug) {
        const response = await fetchRoutes(`/api/marketplace/products/${slug}`);
        return response;
    },

    async startCheckout(data) {
        const response = await fetchRoutes(`/api/marketplace/checkout`, {
            method: "POST",
            body: JSON.stringify(data)
        });
        return response;
    },

    async getMyPurchases() {
        const response = await fetchRoutes(`/api/marketplace/me/purchases`);
        return response;
    },

    async getSellerDashboard() {
        const response = await fetchRoutes(`/api/marketplace/seller/dashboard`);
        return response;
    },

    async getSellerDashboardLink() {
        const response = await fetchRoutes(`/api/marketplace/seller/dashboard-link`, {
            method: "POST",
            credentials: "include"
        });
        return response;
    },

    async getSellerSalesHistory() {
        const response = await fetchRoutes(`/api/marketplace/seller/sales-history`);
        return response;
    },

    async getProductDetails(productId) {
        const response = await fetchRoutes(`/api/marketplace/seller/products/${productId}/details`);
        return response;
    },
}
