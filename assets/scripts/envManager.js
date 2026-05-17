const ENV = "prod";
const IS_DEV = ENV === "dev";

const PAGARME_PUBLIC_KEY = IS_DEV
    ? "pk_test_lm7BOnMhgiJ3Ng3Q"
    : "pk_xkd0EzTdvUlz2eoA";