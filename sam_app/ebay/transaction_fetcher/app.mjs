import { DateTime } from "luxon";
import ebayClientBuilder from "gtw-ebay-client";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import constants from "accounting_constants";

const MAX_ENTRIES_EVENTBRIDGE_WILL_ACCEPT = 10;

const ebayClient = await ebayClientBuilder(
  `${import.meta.dirname}/ebay-auth.json`
);
const eventBridgeClient = new EventBridgeClient();

export const lambdaHandler = async (event) => {
  const eventDate = DateTime.fromISO(event.time);

  // When triggered, we process the transactions of the previous day
  const dateToProcessTransactionsFor = eventDate.minus({ days: 1 });

  var thereAreMoreTransactionsToFetch = true;
  var offset = 0;
  var totalTransactions = 0;
  do {
    const dateFilter = `transactionDate:[${dateToProcessTransactionsFor
      .startOf("day")
      .setZone("utc")
      .toISO()}..${dateToProcessTransactionsFor
      .endOf("day")
      .setZone("utc")
      .toISO()}]`;
    const eBayResponse = await ebayClient.sell.finances.sign.getTransactions({
      filter: dateFilter,
      sort: "transactionDate",
      limit: MAX_ENTRIES_EVENTBRIDGE_WILL_ACCEPT,
      offset: offset,
    });

    eBayResponse &&
      (await eventBridgeClient.send(
        new PutEventsCommand({
          Entries: eBayResponse.transactions.map((transaction) => {
            return {
              Detail: JSON.stringify(transaction),
              DetailType: constants.MESSAGE.DETAIL_TYPE.EBAY_FEEDITEM,
              Source: constants.MESSAGE.SOURCE.GTW_ACCOUNTING,
            };
          }),
        })
      ));

    offset += MAX_ENTRIES_EVENTBRIDGE_WILL_ACCEPT;
    thereAreMoreTransactionsToFetch = !!(eBayResponse && eBayResponse.next);
    if (eBayResponse) {
      totalTransactions = eBayResponse.total;
    }
  } while (thereAreMoreTransactionsToFetch);

  console.log(
    `Transaction count for ${dateToProcessTransactionsFor.toISODate}: ${totalTransactions}`
  );
};
