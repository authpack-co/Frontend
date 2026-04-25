const ENV = "dev";
const IS_DEV = ENV === "dev";

// Pagar.me public key (safe to expose client-side — used for card tokenization)
const PAGARME_PUBLIC_KEY = IS_DEV
    ? "pk_test_lm7BOnMhgiJ3Ng3Q"   // TODO: replace with your test public key
    : "pk_XXXXXXXXXXXXXXXX";        // TODO: replace with your live public key