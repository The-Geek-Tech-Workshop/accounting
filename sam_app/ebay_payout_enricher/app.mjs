import AWS from "aws-sdk";
import eBayApi from "ebay-api";
import { readFile } from "fs/promises";
import dateFormat from "dateformat";

const eBayAuth = JSON.parse(
  await readFile(new URL("./ebay-auth.json", import.meta.url))
);

const ISO_DATE_MASK = "isoDate";
const QUEUE_URL = process.env.QUEUE_URL;

const ACCOUNTING_SOURCE__EBAY = "EBAY";
const ACCOUNT_NAME__SALES = "Sales";
const ACCOUNT_NAME__EBAY = "eBay (GTW)";
const ACCOUNT_NAME__TRANSACTION_FEES = "Transaction Fees";

const EBAY_TRANSACTION_TYPE__SALE = "SALE";

const EBAY_FEE_DATA = {
  REGULATORY_OPERATING_FEE: {
    code: "regOpFee",
    description: "Regulatory operating fee",
  },
  FINAL_VALUE_FEE_FIXED_PER_ORDER: {
    code: "finalFixed",
    description: "Final value fee (fixed per order)",
  },
  FINAL_VALUE_FEE: {
    code: "finalVar",
    description: "Final value fee (variable per order)",
  },
};

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
ebayClient.OAuth2.setCredentials(eBayAuth.oAuth2.credentials);

const sqs = new AWS.SQS();

export const lambdaHandler = async (event) => {
  for (const record of event.Records) {
    const transaction = JSON.parse(record.body);
    const ebayPayoutId = record.attributes.eBayPayoutId;
    const eBayTransactionsResponse =
      await ebayClient.sell.finances.sign.getTransactions({
        filter: `payoutId:{${ebayPayoutId}}`,
      });
    const messages = await eBayTransactionsResponse.transactions.reduce(
      async (messagesSoFar, ebayTransaction) => {
        const newMessages =
          ebayTransaction.transactionType === EBAY_TRANSACTION_TYPE__SALE
            ? await extractSaleTransactions(ebayTransaction)
            : [];
        return [...messagesSoFar, ...newMessages];
      },
      [
        {
          ...transaction,
          creditedAccount: ACCOUNT_NAME__EBAY,
          description: `Payout ${ebayPayoutId}`,
        },
      ]
    );
    console.log(JSON.stringify(messages));
    await sqs
      .sendMessageBatch({
        Entries: messages.map((message) => {
          return {
            Id: `${message.source}-${message.sourceTransactionId}`,
            MessageBody: JSON.stringify(message),
          };
        }),
        QueueUrl: QUEUE_URL,
      })
      .promise();
  }
};
const extractSaleTransactions = async (ebayTransaction) => {
  const ebayOrderResponse = await ebayClient.trading.GetOrders({
    OrderIDArray: [{ OrderID: ebayTransaction.orderId }],
  });
  const order = ebayOrderResponse.OrderArray.Order[0];
  const item = order.TransactionArray.Transaction[0].Item;

  return ebayTransaction.orderLineItems.reduce((messages, lineItem) => {
    const baseSourceTransactionId = `${ebayTransaction.transactionId}-${lineItem.lineItemId}`;
    const transactionDate = toIsoDateString(ebayTransaction.transactionDate);
    return [
      ...messages,
      {
        source: ACCOUNTING_SOURCE__EBAY,
        sourceTransactionId: `${baseSourceTransactionId}-sale`,
        transactionDate: transactionDate,
        creditedAccount: ACCOUNT_NAME__SALES,
        debitedAccount: ACCOUNT_NAME__EBAY,
        skuOrPurchaseId: item.SKU,
        amount: lineItem.feeBasisAmount.value,
        description: item.Title,
        who: `eBay: ${ebayTransaction.buyer.username}`,
      },
      ...lineItem.marketplaceFees.map((fee) => {
        const feeData = EBAY_FEE_DATA[fee.feeType];
        return {
          source: ACCOUNTING_SOURCE__EBAY,
          sourceTransactionId: `${baseSourceTransactionId}-${feeData.code}`,
          transactionDate: transactionDate,
          creditedAccount: ACCOUNT_NAME__EBAY,
          debitedAccount: ACCOUNT_NAME__TRANSACTION_FEES,
          skuOrPurchaseId: item.SKU,
          amount: fee.amount.value,
          description: feeData.description,
          who: "eBay",
        };
      }),
    ];
  }, []);
};

const toIsoDateString = (isoDateTimeString) =>
  dateFormat(Date.parse(isoDateTimeString), ISO_DATE_MASK);
