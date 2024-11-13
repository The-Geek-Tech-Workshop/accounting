import { storeCredential } from "../credentialStore.js";

export const authenticateAccounting = async (key) => {
  try {
    await storeCredential("accountingApiKey", key);
    console.log("Accounting API key stored successfully");
  } catch (error) {
    console.error("Failed to store Accounting key:", error.message);
    process.exit(1);
  }
};
