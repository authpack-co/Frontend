// Ambiente do site estático.
//
// Era uma constante editada à mão antes de cada deploy — e bastava esquecer
// para o site em produção falar com 127.0.0.1, ou o painel em dev falar com a
// API de produção e tomar CORS. O resto do código (home.js, landing.js,
// footer.js, admin.js e o guard do painel) sempre decidiu pelo hostname;
// aqui só passou a fazer o mesmo.
const IS_DEV = window.location.hostname === '127.0.0.1'
    || window.location.hostname === 'localhost';

const ENV = IS_DEV ? 'dev' : 'prod';

// Sem chave de pagamento no client: o checkout é hospedado pela Stripe, então
// nenhum dado de cartão passa por aqui.
