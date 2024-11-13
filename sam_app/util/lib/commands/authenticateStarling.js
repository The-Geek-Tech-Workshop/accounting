import { storeCredential } from "../credentialStore.js";

export const authenticateStarling = async (token) => {
  try {
    await storeCredential("starlingAccessToken", token);
    console.log("Starling Bank token stored successfully");
  } catch (error) {
    console.error("Failed to store Starling token:", error.message);
    process.exit(1);
  }
};
