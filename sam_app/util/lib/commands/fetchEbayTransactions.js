import config from "../config.js";
import { DateTime } from "luxon";

export const fetchEbayTransactions = async (date) => {
  try {
    // Config validation will throw if token is missing
    const { ebay } = config;

    const dateTime = DateTime.fromISO(date).startOf("day").plus({ hours: 3 });

    const url = `${config.accounting.url}/ebay/transactions/fetch`;

    const accountingResponse = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": config.accounting.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ time: dateTime.toISO() }),
    });

    if (!accountingResponse.ok) {
      throw new Error(
        `Accounting API error: ${accountingResponse.status} ${accountingResponse.statusText}`
      );
    }

    const responseData = await accountingResponse.json();
    console.log(`${responseData.transactionsFetched} transaction(s) fetched`);
  } catch (error) {
    if (error.message.includes("Missing required credential")) {
      console.error("\x1b[31m%s\x1b[0m", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
    // Re-throw other errors
    throw error;
  }
};
