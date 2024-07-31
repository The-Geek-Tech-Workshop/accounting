import eBayApi from "ebay-api";
import { readFile } from "fs/promises";
import open from "open";
import querystring from "node:querystring";

const eBayAuth = JSON.parse(
  await readFile(new URL("./ebay-auth.json", import.meta.url))
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

ebayClient.OAuth2.setScope([
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.marketing.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.marketing",
  "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  "https://api.ebay.com/oauth/api_scope/sell.analytics.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.finances",
  "https://api.ebay.com/oauth/api_scope/sell.payment.dispute",
  "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.reputation",
  "https://api.ebay.com/oauth/api_scope/sell.reputation.readonly",
  "https://api.ebay.com/oauth/api_scope/commerce.notification.subscription",
  "https://api.ebay.com/oauth/api_scope/commerce.notification.subscription.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.stores",
  "https://api.ebay.com/oauth/api_scope/sell.stores.readonly",
]);

if (process.argv.length == 2) {
  await open(ebayClient.OAuth2.generateAuthUrl());
} else {
  const rawUrl = process.argv[2];
  const code = querystring.parse(
    rawUrl.substring(rawUrl.indexOf("?") + 1)
  ).code;
  const token = await ebayClient.OAuth2.getToken(code);
  console.log(JSON.stringify(token));
  //   const code = parsedUrl.query.code;
  //   console.log(`CODE IS: ${code}`);
}
