/**
 * AuthPack — Onboarding Carousel ("Adicionar sessão")
 *
 * Tutorial em 7 passos mostrado quando o usuário cria o PRIMEIRO pacote.
 * O markup é injetado sob demanda (lazy) e controlado por este módulo.
 *
 * API pública:
 *   AuthPackOnboarding.open()      → abre o tutorial (injeta na 1ª chamada)
 *   AuthPackOnboarding.close()     → fecha
 *   AuthPackOnboarding.isSeen()    → já foi visto antes?
 *   AuthPackOnboarding.markSeen()  → marca como visto
 */
(function () {
    'use strict';

    const ICON = '/assets/images/favicon-128x128.png';
    const SEEN_KEY = 'authpack-session-tutorial-seen';
    const SLIDE_MS = 7000;   // tempo por slide (auto-avanço)
    const COUNT = 7;
    const TICK_MS = 33;

    let built = false;
    let overlay, card, track, progressFill, dotsWrap, prevBtn, nextBtn, playBtn;
    let timer = null;
    let last = 0;
    const state = { current: 0, progress: 0, playing: true, hover: false };

    // ── HTML do tutorial (painéis-demo mantêm estilos inline do design) ──
    const TEMPLATE = `
<button class="oc-close" type="button" title="Fechar">&times;</button>

<div class="oc-viewport">
  <div class="oc-track">

    <!-- ===== SLIDE 1 — INSTALAR ===== -->
    <div class="oc-slide">
      <div class="oc-demo">
        <div style="position:absolute; left:36px; top:92px; width:368px; height:300px; background:#fff; border-radius:13px; box-shadow:0 26px 55px rgba(0,0,0,.5); overflow:hidden;">
          <div style="height:46px; background:#eef0f3; border-bottom:1px solid #e3e6ea; position:relative;">
            <div style="position:absolute; left:14px; top:18px; display:flex; gap:6px;">
              <span style="width:9px;height:9px;border-radius:50%;background:#ff5f57;"></span>
              <span style="width:9px;height:9px;border-radius:50%;background:#febc2e;"></span>
              <span style="width:9px;height:9px;border-radius:50%;background:#28c840;"></span>
            </div>
            <div style="position:absolute; left:64px; top:11px; width:212px; height:24px; background:#fff; border:1px solid #e1e4e9; border-radius:13px;"></div>
            <div style="position:absolute; right:50px; top:12px; width:24px; height:24px; border-radius:7px; display:flex; align-items:center; justify-content:center; color:#5b6573;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 19.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0"/><path d="M4.39 8.61a1 1 0 0 0 .474 1.68 2.5 2.5 0 1 1-3.014 3.015 1 1 0 0 0-1.68.474"/></svg>
            </div>
            <div style="position:absolute; right:14px; top:13px; animation:s1pin 6.5s ease-in-out infinite;">
              <img src="${ICON}" alt="" style="width:22px; height:22px; border-radius:5px;">
            </div>
          </div>
          <div style="padding:16px;">
            <div style="height:10px; width:60%; background:#eceef1; border-radius:5px; margin-bottom:10px;"></div>
            <div style="height:10px; width:85%; background:#f1f3f5; border-radius:5px; margin-bottom:10px;"></div>
            <div style="height:10px; width:72%; background:#f1f3f5; border-radius:5px;"></div>
          </div>
        </div>
        <div style="position:absolute; left:200px; top:148px; width:196px; background:#fff; border:1px solid #e6e9ee; border-radius:12px; box-shadow:0 18px 40px rgba(0,0,0,.3); padding:8px; animation:s1drop 6.5s ease-in-out infinite;">
          <div style="font-size:10px; font-weight:600; color:#94a3b8; padding:4px 6px 8px; text-transform:uppercase; letter-spacing:.05em;">Extensões</div>
          <div style="display:flex; align-items:center; gap:9px; padding:8px 6px; border-radius:8px; background:#f4f7fb;">
            <img src="${ICON}" alt="" style="width:22px; height:22px; border-radius:5px;">
            <span style="font-size:12.5px; font-weight:600; color:#1f2937; flex:1;">AuthPack</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#2563eb" stroke="#2563eb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
          </div>
        </div>
        <div style="position:absolute; left:0; top:0; animation:s1cur 6.5s ease-in-out infinite; z-index:9;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="#0f172a" stroke-width="1.4" stroke-linejoin="round" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));"><path d="M5 3l14 7-6 1.6L9.4 19 5 3z"/></svg>
        </div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow">Passo 1 · Instalar</div>
        <h2 class="oc-title">Parabéns pelo seu primeiro pacote!</h2>
        <p class="oc-text" style="margin-bottom:26px;">Para começar a adicionar sessões, instale a extensão do AuthPack no seu navegador. É rápido e gratuito.</p>
        <div>
          <a class="oc-cta oc-cta--blue" href="https://chromewebstore.google.com/detail/authpack-studio/fncdgjcpelomihdflipojhkmgoicckpm" target="_blank" rel="noopener">
            <img src="${ICON}" alt=""> Instalar extensão
          </a>
        </div>
      </div>
    </div>

    <!-- ===== SLIDE 2 — ABRIR SERVIÇO ===== -->
    <div class="oc-slide">
      <div class="oc-demo">
        <div style="position:absolute; left:36px; top:92px; width:368px; height:300px; background:#fff; border-radius:13px; box-shadow:0 26px 55px rgba(0,0,0,.5); overflow:hidden;">
          <div style="height:46px; background:#eef0f3; border-bottom:1px solid #e3e6ea; position:relative;">
            <div style="position:absolute; left:14px; top:18px; display:flex; gap:6px;">
              <span style="width:9px;height:9px;border-radius:50%;background:#ff5f57;"></span>
              <span style="width:9px;height:9px;border-radius:50%;background:#febc2e;"></span>
              <span style="width:9px;height:9px;border-radius:50%;background:#28c840;"></span>
            </div>
            <div style="position:absolute; left:64px; top:11px; width:212px; height:24px; background:#fff; border:1px solid #e1e4e9; border-radius:13px; display:flex; align-items:center; padding:0 9px; gap:6px; overflow:hidden;">
              <span style="width:14px;height:14px;border-radius:3px;background:linear-gradient(135deg,#22c55e,#16a34a);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:8px;font-weight:700; animation:s2fav 6.5s ease-in-out infinite;">S</span>
              <span style="white-space:nowrap; overflow:hidden; display:inline-block; animation:s2type 6.5s ease-in-out infinite; font-size:11.5px; color:#334155; font-weight:500;">app.servico.com</span>
              <span style="width:1.5px; height:14px; background:#2563eb; display:inline-block; animation:s2caret 6.5s steps(1) infinite, apBlink .9s steps(1) infinite;"></span>
            </div>
            <div style="position:absolute; right:14px; top:13px;"><img src="${ICON}" alt="" style="width:22px; height:22px; border-radius:5px; opacity:.85;"></div>
          </div>
          <div style="position:relative; height:254px;">
            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; animation:s2blank 6.5s ease-in-out infinite;">
              <div style="width:26px;height:26px;border:3px solid #e5e7eb;border-top-color:#94a3b8;border-radius:50%;animation:apSpin .8s linear infinite;"></div>
            </div>
            <div style="position:absolute; inset:0; padding:16px; animation:s2page 6.5s ease-in-out infinite;">
              <div style="display:flex; align-items:center; gap:9px; margin-bottom:14px;">
                <span style="width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#22c55e,#16a34a);"></span>
                <span style="height:11px; width:110px; background:#e8ebef; border-radius:6px;"></span>
                <span style="margin-left:auto; height:24px; width:64px; border-radius:7px; background:#eef2f7;"></span>
              </div>
              <div style="height:74px; border-radius:10px; background:linear-gradient(135deg,#eef2f7,#e3e9f0); margin-bottom:12px;"></div>
              <div style="display:flex; gap:10px;">
                <div style="flex:1; height:54px; border-radius:9px; background:#f1f4f8;"></div>
                <div style="flex:1; height:54px; border-radius:9px; background:#f1f4f8;"></div>
              </div>
            </div>
          </div>
        </div>
        <div style="position:absolute; left:0; top:0; animation:s2cur 6.5s ease-in-out infinite; z-index:9;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="#0f172a" stroke-width="1.4" stroke-linejoin="round" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));"><path d="M5 3l14 7-6 1.6L9.4 19 5 3z"/></svg>
        </div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow">Passo 2 · Acessar</div>
        <h2 class="oc-title">Abra o serviço que quer adicionar</h2>
        <p class="oc-text">Navegue até o site cuja sessão você quer guardar — já logado na sua conta. É essa sessão que vai entrar no pacote.</p>
      </div>
    </div>

    <!-- ===== SLIDE 3 — CLICAR NO ÍCONE ===== -->
    <div class="oc-slide">
      <div class="oc-demo">
        <div style="position:absolute; left:36px; top:92px; width:368px; height:300px; background:#fff; border-radius:13px; box-shadow:0 26px 55px rgba(0,0,0,.5); overflow:hidden;">
          <div style="height:46px; background:#eef0f3; border-bottom:1px solid #e3e6ea; position:relative;">
            <div style="position:absolute; left:14px; top:18px; display:flex; gap:6px;">
              <span style="width:9px;height:9px;border-radius:50%;background:#ff5f57;"></span>
              <span style="width:9px;height:9px;border-radius:50%;background:#febc2e;"></span>
              <span style="width:9px;height:9px;border-radius:50%;background:#28c840;"></span>
            </div>
            <div style="position:absolute; left:64px; top:11px; width:212px; height:24px; background:#fff; border:1px solid #e1e4e9; border-radius:13px; display:flex; align-items:center; padding:0 9px; gap:6px;">
              <span style="width:14px;height:14px;border-radius:3px;background:linear-gradient(135deg,#22c55e,#16a34a);"></span>
              <span style="font-size:11.5px; color:#334155; font-weight:500;">app.servico.com</span>
            </div>
            <div style="position:absolute; right:8px; top:7px; width:34px; height:34px; border-radius:9px; border:2px solid #60a5fa; animation:s3ring 6.5s ease-out infinite;"></div>
            <div style="position:absolute; right:14px; top:13px;"><img src="${ICON}" alt="" style="width:22px; height:22px; border-radius:5px;"></div>
          </div>
          <div style="padding:16px;">
            <div style="display:flex; align-items:center; gap:9px; margin-bottom:14px;">
              <span style="width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#22c55e,#16a34a);"></span>
              <span style="height:11px; width:110px; background:#e8ebef; border-radius:6px;"></span>
            </div>
            <div style="height:74px; border-radius:10px; background:linear-gradient(135deg,#eef2f7,#e3e9f0);"></div>
          </div>
        </div>
        <div style="position:absolute; right:18px; top:128px; width:228px; transform-origin:top right; animation:s3pop 6.5s ease-out infinite; z-index:7;">
          <div style="background:rgba(24,26,30,.96); border:1px solid rgba(255,255,255,.13); border-radius:16px; box-shadow:0 24px 50px rgba(0,0,0,.5); padding:12px; backdrop-filter:blur(8px);">
            <div style="display:flex; align-items:center; gap:8px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,.08);">
              <span style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#ff8a65,#f06292);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;">JS</span>
              <div style="line-height:1.1;"><div style="font-size:9px;color:rgba(255,255,255,.5);">Olá,</div><div style="font-size:12px;color:#fff;font-weight:600;">João</div></div>
              <img src="${ICON}" alt="" style="width:20px;height:20px;border-radius:5px;margin-left:auto;">
            </div>
            <div style="margin-top:11px; display:flex; background:rgba(255,255,255,.07); border-radius:9px; padding:3px;">
              <div style="flex:1; text-align:center; font-size:10.5px; font-weight:600; color:#fff; background:rgba(255,255,255,.13); padding:6px; border-radius:7px;">Minha coleção</div>
              <div style="flex:1; text-align:center; font-size:10.5px; font-weight:600; color:rgba(255,255,255,.5); padding:6px;">Meus acessos</div>
            </div>
            <div style="margin-top:11px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.1); border-radius:11px; padding:11px; display:flex; align-items:center; gap:9px;">
              <span style="width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#ff9a56,#ff6b35);"></span>
              <div style="line-height:1.2;"><div style="font-size:9px;color:rgba(255,255,255,.55);">criado agora mesmo</div><div style="font-size:12px;color:#fff;font-weight:500;">Trabalho</div></div>
            </div>
          </div>
        </div>
        <div style="position:absolute; left:0; top:0; animation:s3cur 6.5s ease-in-out infinite; z-index:9;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="#0f172a" stroke-width="1.4" stroke-linejoin="round" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));"><path d="M5 3l14 7-6 1.6L9.4 19 5 3z"/></svg>
        </div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow">Passo 3 · Abrir</div>
        <h2 class="oc-title">Clique no ícone do AuthPack</h2>
        <p class="oc-text">Com o site aberto, clique no ícone da extensão na barra do navegador. O AuthPack abre mostrando a sua coleção de pacotes.</p>
      </div>
    </div>

    <!-- ===== SLIDE 4 — ESCOLHER PACOTE + MENU ===== -->
    <div class="oc-slide">
      <div class="oc-demo">
        <div style="position:absolute; left:92px; top:70px; width:256px; background:rgba(24,26,30,.97); border:1px solid rgba(255,255,255,.13); border-radius:18px; box-shadow:0 30px 60px rgba(0,0,0,.55); padding:14px;">
          <div style="display:flex; align-items:center; gap:9px; padding-bottom:11px; border-bottom:1px solid rgba(255,255,255,.08);">
            <span style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ff8a65,#f06292);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">JS</span>
            <div style="line-height:1.15;"><div style="font-size:10px;color:rgba(255,255,255,.5);">Olá,</div><div style="font-size:13px;color:#fff;font-weight:600;">João</div></div>
            <img src="${ICON}" alt="" style="width:22px;height:22px;border-radius:5px;margin-left:auto;">
          </div>
          <div style="margin-top:12px; display:flex; background:rgba(255,255,255,.07); border-radius:10px; padding:3px;">
            <div style="flex:1; text-align:center; font-size:11px; font-weight:600; color:#fff; background:rgba(255,255,255,.13); padding:7px; border-radius:8px;">Minha coleção</div>
            <div style="flex:1; text-align:center; font-size:11px; font-weight:600; color:rgba(255,255,255,.5); padding:7px;">Meus acessos</div>
          </div>
          <div style="margin-top:13px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12); border-radius:12px;">
            <div style="position:relative; display:flex; align-items:center; gap:10px; padding:12px;">
              <span style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#ff9a56,#ff6b35);"></span>
              <div style="line-height:1.25; flex:1;"><div style="font-size:10px;color:rgba(255,255,255,.55);">criado agora mesmo</div><div style="font-size:13px;color:#fff;font-weight:500;">Trabalho</div></div>
              <span style="font-size:10px;color:rgba(255,255,255,.5);margin-right:4px;">0/5</span>
              <div style="display:flex; flex-direction:column; align-items:center; gap:3px;">
                <span style="color:#fff; font-size:15px; line-height:8px; letter-spacing:1px;">···</span>
                <span style="color:rgba(255,255,255,.4); font-size:16px; display:inline-block; animation:s4arrow 6.5s ease-in-out infinite;">›</span>
              </div>
            </div>
          </div>
          <div style="position:absolute; right:16px; top:118px; width:140px; background:#2d2f30; border:1px solid #5e5d5d; border-radius:10px; box-shadow:0 14px 30px rgba(0,0,0,.5); overflow:hidden; padding:3px; animation:s4menu 6.5s ease-in-out infinite; z-index:5;">
            <div style="display:flex; align-items:center; gap:8px; padding:7px 9px; border-radius:7px; color:#fff; font-size:11.5px; background:rgba(96,165,250,.14);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 16h6"/><path d="M19 13v6"/><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg>
              Nova sessão
            </div>
            <div style="display:flex; align-items:center; gap:8px; padding:7px 9px; border-radius:7px; color:#e5e7eb; font-size:11.5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/></svg>
              Compartilhar
            </div>
            <div style="display:flex; align-items:center; gap:8px; padding:7px 9px; border-radius:7px; color:#e5e7eb; font-size:11.5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>
              Editar
            </div>
            <div style="display:flex; align-items:center; gap:8px; padding:7px 9px; border-radius:7px; color:#f87171; font-size:11.5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              Excluir
            </div>
          </div>
        </div>
        <div style="position:absolute; left:0; top:0; animation:s4cur 6.5s ease-in-out infinite; z-index:9;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="#0f172a" stroke-width="1.4" stroke-linejoin="round" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));"><path d="M5 3l14 7-6 1.6L9.4 19 5 3z"/></svg>
        </div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow">Passo 4 · Selecionar</div>
        <h2 class="oc-title">Escolha o pacote e abra o menu</h2>
        <p class="oc-text">Na sua coleção, encontre o pacote onde a sessão deve entrar e clique nos <strong>três pontinhos</strong> dele.</p>
      </div>
    </div>

    <!-- ===== SLIDE 5 — NOVA SESSÃO ===== -->
    <div class="oc-slide">
      <div class="oc-demo">
        <div style="position:absolute; left:92px; top:70px; width:256px; background:rgba(24,26,30,.97); border:1px solid rgba(255,255,255,.13); border-radius:18px; box-shadow:0 30px 60px rgba(0,0,0,.55); padding:14px;">
          <div style="display:flex; align-items:center; gap:9px; padding-bottom:11px; border-bottom:1px solid rgba(255,255,255,.08);">
            <span style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ff8a65,#f06292);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">JS</span>
            <div style="line-height:1.15;"><div style="font-size:10px;color:rgba(255,255,255,.5);">Olá,</div><div style="font-size:13px;color:#fff;font-weight:600;">João</div></div>
            <img src="${ICON}" alt="" style="width:22px;height:22px;border-radius:5px;margin-left:auto;">
          </div>
          <div style="margin-top:12px; display:flex; background:rgba(255,255,255,.07); border-radius:10px; padding:3px;">
            <div style="flex:1; text-align:center; font-size:11px; font-weight:600; color:#fff; background:rgba(255,255,255,.13); padding:7px; border-radius:8px;">Minha coleção</div>
            <div style="flex:1; text-align:center; font-size:11px; font-weight:600; color:rgba(255,255,255,.5); padding:7px;">Meus acessos</div>
          </div>
          <div style="margin-top:13px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12); border-radius:12px;">
            <div style="position:relative; display:flex; align-items:center; gap:10px; padding:12px;">
              <span style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#ff9a56,#ff6b35);"></span>
              <div style="line-height:1.25; flex:1;"><div style="font-size:10px;color:rgba(255,255,255,.55);">criado agora mesmo</div><div style="font-size:13px;color:#fff;font-weight:500;">Trabalho</div></div>
              <span style="font-size:10px;color:rgba(255,255,255,.5);margin-right:4px;">0/5</span>
              <div style="display:flex; flex-direction:column; align-items:center; gap:3px;">
                <span style="color:#fff; font-size:15px; line-height:8px; letter-spacing:1px;">···</span>
                <span style="color:rgba(255,255,255,.4); font-size:16px; transform:rotate(90deg);">›</span>
              </div>
            </div>
          </div>
          <div style="position:absolute; right:16px; top:118px; width:140px; background:#2d2f30; border:1px solid #5e5d5d; border-radius:10px; box-shadow:0 14px 30px rgba(0,0,0,.5); overflow:hidden; padding:3px; z-index:5;">
            <div style="display:flex; align-items:center; gap:8px; padding:7px 9px; border-radius:7px; color:#fff; font-size:11.5px; animation:s5hl 6.5s ease-in-out infinite;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 16h6"/><path d="M19 13v6"/><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg>
              Nova sessão
            </div>
            <div style="display:flex; align-items:center; gap:8px; padding:7px 9px; border-radius:7px; color:#e5e7eb; font-size:11.5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/></svg>
              Compartilhar
            </div>
            <div style="display:flex; align-items:center; gap:8px; padding:7px 9px; border-radius:7px; color:#e5e7eb; font-size:11.5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>
              Editar
            </div>
            <div style="display:flex; align-items:center; gap:8px; padding:7px 9px; border-radius:7px; color:#f87171; font-size:11.5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              Excluir
            </div>
          </div>
        </div>
        <div style="position:absolute; left:0; top:0; animation:s5cur 6.5s ease-in-out infinite; z-index:9;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="#0f172a" stroke-width="1.4" stroke-linejoin="round" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));"><path d="M5 3l14 7-6 1.6L9.4 19 5 3z"/></svg>
        </div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow">Passo 5 · Adicionar</div>
        <h2 class="oc-title">Clique em “Nova sessão”</h2>
        <p class="oc-text">No menu que abriu, escolha <strong>Nova sessão</strong>. O AuthPack captura a sessão do site que está aberto.</p>
      </div>
    </div>

    <!-- ===== SLIDE 6 — NOMEAR ===== -->
    <div class="oc-slide">
      <div class="oc-demo">
        <div style="position:absolute; left:92px; top:70px; width:256px; height:460px; background:rgba(18,20,24,.9); border:1px solid rgba(255,255,255,.1); border-radius:18px;"></div>
        <div style="position:absolute; left:92px; top:150px; width:256px; background:rgba(28,30,34,.99); border:1px solid rgba(255,255,255,.15); border-radius:16px; box-shadow:0 30px 60px rgba(0,0,0,.6); overflow:hidden; animation:s6sheet 6.5s ease-out infinite;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:13px 14px; border-bottom:1px solid rgba(255,255,255,.08);">
            <span style="font-size:13px; font-weight:600; color:#fff;">Adicionar à <strong>Trabalho</strong></span>
            <span style="color:rgba(255,255,255,.5); font-size:16px;">×</span>
          </div>
          <div style="padding:14px;">
            <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:11px; padding:10px; margin-bottom:13px;">
              <span style="width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">S</span>
              <span style="font-size:12px; color:rgba(255,255,255,.65);">app.servico.com</span>
            </div>
            <div style="display:flex; gap:8px;">
              <div style="flex:1; display:flex; align-items:center; background:#0e1117; border:1px solid #2563eb; border-radius:9px; padding:0 11px; height:38px; overflow:hidden;">
                <span style="white-space:nowrap; overflow:hidden; display:inline-block; animation:s6type 6.5s ease-in-out infinite; font-size:12.5px; color:#fff; font-weight:500;">Minha conta</span>
                <span style="width:1.5px; height:16px; background:#60a5fa; display:inline-block; margin-left:1px; animation:s6caret 6.5s steps(1) infinite, apBlink .9s steps(1) infinite;"></span>
              </div>
              <div style="position:relative; width:46px; height:38px;">
                <button style="position:absolute; inset:0; background:#2563eb; color:#fff; border:none; border-radius:9px; font-size:12.5px; font-weight:600; cursor:default; animation:s6okidle 6.5s ease-in-out infinite;">Ok</button>
                <div style="position:absolute; inset:0; background:#2563eb; border-radius:9px; display:flex; align-items:center; justify-content:center; animation:s6okload 6.5s ease-in-out infinite;">
                  <div style="width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:apSpin .7s linear infinite;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style="position:absolute; left:0; top:0; animation:s6cur 6.5s ease-in-out infinite; z-index:9;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="#0f172a" stroke-width="1.4" stroke-linejoin="round" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));"><path d="M5 3l14 7-6 1.6L9.4 19 5 3z"/></svg>
        </div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow">Passo 6 · Nomear</div>
        <h2 class="oc-title">Dê um nome à sessão</h2>
        <p class="oc-text">Escolha um nome que ajude a reconhecê-la depois — como “Minha conta” — e confirme em <strong>Ok</strong>.</p>
      </div>
    </div>

    <!-- ===== SLIDE 7 — PRONTO ===== -->
    <div class="oc-slide">
      <div class="oc-demo oc-demo--success">
        <div style="position:absolute; top:24px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:9px; background:#1f2937; border:1px solid rgba(255,255,255,.14); border-radius:12px; padding:10px 14px; box-shadow:0 12px 30px rgba(0,0,0,.4); animation:s7toast 6.5s ease-in-out infinite; z-index:6;">
          <span style="width:18px;height:18px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;">✓</span>
          <span style="font-size:12.5px; color:#fff; font-weight:500; white-space:nowrap;">Sessão adicionada!</span>
        </div>
        <div style="text-align:center;">
          <div style="position:relative; width:108px; height:108px; margin:0 auto 22px;">
            <div style="position:absolute; inset:0; border-radius:50%; background:radial-gradient(circle, rgba(34,197,94,.35), transparent 70%); animation:s7burst 6.5s ease-out infinite;"></div>
            <div style="position:absolute; inset:14px; border-radius:50%; background:#22c55e; box-shadow:0 12px 30px rgba(34,197,94,.45); animation:s7ring 6.5s ease-out infinite; display:flex; align-items:center; justify-content:center;">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" style="stroke-dasharray:34; animation:s7check 6.5s ease-out infinite;"/></svg>
            </div>
          </div>
          <div style="width:236px; margin:0 auto; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:13px; padding:11px; text-align:left;">
            <div style="display:flex; align-items:center; gap:9px; padding-bottom:9px; border-bottom:1px solid rgba(255,255,255,.08);">
              <span style="width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,#ff9a56,#ff6b35);"></span>
              <div style="line-height:1.2; flex:1;"><div style="font-size:12px;color:#fff;font-weight:500;">Trabalho</div></div>
              <span style="font-size:10px;color:#4ade80;font-weight:600;">1/5</span>
            </div>
            <div style="display:flex; align-items:center; gap:9px; padding:9px 2px 2px; animation:s7row 6.5s ease-out infinite;">
              <span style="width:24px;height:24px;border-radius:5px;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;">S</span>
              <span style="font-size:12.5px; color:#fff; font-weight:500; flex:1;">Minha conta</span>
              <span style="font-size:10.5px; color:rgba(255,255,255,.55); border:1px solid rgba(255,255,255,.18); border-radius:6px; padding:3px 7px;">Conectar</span>
            </div>
          </div>
        </div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow oc-eyebrow--success">Passo 7 · Pronto</div>
        <h2 class="oc-title">Pronto! Sessão no pacote 🎉</h2>
        <p class="oc-text" style="margin-bottom:22px;">Sua sessão já faz parte do pacote. Repita em outros sites para completá-lo e depois é só compartilhar.</p>
        <div><button class="oc-cta oc-cta--green" type="button" data-oc-done>Entendi</button></div>
      </div>
    </div>

  </div>
</div>

<div class="oc-footer">
  <div class="oc-progress"><div class="oc-progress-fill"></div></div>
  <div class="oc-controls">
    <button class="oc-prev" type="button">‹ Voltar</button>
    <div class="oc-dots"></div>
    <div class="oc-right">
      <button class="oc-play" type="button" title="Reproduzir/pausar">❚❚</button>
      <button class="oc-next" type="button">Próximo ›</button>
    </div>
  </div>
</div>`;

    // ── Construção / injeção (lazy) ──
    function build() {
        if (built) return;

        overlay = document.createElement('div');
        overlay.className = 'oc-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Como adicionar uma sessão');

        card = document.createElement('div');
        card.className = 'oc-card';
        card.innerHTML = TEMPLATE;
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        track = card.querySelector('.oc-track');
        progressFill = card.querySelector('.oc-progress-fill');
        dotsWrap = card.querySelector('.oc-dots');
        prevBtn = card.querySelector('.oc-prev');
        nextBtn = card.querySelector('.oc-next');
        playBtn = card.querySelector('.oc-play');

        // Dots
        for (let i = 0; i < COUNT; i++) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'oc-dot';
            dot.setAttribute('aria-label', `Ir para o passo ${i + 1}`);
            dot.addEventListener('click', () => go(i));
            dotsWrap.appendChild(dot);
        }

        // Controles
        prevBtn.addEventListener('click', () => go(state.current - 1));
        nextBtn.addEventListener('click', onNext);
        playBtn.addEventListener('click', togglePlay);
        card.querySelector('.oc-close').addEventListener('click', close);
        card.querySelectorAll('[data-oc-done]').forEach(b => b.addEventListener('click', close));

        // Pausa ao passar o mouse pelo card
        card.addEventListener('mouseenter', () => { state.hover = true; });
        card.addEventListener('mouseleave', () => { state.hover = false; });

        // Fecha clicando fora do card (na scrim)
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

        built = true;
    }

    // ── Loop de auto-avanço ──
    function tick() {
        const now = performance.now();
        const dt = now - last;
        last = now;
        if (!state.playing || state.hover) return;

        if (state.current >= COUNT - 1) {
            if (state.progress < 1) {
                state.progress = Math.min(1, state.progress + dt / SLIDE_MS);
                renderProgress();
            }
            return;
        }

        const p = state.progress + dt / SLIDE_MS;
        if (p >= 1) {
            state.current += 1;
            state.progress = 0;
            render();
        } else {
            state.progress = p;
            renderProgress();
        }
    }

    function go(i) {
        state.current = Math.max(0, Math.min(COUNT - 1, i));
        state.progress = 0;
        render();
    }

    function onNext() {
        if (state.current >= COUNT - 1) close();
        else go(state.current + 1);
    }

    function togglePlay() {
        state.playing = !state.playing;
        playBtn.textContent = state.playing ? '❚❚' : '▶';
    }

    function renderProgress() {
        progressFill.style.width = Math.round(state.progress * 100) + '%';
    }

    function render() {
        track.style.transform = `translateX(-${state.current * 100}%)`;
        renderProgress();
        dotsWrap.querySelectorAll('.oc-dot').forEach((d, i) => {
            d.classList.toggle('active', i === state.current);
        });
        prevBtn.disabled = state.current === 0;
        nextBtn.textContent = (state.current >= COUNT - 1 ? 'Concluir' : 'Próximo') + ' ›';
    }

    function onKeydown(e) {
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowRight') onNext();
        else if (e.key === 'ArrowLeft') go(state.current - 1);
    }

    // ── API pública ──
    function open() {
        build();
        state.current = 0;
        state.progress = 0;
        state.playing = true;
        state.hover = false;
        playBtn.textContent = '❚❚';
        render();

        // força reflow para a transição de entrada disparar
        void overlay.offsetWidth;
        overlay.classList.add('show');
        document.addEventListener('keydown', onKeydown);

        last = performance.now();
        clearInterval(timer);
        timer = setInterval(tick, TICK_MS);

        markSeen();
    }

    function close() {
        if (!built) return;
        overlay.classList.remove('show');
        clearInterval(timer);
        timer = null;
        document.removeEventListener('keydown', onKeydown);
    }

    function isSeen() {
        try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
    }

    function markSeen() {
        try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* ignore */ }
    }

    window.AuthPackOnboarding = { open, close, isSeen, markSeen };
})();
