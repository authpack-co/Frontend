/**
 * AuthPack — Guia de Onboarding (carrossel)
 *
 * Abre um slide de boas-vindas e depois 3 seções, com abas no topo (dá pra
 * saltar):
 *   1. Criar um pacote
 *   2. Adicionar sessões ao pacote
 *   3. Compartilhar o pacote
 *
 * O guia abre sozinho no primeiro acesso ao dashboard e só para de aparecer
 * quando o usuário PULA ou CONCLUI — fechar no × ou no Esc é "agora não", e
 * ele volta no próximo carregamento. Por isso o markSeen() não mora no open().
 *
 * Entrada contextual: quem acabou de criar o primeiro pacote entra direto na
 * Seção 2 (pula "criar"), e o botão "Ver como funciona" entra na Seção 1.
 *
 * A captura das sessões acontece na própria plataforma; a extensão é o motor
 * que abre e fecha as abas por baixo. Ela é apresentada num slide de intro
 * (sem link, pra não tirar o usuário do fluxo) e o link de instalar aparece
 * só no slide final.
 *
 * API pública:
 *   AuthPackOnboarding.open({ startSection })  → 'create' | 'sessions' | 'share'
 *   AuthPackOnboarding.close()   fecha sem marcar (o guia volta depois)
 *   AuthPackOnboarding.skip()    pular  → marca como visto
 *   AuthPackOnboarding.finish()  concluir → marca como visto
 *   AuthPackOnboarding.isSeen() / markSeen()
 */
(function () {
    'use strict';

    const ICON = '/assets/images/favicon-128x128.png';
    const EXT_URL = 'https://chromewebstore.google.com/detail/authpack-studio/fncdgjcpelomihdflipojhkmgoicckpm';
    const SEEN_KEY = 'authpack-session-tutorial-seen';
    const SLIDE_MS = 7000;
    const TICK_MS = 33;

    const CURSOR = `<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="#0f172a" stroke-width="1.4" stroke-linejoin="round" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));"><path d="M5 3l14 7-6 1.6L9.4 19 5 3z"/></svg>`;

    // ── Seções ──
    const SECTIONS = [
        { id: 'create', label: 'Criar pacote' },
        { id: 'sessions', label: 'Adicionar sessões' },
        { id: 'share', label: 'Compartilhar' },
    ];

    // ═══════════════════════ SLIDES (HTML) ═══════════════════════

    // ---- Boas-vindas (fora das seções) ----
    const S_WELCOME = `
    <div class="oc-slide">
      <div class="oc-demo oc-demo--center">
        <div style="text-align:center;">
          <div style="position:relative; width:104px; height:104px; margin:0 auto 26px;">
            <span style="position:absolute; inset:-10px; border:2px solid #60a5fa; border-radius:30px; animation:s3ring 3s ease-out infinite;"></span>
            <img src="${ICON}" alt="" style="width:104px; height:104px; border-radius:26px; display:block; box-shadow:0 22px 48px rgba(0,0,0,.5); animation:ocFloat 5s ease-in-out infinite;">
          </div>
          <div style="display:flex; align-items:center; justify-content:center; gap:10px;">
            <span style="width:38px; height:38px; border-radius:11px; background:linear-gradient(135deg,#ff9a56,#ff6b35); animation:ocRise .5s ease both;"></span>
            <span style="width:38px; height:38px; border-radius:11px; background:linear-gradient(135deg,#22c55e,#16a34a); animation:ocRise .5s .1s ease both;"></span>
            <span style="width:38px; height:38px; border-radius:11px; background:linear-gradient(135deg,#60a5fa,#2563eb); animation:ocRise .5s .2s ease both;"></span>
            <span style="width:38px; height:38px; border-radius:11px; background:linear-gradient(135deg,#c084fc,#7c3aed); animation:ocRise .5s .3s ease both;"></span>
          </div>
          <div style="margin-top:16px; font-size:11.5px; color:rgba(255,255,255,.55); font-weight:500;">Suas sessões, num lugar só</div>
        </div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow">Bem-vindo</div>
        <h2 class="oc-title">Bem-vindo ao AuthPack</h2>
        <p class="oc-text">Distribua e controle seus acessos em um só lugar. Em menos de um minuto você vê como criar um pacote, adicionar suas sessões e compartilhar o acesso — sem nunca revelar a sua senha.</p>
      </div>
    </div>`;

    // ---- Seção 1 · Criar um pacote ----
    const S_CREATE_1 = `
    <div class="oc-slide">
      <div class="oc-demo">
        <div style="position:absolute; left:36px; top:74px; width:368px; height:326px; background:#fff; border-radius:14px; box-shadow:0 26px 55px rgba(0,0,0,.5); overflow:hidden;">
          <div style="padding:15px 18px; border-bottom:1px solid #eef0f3; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; gap:16px;">
              <span style="font-size:13px; font-weight:700; color:#111827;">Minha coleção</span>
              <span style="font-size:13px; font-weight:600; color:#9ca3af;">Meus acessos</span>
            </div>
            <span style="font-size:11px; font-weight:600; color:#fff; background:#2563eb; border-radius:7px; padding:6px 10px;">Novo pacote</span>
          </div>
          <div style="padding:20px; opacity:.5;">
            <div style="height:10px; width:46%; background:#eceef1; border-radius:5px; margin-bottom:12px;"></div>
            <div style="height:64px; background:#f1f3f5; border-radius:10px;"></div>
          </div>
        </div>
        <div style="position:absolute; left:70px; top:150px; width:300px; background:#fff; border-radius:14px; box-shadow:0 24px 50px rgba(0,0,0,.4); overflow:hidden; animation:ocRise .5s ease both;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:13px 15px; border-bottom:1px solid #eef0f3;">
            <span style="font-size:13.5px; font-weight:600; color:#111827;">Crie um novo pacote</span>
            <span style="color:#9ca3af; font-size:16px;">×</span>
          </div>
          <div style="padding:14px 15px;">
            <div style="display:flex; gap:8px;">
              <div style="flex:1; display:flex; align-items:center; background:#f3f4f6; border:1px solid #2563eb; border-radius:9px; padding:0 11px; height:38px;">
                <span style="font-size:13px; color:#111827; font-weight:500;">Trabalho</span>
                <span style="width:1.5px; height:16px; background:#2563eb; margin-left:1px; animation:apBlink .9s steps(1) infinite;"></span>
              </div>
              <button style="background:#2563eb; color:#fff; border:none; border-radius:9px; padding:0 16px; font-size:13px; font-weight:600;">Ok</button>
            </div>
            <div style="font-size:11px; color:#9ca3af; margin-top:11px; line-height:1.45;">Crie pacotes para organizar suas sessões e compartilhar com outras pessoas.</div>
          </div>
        </div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow">Seção 1 · Criar um pacote</div>
        <h2 class="oc-title">Crie o seu pacote</h2>
        <p class="oc-text">Um <strong>pacote</strong> guarda suas sessões de login. Clique em <strong>Novo pacote</strong>, dê um nome — como “Trabalho” — e confirme. É o primeiro passo.</p>
      </div>
    </div>`;

    const S_CREATE_2 = `
    <div class="oc-slide">
      <div class="oc-demo oc-demo--center">
        <div style="width:290px; background:#fff; border-radius:16px; box-shadow:0 22px 50px rgba(0,0,0,.4); padding:15px; animation:ocFloat 5s ease-in-out infinite;">
          <div style="display:flex; align-items:center; gap:11px; padding-bottom:12px; border-bottom:1px solid #f0f1f3;">
            <span style="width:36px; height:36px; border-radius:9px; background:linear-gradient(135deg,#ff9a56,#ff6b35); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-family:'Sora',sans-serif;">T</span>
            <div style="flex:1; line-height:1.25;"><div style="font-size:14px; font-weight:600; color:#111827; font-family:'Sora',sans-serif;">Trabalho</div><div style="font-size:11px; color:#9ca3af;">criado agora mesmo</div></div>
            <span style="font-family:'Fira Code',monospace; font-size:10.5px; color:#6b7280; background:#f3f4f6; border-radius:6px; padding:3px 7px;">0/5</span>
          </div>
          <div style="display:flex; align-items:center; justify-content:center; gap:7px; margin-top:13px; border:1.5px dashed #d1d5db; border-radius:10px; padding:14px; color:#9ca3af; font-size:12.5px; font-weight:500;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>Adicionar sessão
          </div>
        </div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow">Seção 1 · Criar um pacote</div>
        <h2 class="oc-title">Pronto — pacote criado</h2>
        <p class="oc-text">Ele aparece <strong>vazio</strong> na sua coleção. Agora é só preencher com as sessões dos serviços que você usa. Vamos ver como na próxima seção.</p>
      </div>
    </div>`;

    // ---- Seção 2 · Adicionar sessões ----
    // O fluxo todo acontece na plataforma: o usuário escolhe os serviços aqui e
    // a extensão abre, captura e fecha as abas por baixo.
    const S_EXT_INTRO = `
    <div class="oc-slide">
      <div class="oc-demo oc-demo--center">
        <div style="width:300px;">
          <div style="background:#eef0f3; border:1px solid #e3e6ea; border-radius:12px; padding:12px 14px; display:flex; align-items:center; gap:10px; box-shadow:0 18px 40px rgba(0,0,0,.35);">
            <div style="flex:1; height:26px; background:#fff; border:1px solid #e1e4e9; border-radius:13px;"></div>
            <span style="width:26px; height:26px; border-radius:7px; display:flex; align-items:center; justify-content:center; color:#5b6573;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 19.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0"/><path d="M4.39 8.61a1 1 0 0 0 .474 1.68 2.5 2.5 0 1 1-3.014 3.015 1 1 0 0 0-1.68.474"/></svg></span>
            <div style="position:relative;">
              <span style="position:absolute; inset:-6px; border:2px solid #60a5fa; border-radius:11px; animation:s3ring 2.6s ease-out infinite;"></span>
              <img src="${ICON}" alt="" style="width:26px; height:26px; border-radius:6px; display:block;">
            </div>
          </div>
          <div style="margin-top:14px; text-align:center; font-size:11.5px; color:rgba(255,255,255,.55); font-weight:500;">A extensão do AuthPack, fixada na barra do navegador</div>
        </div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow">Seção 2 · Adicionar sessões</div>
        <h2 class="oc-title">A extensão trabalha por baixo</h2>
        <p class="oc-text">Você faz tudo <strong>aqui na plataforma</strong> — quem abre os sites e captura as sessões com segurança é a <strong>extensão do navegador</strong>. Não precisa buscar agora: o link pra instalar está no <strong>final deste guia</strong>.</p>
      </div>
    </div>`;

    const S_ADD_OPEN = `
    <div class="oc-slide">
      <div class="oc-demo">
        <div style="position:absolute; left:26px; top:96px; width:388px; height:300px; background:#fff; border-radius:14px; box-shadow:0 26px 55px rgba(0,0,0,.5); overflow:hidden;">
          <div style="display:flex; align-items:center; gap:8px; padding:13px 14px; border-bottom:1px solid #eef0f3;">
            <div style="flex:1; height:30px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:9px;"></div>
            <span style="font-size:10.5px; font-weight:600; color:#374151; background:#f4f6f9; border:1px solid #d1d5db; border-radius:7px; padding:7px 10px;">Compartilhar</span>
            <span style="position:relative; font-size:10.5px; font-weight:600; color:#fff; background:#2563eb; border-radius:7px; padding:7px 10px; white-space:nowrap;">
              + Adicionar sessão
              <span style="position:absolute; inset:-5px; border:2px solid #60a5fa; border-radius:11px; animation:s3ring 6.5s ease-out infinite;"></span>
            </span>
          </div>
          <div style="padding:14px;">
            <div style="font-size:11px; font-weight:700; color:#111827; margin-bottom:3px;">Trabalho</div>
            <div style="font-size:10px; color:#9ca3af; margin-bottom:13px;">Nenhuma sessão ainda</div>
            <div style="border:1px solid #e5e7eb; border-radius:11px; overflow:hidden;">
              <div style="display:flex; gap:12px; padding:9px 14px; background:#f9fafb;">
                <span style="flex:1.6; font-size:8.5px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:#6b7280;">Serviço</span>
                <span style="flex:.8; font-size:8.5px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:#6b7280;">Status</span>
                <span style="flex:1; font-size:8.5px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:#6b7280;">Usando agora</span>
              </div>
              <div style="display:flex; align-items:center; justify-content:center; height:96px; border-top:1px solid #eef0f3; color:#9ca3af; font-size:11.5px;">
                Suas sessões aparecerão aqui
              </div>
            </div>
          </div>
        </div>
        <div style="position:absolute; left:0; top:0; animation:ocCurAdd 6.5s ease-in-out infinite; z-index:9;">${CURSOR}</div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow">Seção 2 · Adicionar sessões</div>
        <h2 class="oc-title">Clique em “Adicionar sessão”</h2>
        <p class="oc-text">Com o pacote aberto, o botão <strong>Adicionar sessão</strong> fica no topo da própria plataforma. Não precisa sair daqui nem abrir a extensão.</p>
      </div>
    </div>`;

    const S_ADD_PICK = `
    <div class="oc-slide">
      <div class="oc-demo oc-demo--center">
        <div style="width:326px; background:#fff; border-radius:16px; box-shadow:0 26px 55px rgba(0,0,0,.45); overflow:hidden; animation:ocRise .5s ease both;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:13px 15px; border-bottom:1px solid #eef0f3;">
            <div style="line-height:1.25;">
              <div style="font-size:13px; font-weight:600; color:#111827;">Adicionar sessão</div>
              <div style="font-size:10px; color:#9ca3af;">Trabalho</div>
            </div>
            <span style="color:#9ca3af; font-size:16px;">×</span>
          </div>
          <div style="padding:14px 15px;">
            <div style="display:flex; align-items:center; gap:8px; background:#f3f4f6; border:1px solid #2563eb; border-radius:10px; padding:0 11px; height:36px; overflow:hidden;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <span style="white-space:nowrap; overflow:hidden; display:inline-block; animation:ocPickType 6.5s ease-in-out infinite; font-size:12px; color:#111827; font-weight:500;">Netflix</span>
              <span style="width:1.5px; height:15px; background:#2563eb; display:inline-block; animation:apBlink .9s steps(1) infinite;"></span>
            </div>

            <div style="margin-top:11px; animation:ocPickChip 6.5s ease-out infinite;">
              <span style="display:inline-flex; align-items:center; gap:7px; background:rgba(37,99,235,.08); border:1px solid #dbeafe; border-radius:99px; padding:5px 10px 5px 6px;">
                <span style="width:18px;height:18px;border-radius:5px;background:linear-gradient(135deg,#ef4444,#b91c1c);"></span>
                <span style="font-size:11px; font-weight:600; color:#1d4ed8;">Netflix</span>
                <span style="color:#60a5fa; font-size:12px;">×</span>
              </span>
            </div>

            <div style="display:flex; align-items:center; gap:9px; margin:13px 0 10px;">
              <span style="flex:1; height:1px; background:#eef0f3;"></span>
              <span style="font-size:9.5px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:#9ca3af;">Serviços populares</span>
              <span style="flex:1; height:1px; background:#eef0f3;"></span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px;">
              <div style="border:1px solid #e5e7eb; border-radius:10px; padding:9px 4px; text-align:center;"><span style="display:block; width:22px;height:22px;margin:0 auto 5px;border-radius:6px;background:linear-gradient(135deg,#22c55e,#16a34a);"></span><span style="font-size:8.5px; color:#6b7280;">Spotify</span></div>
              <div style="border:1px solid #e5e7eb; border-radius:10px; padding:9px 4px; text-align:center;"><span style="display:block; width:22px;height:22px;margin:0 auto 5px;border-radius:6px;background:linear-gradient(135deg,#374151,#111827);"></span><span style="font-size:8.5px; color:#6b7280;">ChatGPT</span></div>
              <div style="border:1px solid #e5e7eb; border-radius:10px; padding:9px 4px; text-align:center;"><span style="display:block; width:22px;height:22px;margin:0 auto 5px;border-radius:6px;background:linear-gradient(135deg,#c084fc,#7c3aed);"></span><span style="font-size:8.5px; color:#6b7280;">Figma</span></div>
              <div style="border:1px solid #e5e7eb; border-radius:10px; padding:9px 4px; text-align:center;"><span style="display:block; width:22px;height:22px;margin:0 auto 5px;border-radius:6px;background:linear-gradient(135deg,#60a5fa,#2563eb);"></span><span style="font-size:8.5px; color:#6b7280;">Notion</span></div>
            </div>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; padding:11px 15px; border-top:1px solid #eef0f3; background:#f9fafb;">
            <span style="font-size:10.5px; color:#6b7280;">1 serviço adicionado</span>
            <span style="font-size:11.5px; font-weight:600; color:#fff; background:#2563eb; border-radius:8px; padding:7px 14px; animation:ocPulse 2.4s ease-in-out infinite;">Adicionar</span>
          </div>
        </div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow">Seção 2 · Adicionar sessões</div>
        <h2 class="oc-title">Escolha os serviços</h2>
        <p class="oc-text">Busque pelo nome, cole a URL ou clique num dos <strong>serviços populares</strong>. Dá pra escolher vários de uma vez — só precisa <strong>já estar logado</strong> neles neste navegador.</p>
      </div>
    </div>`;

    const S_ADD_CAPTURE = `
    <div class="oc-slide">
      <div class="oc-demo oc-demo--center">
        <div style="width:326px; background:#fff; border-radius:16px; box-shadow:0 26px 55px rgba(0,0,0,.45); overflow:hidden;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:13px 15px; border-bottom:1px solid #eef0f3;">
            <div style="font-size:13px; font-weight:600; color:#111827;">Adicionar sessão</div>
            <span style="color:#9ca3af; font-size:16px;">×</span>
          </div>
          <div style="padding:14px 15px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
              <span style="font-size:12px; font-weight:600; color:#111827;">Capturando sessões…</span>
              <span style="font-family:'Fira Code',monospace; font-size:10.5px; color:#6b7280;">2/3</span>
            </div>
            <div style="height:5px; background:#eef0f3; border-radius:99px; overflow:hidden; margin-bottom:14px;">
              <div style="height:100%; background:#2563eb; border-radius:99px; animation:ocBar 6.5s ease-in-out infinite;"></div>
            </div>

            <div style="display:flex; align-items:center; gap:10px; padding:9px 0;">
              <span style="width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,#ef4444,#b91c1c);flex-shrink:0;"></span>
              <span style="flex:1; font-size:12px; color:#111827; font-weight:500;">Netflix</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <div style="display:flex; align-items:center; gap:10px; padding:9px 0; border-top:1px solid #f3f4f6;">
              <span style="width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,#22c55e,#16a34a);flex-shrink:0;"></span>
              <span style="flex:1; font-size:12px; color:#111827; font-weight:500;">Spotify</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="animation:ocRowDone 6.5s ease-out infinite;"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <div style="display:flex; align-items:center; gap:10px; padding:9px 0; border-top:1px solid #f3f4f6;">
              <span style="width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,#374151,#111827);flex-shrink:0;"></span>
              <span style="flex:1; font-size:12px; color:#111827; font-weight:500;">ChatGPT</span>
              <span style="width:15px;height:15px;border:2px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;animation:apSpin .8s linear infinite;"></span>
            </div>

            <div style="display:flex; align-items:center; gap:7px; margin-top:12px; background:#f4f6f9; border:1px solid #e5e7eb; border-radius:9px; padding:9px 11px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              <span style="font-size:10.5px; color:#6b7280; line-height:1.4;">Mantenha esta aba aberta — as abas dos serviços abrem e fecham sozinhas.</span>
            </div>
          </div>
        </div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow">Seção 2 · Adicionar sessões</div>
        <h2 class="oc-title">O AuthPack captura pra você</h2>
        <p class="oc-text">Clique em <strong>Adicionar</strong> e pronto. Cada serviço abre e fecha numa aba sozinho enquanto a captura acontece — é só <strong>manter esta aba aberta</strong> e acompanhar. Ao final, as sessões já estão no pacote.</p>
      </div>
    </div>`;

    // ---- Seção 3 · Compartilhar ----
    const S_SHARE_MENU = `
    <div class="oc-slide">
      <div class="oc-demo">
        <div style="position:absolute; left:92px; top:80px; width:256px; background:rgba(24,26,30,.97); border:1px solid rgba(255,255,255,.13); border-radius:18px; box-shadow:0 30px 60px rgba(0,0,0,.55); padding:14px;">
          <div style="display:flex; align-items:center; gap:9px; padding-bottom:11px; border-bottom:1px solid rgba(255,255,255,.08);">
            <span style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ff8a65,#f06292);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">JS</span>
            <div style="line-height:1.15;"><div style="font-size:10px;color:rgba(255,255,255,.5);">Olá,</div><div style="font-size:13px;color:#fff;font-weight:600;">João</div></div>
            <img src="${ICON}" alt="" style="width:22px;height:22px;border-radius:5px;margin-left:auto;">
          </div>
          <div style="margin-top:13px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12); border-radius:12px;">
            <div style="position:relative; display:flex; align-items:center; gap:10px; padding:12px;">
              <span style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#ff9a56,#ff6b35);"></span>
              <div style="line-height:1.25; flex:1;"><div style="font-size:10px;color:rgba(255,255,255,.55);">3 sessões</div><div style="font-size:13px;color:#fff;font-weight:500;">Trabalho</div></div>
              <span style="font-size:10px;color:#4ade80;margin-right:4px;">3/5</span>
              <span style="color:#fff; font-size:15px; letter-spacing:1px;">···</span>
            </div>
          </div>
          <div style="position:absolute; right:16px; top:126px; width:140px; background:#2d2f30; border:1px solid #5e5d5d; border-radius:10px; box-shadow:0 14px 30px rgba(0,0,0,.5); overflow:hidden; padding:3px; z-index:5;">
            <div style="display:flex; align-items:center; gap:8px; padding:7px 9px; border-radius:7px; color:#e5e7eb; font-size:11.5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 16h6"/><path d="M19 13v6"/><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg>
              Nova sessão
            </div>
            <div style="display:flex; align-items:center; gap:8px; padding:7px 9px; border-radius:7px; color:#fff; font-size:11.5px; animation:s5hl 6.5s ease-in-out infinite;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/></svg>
              Compartilhar
            </div>
            <div style="display:flex; align-items:center; gap:8px; padding:7px 9px; border-radius:7px; color:#e5e7eb; font-size:11.5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>
              Editar
            </div>
          </div>
        </div>
        <div style="position:absolute; left:0; top:0; animation:s5cur 6.5s ease-in-out infinite; z-index:9;">${CURSOR}</div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow">Seção 3 · Compartilhar</div>
        <h2 class="oc-title">Abra o menu e clique em “Compartilhar”</h2>
        <p class="oc-text">Com o pacote pronto, abra o menu dos <strong>três pontinhos</strong> e escolha <strong>Compartilhar</strong>. É aqui que você gera o acesso para outras pessoas.</p>
      </div>
    </div>`;

    const S_SHARE_MODAL = `
    <div class="oc-slide">
      <div class="oc-demo oc-demo--center">
        <div style="width:308px; background:#fff; border-radius:15px; box-shadow:0 26px 55px rgba(0,0,0,.45); overflow:hidden; animation:ocRise .5s ease both;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid #eef0f3;">
            <span style="font-size:13.5px; font-weight:600; color:#111827;">Compartilhar pacote</span>
            <span style="color:#9ca3af; font-size:16px;">×</span>
          </div>
          <div style="padding:15px 16px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
              <div style="line-height:1.3;"><div style="font-size:12.5px; font-weight:600; color:#111827;">Link público</div><div style="font-size:10.5px; color:#9ca3af;">Quem tem o link ativa o pacote</div></div>
              <span style="width:36px; height:21px; border-radius:99px; background:#22c55e; position:relative; flex-shrink:0;"><span style="position:absolute; top:2px; right:2px; width:17px; height:17px; border-radius:50%; background:#fff;"></span></span>
            </div>
            <div style="display:flex; gap:8px;">
              <div style="flex:1; display:flex; align-items:center; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:9px; padding:0 11px; height:36px; font-family:'Fira Code',monospace; font-size:11px; color:#6b7280; overflow:hidden; white-space:nowrap;">authpack.co/p/x9f2k…</div>
              <button style="background:#2563eb; color:#fff; border:none; border-radius:9px; padding:0 14px; font-size:12.5px; font-weight:600; animation:ocPulse 2.4s ease-in-out infinite;">Copiar</button>
            </div>
            <div style="display:flex; align-items:center; gap:7px; margin-top:13px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:9px; padding:9px 11px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span style="font-size:11px; color:#15803d; font-weight:600;">A sua senha nunca é revelada</span>
            </div>
          </div>
        </div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow">Seção 3 · Compartilhar</div>
        <h2 class="oc-title">Envie o link — sem senhas</h2>
        <p class="oc-text">Ative o <strong>link público</strong> (ou gere um <strong>link único</strong>) e envie para quem quiser. A pessoa entra no serviço direto pela sessão — <strong>sem nunca ver a sua senha</strong>.</p>
      </div>
    </div>`;

    // ---- Final ----
    const S_FINAL = `
    <div class="oc-slide">
      <div class="oc-demo oc-demo--success">
        <div style="text-align:center;">
          <div style="position:relative; width:96px; height:96px; margin:0 auto 22px;">
            <div style="position:absolute; inset:0; border-radius:50%; background:radial-gradient(circle, rgba(34,197,94,.35), transparent 70%); animation:s7burst 3.4s ease-out infinite;"></div>
            <div style="position:absolute; inset:12px; border-radius:50%; background:#22c55e; box-shadow:0 12px 30px rgba(34,197,94,.45); animation:s7ring 3.4s ease-out infinite; display:flex; align-items:center; justify-content:center;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" style="stroke-dasharray:34; animation:s7check 3.4s ease-out infinite;"/></svg>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:9px; width:236px; margin:0 auto; text-align:left;">
            <div style="display:flex; align-items:center; gap:9px; color:rgba(255,255,255,.85); font-size:12.5px;"><span style="width:20px;height:20px;border-radius:6px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;color:#4ade80;">✓</span>Pacote criado</div>
            <div style="display:flex; align-items:center; gap:9px; color:rgba(255,255,255,.85); font-size:12.5px;"><span style="width:20px;height:20px;border-radius:6px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;color:#4ade80;">✓</span>Sessões adicionadas</div>
            <div style="display:flex; align-items:center; gap:9px; color:rgba(255,255,255,.85); font-size:12.5px;"><span style="width:20px;height:20px;border-radius:6px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;color:#4ade80;">✓</span>Acesso compartilhado</div>
          </div>
        </div>
      </div>
      <div class="oc-copy">
        <div class="oc-eyebrow oc-eyebrow--success">Tudo pronto</div>
        <h2 class="oc-title">É só começar 🎉</h2>
        <p class="oc-text" style="margin-bottom:24px;">Você já sabe criar um pacote, adicionar sessões e compartilhar. Falta só um passo: instale a extensão para capturar suas sessões com um clique.</p>
        <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
          <a class="oc-cta oc-cta--blue" href="${EXT_URL}" target="_blank" rel="noopener"><img src="${ICON}" alt=""> Instalar extensão</a>
          <button class="oc-done-btn" type="button" data-oc-done>Começar a usar</button>
        </div>
      </div>
    </div>`;

    // Ordem achatada dos slides + a que seção cada um pertence.
    // sec -1 = fora das seções (boas-vindas): nenhuma aba fica ativa nele.
    const SLIDES = [
        { sec: -1, html: S_WELCOME },
        { sec: 0, html: S_CREATE_1 },
        { sec: 0, html: S_CREATE_2 },
        { sec: 1, html: S_EXT_INTRO },
        { sec: 1, html: S_ADD_OPEN },
        { sec: 1, html: S_ADD_PICK },
        { sec: 1, html: S_ADD_CAPTURE },
        { sec: 2, html: S_SHARE_MENU },
        { sec: 2, html: S_SHARE_MODAL },
        { sec: 2, html: S_FINAL },
    ];
    const COUNT = SLIDES.length;

    const sectionStart = (si) => SLIDES.findIndex(s => s.sec === si);
    const sectionSize = (si) => SLIDES.filter(s => s.sec === si).length;

    // ═══════════════════════ RUNTIME ═══════════════════════

    let built = false;
    let overlay, card, track, progressFill, dotsWrap, tabsWrap, prevBtn, nextBtn, playBtn, skipBtn;
    let timer = null;
    let last = 0;
    const state = { current: 0, progress: 0, playing: true, hover: false };

    function template() {
        const tabs = SECTIONS.map((s, i) =>
            `<button class="oc-tab" type="button" data-sec="${i}"><span class="oc-tab-num">${i + 1}</span><span class="oc-tab-label">${s.label}</span></button>`
        ).join('');

        return `
<button class="oc-close" type="button" title="Fechar">&times;</button>
<div class="oc-head">${tabs}</div>
<div class="oc-viewport">
  <div class="oc-track">${SLIDES.map(s => s.html).join('')}</div>
</div>
<div class="oc-footer">
  <div class="oc-progress"><div class="oc-progress-fill"></div></div>
  <div class="oc-controls">
    <div class="oc-left">
      <button class="oc-prev" type="button">‹ Voltar</button>
      <button class="oc-skip" type="button">Pular</button>
    </div>
    <div class="oc-dots"></div>
    <div class="oc-right">
      <button class="oc-play" type="button" title="Reproduzir/pausar">❚❚</button>
      <button class="oc-next" type="button">Próximo ›</button>
    </div>
  </div>
</div>`;
    }

    function build() {
        if (built) return;

        overlay = document.createElement('div');
        overlay.className = 'oc-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Guia do AuthPack');

        card = document.createElement('div');
        card.className = 'oc-card';
        card.innerHTML = template();
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        track = card.querySelector('.oc-track');
        progressFill = card.querySelector('.oc-progress-fill');
        dotsWrap = card.querySelector('.oc-dots');
        tabsWrap = card.querySelector('.oc-head');
        prevBtn = card.querySelector('.oc-prev');
        nextBtn = card.querySelector('.oc-next');
        playBtn = card.querySelector('.oc-play');
        skipBtn = card.querySelector('.oc-skip');

        // Abas de seção
        tabsWrap.querySelectorAll('.oc-tab').forEach(tab => {
            tab.addEventListener('click', () => go(sectionStart(Number(tab.dataset.sec))));
        });

        // Controles. Só "Pular" e "Concluir" encerram o guia de vez; o × e o
        // clique fora são "agora não" e ele volta no próximo carregamento.
        prevBtn.addEventListener('click', () => go(state.current - 1));
        nextBtn.addEventListener('click', onNext);
        playBtn.addEventListener('click', togglePlay);
        skipBtn.addEventListener('click', skip);
        card.querySelector('.oc-close').addEventListener('click', close);
        card.querySelectorAll('[data-oc-done]').forEach(b => b.addEventListener('click', finish));

        card.addEventListener('mouseenter', () => { state.hover = true; });
        card.addEventListener('mouseleave', () => { state.hover = false; });
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
        if (state.current >= COUNT - 1) finish();
        else go(state.current + 1);
    }

    function togglePlay() {
        state.playing = !state.playing;
        playBtn.textContent = state.playing ? '❚❚' : '▶';
    }

    function renderProgress() {
        progressFill.style.width = Math.round(state.progress * 100) + '%';
    }

    function renderDots() {
        const sec = SLIDES[state.current].sec;
        const start = sectionStart(sec);
        const size = sectionSize(sec);
        const activeInSec = state.current - start;

        dotsWrap.innerHTML = '';
        for (let i = 0; i < size; i++) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'oc-dot' + (i === activeInSec ? ' active' : '');
            dot.setAttribute('aria-label', `Ir para o passo ${i + 1}`);
            dot.addEventListener('click', () => go(start + i));
            dotsWrap.appendChild(dot);
        }
    }

    function render() {
        track.style.transform = `translateX(-${state.current * 100}%)`;
        renderProgress();
        renderDots();

        const sec = SLIDES[state.current].sec;
        tabsWrap.querySelectorAll('.oc-tab').forEach((tab, i) => {
            tab.classList.toggle('active', i === sec);
        });

        prevBtn.disabled = state.current === 0;

        const isLast = state.current >= COUNT - 1;
        nextBtn.textContent = (isLast ? 'Concluir' : 'Próximo') + ' ›';
        // No último slide "Próximo" já vira "Concluir": um "Pular" ao lado
        // seria a mesma saída com outro nome.
        skipBtn.hidden = isLast;
    }

    function onKeydown(e) {
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowRight') onNext();
        else if (e.key === 'ArrowLeft') go(state.current - 1);
    }

    // ── API pública ──
    function open(opts) {
        build();

        // Entrada contextual: começa na seção pedida (default: começo).
        let startIdx = 0;
        const startSection = opts && opts.startSection;
        if (startSection) {
            const si = SECTIONS.findIndex(s => s.id === startSection);
            if (si >= 0) startIdx = sectionStart(si);
        }

        state.current = startIdx;
        state.progress = 0;
        state.playing = true;
        state.hover = false;
        playBtn.textContent = '❚❚';
        render();

        void overlay.offsetWidth;
        overlay.classList.add('show');
        document.addEventListener('keydown', onKeydown);

        last = performance.now();
        clearInterval(timer);
        timer = setInterval(tick, TICK_MS);
    }

    function close() {
        if (!built) return;
        overlay.classList.remove('show');
        clearInterval(timer);
        timer = null;
        document.removeEventListener('keydown', onKeydown);
    }

    // As duas únicas saídas que aposentam o guia.
    function skip() {
        markSeen();
        close();
    }

    function finish() {
        markSeen();
        close();
    }

    function isSeen() {
        try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
    }

    function markSeen() {
        try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* ignore */ }
    }

    window.AuthPackOnboarding = { open, close, skip, finish, isSeen, markSeen };
})();
