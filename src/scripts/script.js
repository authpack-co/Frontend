function toggleMenu() {
    const menu = document.getElementById("dropdownMenu");
    menu.classList.toggle("show");
}


// Fecha o menu ao clicar fora
window.addEventListener("click", function (e) {
    if (!e.target.closest('.dropdown')) {
        const menu = document.getElementById("dropdownMenu");
        if (menu.classList.contains("show")) {
            menu.classList.remove("show");
        }
    }
});


// Troca de seleção ao clicar
document.querySelectorAll(".dropdown-item").forEach(item => {
    item.addEventListener("click", () => {
        const itemName = item.textContent;
        const downloadButtonText = document.querySelector(".hero .btn-primary .btn-text");
        downloadButtonText.textContent = `Baixar para ${itemName}`;

        document.querySelectorAll(".dropdown-item").forEach(i => i.classList.remove("selected"));
        item.classList.add("selected");
    });
});

const mainDownloadButton = document.querySelector(".hero .btn-primary");
mainDownloadButton.addEventListener("click", () => {
    downloadButtonText = mainDownloadButton.textContent.trim();

    console.log(downloadButtonText)

    switch (downloadButtonText) {
        case "Baixar para Chrome": downloadExtension("https://api.authpack.co/api/extensions/chrome/build")
            break;
    }
});

async function downloadExtension(route) {
    try {
        const response = await fetch(route, {
            method: "POST"
        });

        if (!response.ok) {
            console.error("Erro ao baixar:", response.statusText);
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

        window.open("/docs/?go=install")

    } catch (error) {
        console.error("Erro inesperado ao baixar:", error);
    }
}