import eBayApi from "ebay-api";
import { readFile } from "fs/promises";

const ebayClientBuilder = async (authFilePath) => {
  const eBayAuth = JSON.parse(
    await readFile(new URL(authFilePath, import.meta.url))
  );

  const ebayClient = new eBayApi({
    appId: eBayAuth.clientId,
    certId: eBayAuth.certId,
    sandbox: false,
    devId: eBayAuth.developerId,
    marketplaceId: eBayApi.MarketplaceId.EBAY_GB,
    signature: {
      jwe: eBayAuth.digitalSignature.jwe,
      privateKey: eBayAuth.digitalSignature.privateKey,
    },
    ruName: eBayAuth.oAuth2.ruName,
  });
  // Set refresh token
  ebayClient.OAuth2.setCredentials(eBayAuth.oAuth2.credentials);
  // Get and set a user token
  ebayClient.OAuth2.setCredentials(await ebayClient.OAuth2.refreshToken());
  return ebayClient
};

export default ebayClientBuilder;
