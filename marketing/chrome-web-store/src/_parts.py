MARK = '<svg viewBox="10 13 22 22" xmlns="http://www.w3.org/2000/svg"><circle cx="21" cy="24" r="11" fill="#1d1d1c" stroke="#2e2f33"/><path d="M17.6 18.8a1.2 1.2 0 0 1 1.9-1L27 22.1a1.2 1.2 0 0 1 0 1.8l-7.5 4.3a1.2 1.2 0 0 1-1.9-1Z" fill="#fdfaf6"/></svg>'

ICON = {
 'search':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
 'plus':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
 'share':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/></svg>',
 'users':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>',
 'folder':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
 'send':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14.5 3.3a.8.8 0 0 1 1 1l-4.6 15.4a.8.8 0 0 1-1.5 0l-1.8-5.6a1 1 0 0 0-.7-.7l-5.6-1.8a.8.8 0 0 1 0-1.5Z"/></svg>',
 'lock':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
 'ext':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M15.5 3.5a2.5 2.5 0 0 0-5 0V6H7a1 1 0 0 0-1 1v3.5H3.5a2.5 2.5 0 0 0 0 5H6V19a1 1 0 0 0 1 1h3.5v-2.5a2.5 2.5 0 0 1 5 0V20H19a1 1 0 0 0 1-1v-3.5h-2.5a2.5 2.5 0 0 1 0-5H20V7a1 1 0 0 0-1-1h-3.5Z"/></svg>',
 'open':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
 'check':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>',
 'cal':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
 'slash':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></svg>',
 'chev':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
}

def head(eyebrow, title, sub):
    return f'''<div class="head">
    <div class="brand">{MARK}<b>Niango</b></div>
    <div class="eyebrow"><i></i>{eyebrow}</div>
    <h1>{title}</h1>
    <p class="sub">{sub}</p>
  </div>'''

def page(css_extra, body):
    return f'''<link rel="stylesheet" href="slides.css">
<style>{css_extra}</style>
<div class="stage"><div class="grid"></div>
  {body}
</div>'''

def winbar(url_text, chip='Sessão capturada'):
    return f'''<div class="win-bar">
      <div class="dots"><i></i><i></i><i></i></div>
      <div class="url">{ICON['lock']}{url_text}</div>
      <div class="ext-slot"><span class="puzzle">{ICON['ext']}</span>
        <span class="ext-chip">{MARK}{chip}</span></div>
    </div>'''
