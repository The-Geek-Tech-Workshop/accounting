import fetch from "node-fetch";
import { randomUUID } from "crypto";
import config from "../config.js";

export const addStarlingTransaction = async ({
  accountUid,
  categoryUid,
  feedItemUid,
}) => {
  try {
    // Config validation will throw if token is missing
    const { starling, accounting } = config;

    // Fetch account holder details
    const accountHolderResponse = await fetch(
      `${starling.url}/account-holder`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${starling.accessToken()}`,
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
    const starlingApiUrl = `${starling.url}/feed/account/${accountUid}/category/${categoryUid}/${feedItemUid}`;

    // Fetch specific transaction from Starling API
    const starlingResponse = await fetch(starlingApiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${starling.accessToken()}`,
        Accept: "application/json",
      },
    });

    if (!starlingResponse.ok) {
      throw new Error(
        `Starling API error: ${starlingResponse.status} ${
          starlingResponse.statusText
        }: ${await starlingResponse.text()}`
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
    const targetResponse = await fetch(`${accounting.url}/starling/feed-item`, {
      method: "POST",
      headers: {
        "X-API-Key": accounting.apiKey(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(transactionWithWebhookWrapper),
    });

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
    if (error.message.includes("Missing required credential")) {
      console.error("\x1b[31m%s\x1b[0m", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
    // Re-throw other errors to be handled by existing error handling
    throw error;
  }
};
