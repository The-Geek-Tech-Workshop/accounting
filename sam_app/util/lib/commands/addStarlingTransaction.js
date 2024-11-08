import fetch from "node-fetch";
import { randomUUID } from "crypto";
import config from "../config.js";

export const addStarlingTransaction = async ({
  accountUid,
  categoryUid,
  feedItemUid,
}) => {
  try {
    // Fetch account holder details
    const accountHolderResponse = await fetch(
      `${config.starling.url}/account-holder`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.starling.accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!accountHolderResponse.ok) {
      throw new Error(
        `Starling API account-holder error: ${accountHolderResponse.status} ${accountHolderResponse.statusText}`
      );
    }

    const accountHolderData = await accountHolderResponse.json();

    // Construct the URL for a specific feed item
    const starlingApiUrl = `${config.starling.url}/feed/account/${accountUid}/category/${categoryUid}/${feedItemUid}`;

    // Fetch specific transaction from Starling API
    const starlingResponse = await fetch(starlingApiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.starling.accessToken}`,
        Accept: "application/json",
      },
    });

    if (!starlingResponse.ok) {
      throw new Error(
        `Starling API error: ${starlingResponse.status} ${starlingResponse.statusText}`
      );
    }

    const transactionData = await starlingResponse.json();

    const now = new Date();
    const transactionWithWebhookWrapper = {
      webhookEventUid: randomUUID(),
      webhookType: "FEED_ITEM",
      eventTimestamp: now.toISOString(),
      accountHolderUid: accountHolderData.accountHolderUid,
      content: transactionData,
    };

    // Submit the transaction data to target endpoint
    const targetResponse = await fetch(
      `${config.accounting.url}/starling/feed-item`,
      {
        method: "POST",
        headers: {
          "X-API-Key": config.accounting.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(transactionWithWebhookWrapper),
      }
    );

    if (!targetResponse.ok) {
      throw new Error(
        `Target API error: ${targetResponse.status} ${targetResponse.statusText}`
      );
    }

    return {
      success: true,
      transactionId: feedItemUid,
      sourceData: transactionData,
    };
  } catch (error) {
    console.error("Error processing transaction:", error);
    return {
      success: false,
      transactionId: feedItemUid,
      error: error.message,
    };
  }
};
