import ebayClientBuilder from "gtw-ebay-client";
import { DateTime } from "luxon";
import Table from "tty-table";
import terminalLink from "terminal-link";

const ebayClient = await ebayClientBuilder(
  `${import.meta.dirname}/ebay-auth.json`
);

export const handleTransactions = async ({
  dateFrom,
  dateTo,
  type,
  limit,
  offset,
  raw,
  ids,
}) => {
  const dateFilter =
    dateFrom || dateTo
      ? `transactionDate:[${dateFrom ? dateFrom : ""}${
          dateFrom && dateTo ? ".." : ""
        }${dateTo ? dateTo : ""}]`
      : null;
  const typeFilter = type ? `transactionType:{${type}}` : null;

  const filters = [dateFilter, typeFilter].filter((x) => x != null);

  const eBayResponse = await ebayClient.sell.finances.sign.getTransactions({
    ...(filters.length && { filter: filters.join("&") }),
    ...(limit && { limit: limit }),
    ...(offset && { offset: offset }),
    sort: "-transactionDate",
  });
  console.log(
    raw
      ? JSON.stringify(eBayResponse, null, 4)
      : createTransactionTable(eBayResponse.transactions, ids).render()
  );
};

const createTransactionTable = (transactions, ids) =>
  Table(
    [
      { alias: "Date" },
      { alias: "Action" },
      { alias: "Amount" },
      { alias: "Type" },
      { alias: "Detail" },
      ...(ids ? [{ alias: "Id" }] : []),
    ],
    transactions.map((transaction) => {
      const transactionDate = DateTime.fromISO(transaction.transactionDate);
      return {
        Date: transactionDate.toFormat("yyyy-MM-dd HH:mm"),
        Action: transaction.bookingEntry,
        Amount: Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: transaction.amount.currency,
        }).format(transaction.amount.value),
        Type:
          transaction.transactionType === "NON_SALE_CHARGE"
            ? transaction.feeType
            : transaction.transactionType,
        Detail: getTransactionDetail(transaction),
        ...(ids ? { Id: transaction.transactionId } : {}),
      };
    }),
    {
      borderStyle: "none",
      compact: true,
    }
  );

const getTransactionDetail = (transaction) =>
  ["SALE", "SHIPPING_LABEL"].includes(transaction.transactionType)
    ? formatReferences([
        {
          referenceType: "Order_Id",
          referenceId: transaction.orderId,
        },
      ])
    : formatReferences(transaction.references);

const formatReferences = (references) =>
  (references || [])
    .map((reference) => {
      const url = generateUrlForReference(reference);
      return `${reference.referenceType
        .replace("_", " ")
        .split(" ")
        .map((w) => capitalizeFirstLetter(w.toLowerCase()))
        .join("")}: ${
        url ? terminalLink(reference.referenceId, url) : reference.referenceId
      }`;
    })
    .join();

const generateUrlForReference = (reference) => {
  const type = reference.referenceType.toUpperCase();
  const url =
    type === "ORDER_ID"
      ? `https://www.ebay.co.uk/mesh/ord/details?mode=SH&orderid=${reference.referenceId}`
      : type === "RETURN_ID"
      ? `https://www.ebay.co.uk/rt/ReturnDetails?returnId=${reference.referenceId}`
      : type === "ITEM_ID"
      ? `https://www.ebay.co.uk/itm/${reference.referenceId}`
      : null;
  return url ? encodeURI(url) : null;
};

const capitalizeFirstLetter = (string) =>
  [...string][0].toUpperCase() + [...string].slice(1).join("");
