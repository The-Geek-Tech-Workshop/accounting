import AWS from "aws-sdk";
import dateFormat from "dateformat";
import ebayClientBuilder from "gtw-ebay-client";

const ISO_DATE_MASK = "isoDate";
const QUEUE_URL = process.env.QUEUE_URL;

const ACCOUNTING_SOURCE__EBAY = "EBAY";
const ACCOUNT_NAME__SALES = "Sales";
const ACCOUNT_NAME__EBAY = "eBay (GTW)";
const ACCOUNT_NAME__OUTWARD_SHIPPING = "Outward Shipping";
const ACCOUNT_NAME__TRANSACTION_FEES = "Transaction Fees";

const EBAY_TRANSACTION_TYPE__SALE = "SALE";
const EBAY_TRANSACTION_TYPE__SHIPPING_LABEL = "SHIPPING_LABEL";

const MESSAGE_TYPE__TRANSACTION = {
  messageType: {
    DataType: "String",
    StringValue: "TRANSACTION",
  },
};
const MESSAGE_TYPE__DELIVERY_NOTIFICATION = {
  messageType: {
    DataType: "String",
    StringValue: "DELIVERY_NOTIFICATION",
  },
};

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

const ebayClient = await ebayClientBuilder(
  `${import.meta.dirname}/ebay-auth.json`
);

const sqs = new AWS.SQS();

export const lambdaHandler = async (event) => {
  for (const record of event.Records) {
    const transaction = JSON.parse(record.body);
    const ebayPayoutId = record.messageAttributes.eBayPayoutId.stringValue;
    const eBayTransactionsResponse =
      await ebayClient.sell.finances.sign.getTransactions({
        filter: `payoutId:{${ebayPayoutId}}`,
      });
    const messages = await eBayTransactionsResponse.transactions.reduce(
      async (messagesSoFarP, ebayTransaction) => {
        const messagesSoFar = await messagesSoFarP;

        const newMessages =
          ebayTransaction.transactionType === EBAY_TRANSACTION_TYPE__SALE
            ? await extractSaleTransactions(ebayTransaction)
            : ebayTransaction.transactionType ===
              EBAY_TRANSACTION_TYPE__SHIPPING_LABEL
            ? await extractShippingLabelTransactions(ebayTransaction)
            : [];
        return Promise.resolve([...messagesSoFar, ...newMessages]);
      },
      Promise.resolve([
        {
          body: {
            ...transaction,
            creditedAccount: ACCOUNT_NAME__EBAY,
            description: `Payout ${ebayPayoutId}`,
          },
          attributes: { ...MESSAGE_TYPE__TRANSACTION },
        },
      ])
    );
    const messageBatch = {
      Entries: messages.map((message) => {
        return {
          Id: `${message.body.source}-${message.body.sourceTransactionId}`,
          MessageBody: JSON.stringify(message.body),
          MessageAttributes: message.attributes,
        };
      }),
      QueueUrl: QUEUE_URL,
    };
    // console.log(JSON.stringify(messageBatch));
    await sqs.sendMessageBatch(messageBatch).promise();
  }
};
const extractSaleTransactions = async (ebayTransaction) => {
  const ebayOrderResponse = await ebayClient.trading.GetOrders({
    OrderIDArray: [{ OrderID: ebayTransaction.orderId }],
  });
  const order = ebayOrderResponse.OrderArray.Order[0];
  const item = order.TransactionArray.Transaction[0].Item;

  return ebayTransaction.orderLineItems.reduce(
    (messages, lineItem) => {
      const baseSourceTransactionId = `${ebayTransaction.transactionId}-${lineItem.lineItemId}`;
      const transactionDate = toIsoDateString(ebayTransaction.transactionDate);
      return [
        ...messages,
        {
          body: {
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
          attributes: { ...MESSAGE_TYPE__TRANSACTION },
        },
        ...lineItem.marketplaceFees.map((fee) => {
          const feeData = EBAY_FEE_DATA[fee.feeType];
          return {
            body: {
              source: ACCOUNTING_SOURCE__EBAY,
              sourceTransactionId: `${baseSourceTransactionId}-${feeData.code}`,
              transactionDate: transactionDate,
              creditedAccount: ACCOUNT_NAME__EBAY,
              debitedAccount: ACCOUNT_NAME__TRANSACTION_FEES,
              skuOrPurchaseId: item.SKU,
              amount: fee.amount.value,
              description: feeData.description,
              who: "eBay",
            },
            attributes: { ...MESSAGE_TYPE__TRANSACTION },
          };
        }),
      ];
    },
    [
      {
        body: {
          source: ACCOUNTING_SOURCE__EBAY,
          sourceTransactionId: `${ebayTransaction.transactionId}-delivery`,
          sku: item.SKU,
          deliveryDate:
            order.ShippingServiceSelected.ShippingPackageInfo
              .ActualDeliveryTime,
        },
        attributes: { ...MESSAGE_TYPE__DELIVERY_NOTIFICATION },
      },
    ]
  );
};
const extractShippingLabelTransactions = async (ebayTransaction) => {
  const ebayOrderResponse = await ebayClient.trading.GetOrders({
    OrderIDArray: [{ OrderID: ebayTransaction.orderId }],
  });
  const order = ebayOrderResponse.OrderArray.Order[0];
  const orderTransaction = order.TransactionArray.Transaction[0];
  const item = order.TransactionArray.Transaction[0].Item;
  return [
    {
      body: {
        source: ACCOUNTING_SOURCE__EBAY,
        sourceTransactionId: ebayTransaction.transactionId,
        transactionDate: toIsoDateString(ebayTransaction.transactionDate),
        creditedAccount: ACCOUNT_NAME__EBAY,
        debitedAccount: ACCOUNT_NAME__OUTWARD_SHIPPING,
        skuOrPurchaseId: item.SKU,
        amount: ebayTransaction.amount.value,
        description:
          orderTransaction.ShippingDetails.ShipmentTrackingDetails
            .ShippingCarrierUsed,
        who: "eBay",
      },
      attributes: { ...MESSAGE_TYPE__TRANSACTION },
    },
  ];
};

const toIsoDateString = (isoDateTimeString) =>
  dateFormat(Date.parse(isoDateTimeString), ISO_DATE_MASK);
