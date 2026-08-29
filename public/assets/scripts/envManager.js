const ENV = "prod";
const IS_DEV = ENV === "dev";

// Sem chave de pagamento no client: o checkout é hospedado pela Stripe, então
// nenhum dado de cartão passa por aqui.