import { loadCredentials } from "./credentialStore.js";

const credentials = await loadCredentials();

const validateCredential = (name, value) => {
  if (!value) {
    throw new Error(
      `Missing required credential: ${name}. Please run 'auth ${name.toLowerCase()}' to set it.`
    );
  }
  return value;
};

export default {
  accounting: {
    url: "https://hn93t12th7.execute-api.eu-west-2.amazonaws.com/Prod",
    apiKey: validateCredential(
      "Accounting",
      process.env.ACCOUNTING_API_KEY || credentials.accountingApiKey
    ),
  },
  starling: {
    url: "https://api.starlingbank.com/api/v2",
    accessToken: validateCredential(
      "Starling",
      process.env.STARLING_ACCESS_TOKEN || credentials.starlingAccessToken
    ),
  },
};
