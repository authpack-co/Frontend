// ─── Installation Guide Steps ─────────────────────────────────────────────────

const IG_STEPS = [
    {
        image: '/assets/images/install-guide/step-1.png',
        content: `<h3 class="step-title">Baixe o Pacote</h3>
                  <p class="step-description">Baixe o pacote da extensão AuthPack (arquivo .zip ou pasta fornecida).</p>`
    },
    {
        image: '/assets/images/install-guide/step-2.png',
        content: `<h3 class="step-title">Extraia o Conteúdo</h3>
                  <p class="step-description">Extraia o conteúdo do arquivo para uma pasta no seu computador.</p>`
    },
    {
        image: '/assets/images/install-guide/step-3.png',
        content: `<h3 class="step-title">Acesse as Extensões</h3>
                  <p class="step-description">Abra o Google Chrome e digite na barra de endereços:</p>
                  <code class="step-code">chrome://extensions/</code>`
    },
    {
        image: '/assets/images/install-guide/step-4.png',
        content: `<h3 class="step-title">Ative o Modo Desenvolvedor</h3>
                  <p class="step-description">No canto superior direito, ative o "Modo do desenvolvedor" (Developer Mode).</p>`
    },
    {
        image: '/assets/images/install-guide/step-5.png',
        content: `<h3 class="step-title">Carregue a Extensão</h3>
                  <p class="step-description">Clique em "Carregar sem compactação" (Load unpacked).</p>`
    },
    {
        image: '/assets/images/install-guide/step-6.png',
        content: `<h3 class="step-title">Selecione a Pasta</h3>
                  <p class="step-description">Selecione a pasta que foi criada ao extrair o arquivo .zip anteriormente.</p>`
    },
    {
        image: '/assets/images/install-guide/step-7.png',
        content: `<h3 class="step-title">Extensão Instalada!</h3>
                  <p class="step-description">A extensão será instalada e ficará visível na barra de extensões do Chrome.</p>`
    }
];

// ─── Installation Guide Carousel ─────────────────────────────────────────────

const InstallGuide = (() => {
    let currentStep = 0;

    const overlay  = () => document.getElementById('install-guide-modal');
    const imgEl    = () => document.getElementById('ig-step-img');
    const contentEl = () => document.getElementById('ig-step-content');
    const dotsEl   = () => document.getElementById('ig-dots');
    const prevBtn  = () => document.getElementById('ig-prev');
    const nextBtn  = () => document.getElementById('ig-next');
    const skipBtn  = () => document.getElementById('ig-skip');

    function buildDots() {
        const el = dotsEl();
        if (!el) return;
        el.innerHTML = '';
        IG_STEPS.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.className = 'ig-dot' + (i === currentStep ? ' ig-dot--active' : '');
            dot.addEventListener('click', () => goTo(i));
            el.appendChild(dot);
        });
    }

    function updateDots() {
        dotsEl()?.querySelectorAll('.ig-dot').forEach((d, i) => {
            d.classList.toggle('ig-dot--active', i === currentStep);
        });
    }

    function renderStep(direction = 1) {
        const step = IG_STEPS[currentStep];
        const cEl = contentEl();
        const iEl = imgEl();

        if (cEl) {
            cEl.style.opacity = '0';
            cEl.style.transform = direction > 0 ? 'translateX(14px)' : 'translateX(-14px)';
        }
        if (iEl) iEl.style.opacity = '0';

        setTimeout(() => {
            if (cEl) cEl.innerHTML = step.content;
            if (iEl) {
                iEl.src = step.image;
                iEl.onload = () => { iEl.style.opacity = '1'; };
                if (iEl.complete) iEl.style.opacity = '1';
            }

            requestAnimationFrame(() => {
                if (cEl) {
                    cEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                    cEl.style.opacity = '1';
                    cEl.style.transform = 'translateX(0)';
                }
            });
        }, 180);

        updateDots();

        const pb = prevBtn();
        if (pb) pb.style.visibility = currentStep === 0 ? 'hidden' : 'visible';

        const nb = nextBtn();
        if (nb) nb.textContent = currentStep === IG_STEPS.length - 1 ? 'Concluir' : 'Próximo';
    }

    function goTo(index) {
        const direction = index > currentStep ? 1 : -1;
        currentStep = Math.max(0, Math.min(IG_STEPS.length - 1, index));
        renderStep(direction);
    }

    function show() {
        currentStep = 0;
        buildDots();
        renderStep(1);

        const ov = overlay();
        if (!ov) return;
        ov.offsetHeight; // force reflow
        ov.classList.add('ig-visible');
        ov.removeAttribute('aria-hidden');
    }

    function hide() {
        const ov = overlay();
        if (!ov) return;
        ov.classList.remove('ig-visible');
        ov.setAttribute('aria-hidden', 'true');
    }

    function init() {
        const nxt = nextBtn();
        const prv = prevBtn();
        const skp = skipBtn();

        if (nxt) nxt.addEventListener('click', () => {
            currentStep < IG_STEPS.length - 1 ? goTo(currentStep + 1) : hide();
        });

        if (prv) prv.addEventListener('click', () => {
            if (currentStep > 0) goTo(currentStep - 1);
        });

        if (skp) skp.addEventListener('click', hide);

        const ov = overlay();
        if (ov) ov.addEventListener('click', (e) => { if (e.target === ov) hide(); });
    }

    return { init, show, hide };
})();

// ─── Download Extension ───────────────────────────────────────────────────────

const DOWNLOAD_BTN_DEFAULT_HTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/>
    </svg>
    Download AuthPack Studio`;

async function downloadExtension() {
    const btn = document.getElementById('btn-download-studio');
    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="dl-spin-icon">
        <path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Preparando...`;

    try {
        const response = await fetchManager.downloadExtension();

        if (!response.ok) {
            alert('Erro ao baixar a extensão. Tente novamente.');
            btn.disabled = false;
            btn.innerHTML = DOWNLOAD_BTN_DEFAULT_HTML;
            return;
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'AuthPack.zip';
        if (contentDisposition) {
            const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
            if (match && match[1]) filename = match[1].replace(/['"]/g, '');
        }

        // Trigger browser download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        // Show success state
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/></svg> Baixado!`;
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = DOWNLOAD_BTN_DEFAULT_HTML;
        }, 3000);

        // Show installation guide automatically
        InstallGuide.show();

    } catch (err) {
        console.error('[Download] error:', err);
        btn.disabled = false;
        btn.innerHTML = DOWNLOAD_BTN_DEFAULT_HTML;
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize carousel
    InstallGuide.init();

    // Wire download button
    const downloadBtn = document.getElementById('btn-download-studio');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadExtension);

    // Wire manual guide button
    const guideBtn = document.getElementById('btn-guide');
    if (guideBtn) guideBtn.addEventListener('click', () => InstallGuide.show());

});