import fetch from "node-fetch";
import { randomUUID } from "crypto";

const TARGET_API_URL =
  "https://hn93t12th7.execute-api.eu-west-2.amazonaws.com/Prod";

const STARLING_BASE_URL = "https://api.starlingbank.com/api/v2";

const STARLING_TOKEN = process.env.STARLING_PERSONAL_TOKEN;
const ACCOUNTING_API_KEY = process.env.ACCOUNTING_API_KEY;

export const addStarlingTransaction = async ({
  accountUid,
  categoryUid,
  feedItemUid,
}) => {
  try {
    // Fetch account holder details
    const accountHolderResponse = await fetch(
      `${STARLING_BASE_URL}/account-holder`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${STARLING_TOKEN}`,
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
    const starlingApiUrl = `${STARLING_BASE_URL}/feed/account/${accountUid}/category/${categoryUid}/${feedItemUid}`;

    // Fetch specific transaction from Starling API
    const starlingResponse = await fetch(starlingApiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${STARLING_TOKEN}`,
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
    const targetResponse = await fetch(`${TARGET_API_URL}/starling/feed-item`, {
      method: "POST",
      headers: {
        "X-API-Key": ACCOUNTING_API_KEY,
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
    console.error("Error processing transaction:", error);
    return {
      success: false,
      transactionId: feedItemUid,
      error: error.message,
    };
  }
};
