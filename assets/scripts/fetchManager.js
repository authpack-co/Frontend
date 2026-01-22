const serverURL = "https://api.authpack.co";

async function fetchRoutes(route, options = {}, rawResponse = false) {
  try {
    const method = (options.method || "GET").toUpperCase();

    // monta headers sem forçar Content-Type
    const headers = {
      ...(options.headers || {})
    };

    // só seta Content-Type se for enviar body (JSON)
    const hasBody = options.body !== undefined && options.body !== null;
    if (hasBody && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const fetchOptions = {
      method,
      ...options,
      headers,
    };

    const response = await fetch(`${serverURL}${route}`, fetchOptions);

    if (rawResponse) return response;

    const data = await response.json().catch(() => null);

    return {
      status: response.status,
      ok: response.ok,
      result: data,
    };
  } catch (err) {
    console.error("Erro:", err.message);
    return { status: null, ok: false, result: null };
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