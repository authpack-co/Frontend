const contentEl = document.getElementById("doc-content");
const navLinks = document.querySelectorAll(".nav a");

function setActive(slug) {
    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.dataset.slug === slug) link.classList.add("active");
    });
}

async function loadContent(slug, push = true) {
    try {
        const res = await fetch(`/docs/content/${slug}.html`);
        if (!res.ok) throw new Error("Conteúdo não encontrado");
        const html = await res.text();
        contentEl.innerHTML = html;
        setActive(slug);
        if (push) {
            const params = new URLSearchParams(window.location.search);
            params.set("go", slug);
            history.pushState({}, "", `?${params.toString()}`);
        }
    } catch (err) {
        contentEl.innerHTML = `<h1>404</h1><p>Conteúdo não encontrado.</p>`;
    }
}

navLinks.forEach(link => {
    link.addEventListener("click", e => {
        e.preventDefault();
        const slug = link.dataset.slug;
        loadContent(slug);
    });
});

// Detecta alterações no histórico (voltar/avançar)
window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("go") || "getting-started";
    loadContent(slug, false);
});

// Detecta slug inicial pelos query params
const params = new URLSearchParams(window.location.search);
const initialSlug = params.get("go") || "getting-started";
loadContent(initialSlug, false);