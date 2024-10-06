import dateFormat from "dateformat";
import ebayClientBuilder from "gtw-ebay-client";

const ISO_DATE_MASK = "isoDate";

const ACCOUNTING_SOURCE__EBAY = "EBAY";
const ACCOUNT_NAME__SALES = "Sales";
const ACCOUNT_NAME__EBAY = "eBay (GTW)";
const ACCOUNT_NAME__OUTWARD_SHIPPING = "Outward Shipping";
const ACCOUNT_NAME__TRANSACTION_FEES = "Transaction Fees";
const ACCOUNT_NAME__LISTING_FEES = "Listing Fees";

const EBAY_TRANSACTION_TYPE__SALE = "SALE";
const EBAY_TRANSACTION_TYPE__SHIPPING_LABEL = "SHIPPING_LABEL";
const EBAY_TRANSACTION_TYPE__NON_SALE_CHARGE = "NON_SALE_CHARGE";

const EBAY_NON_SALE_CHARGE__INSERTION_FEE = "INSERTION_FEE";

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
  INSERTION_FEE: {
    code: "insertion",
    description: "Insertion fee",
  },
};

const ebayClient = await ebayClientBuilder(
  `${import.meta.dirname}/ebay-auth.json`
);

export const lambdaHandler = async (event) => {
  const transaction = JSON.parse(event.detail.Message);
  const ebayPayoutId = event.detail.MessageAttributes.eBayPayoutId;
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
          : ebayTransaction.transactionType ===
            EBAY_TRANSACTION_TYPE__NON_SALE_CHARGE
          ? await extractNonSaleCharge(ebayTransaction)
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
  const newMessages = {
    Messages: messages.map((message) => {
      return {
        Detail: {
          Message: JSON.stringify(message.body),
          MessageAttributes: message.attributes,
        },
        DetailType: "transaction",
      };
    }),
  };

  console.log(JSON.stringify(newMessages));

  return newMessages;
};
const extractSaleTransactions = async (ebayTransaction) => {
  const ebayOrderResponse = await ebayClient.trading.GetOrders({
    OrderIDArray: [{ OrderID: ebayTransaction.orderId }],
  });
  const order = ebayOrderResponse.OrderArray.Order[0];
  const item = order.TransactionArray.Transaction[0].Item;

  const deliveryDate = order.ShippingServiceSelected.ShippingPackageInfo
    ? order.ShippingServiceSelected.ShippingPackageInfo.ActualDeliveryTime
    : null;

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
    deliveryDate
      ? [
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
      : []
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

const extractNonSaleCharge = async (ebayTransaction) => {
  return ebayTransaction.feeType === EBAY_NON_SALE_CHARGE__INSERTION_FEE
    ? await extractInsertionFee(ebayTransaction)
    : [];
};

const extractInsertionFee = async (ebayTransaction) => {
  const ebayItemResponse = await ebayClient.trading.GetItem({
    ItemID: ebayTransaction.references[0].referenceId,
  });
  const item = ebayItemResponse.Item;

  return [
    {
      body: {
        source: ACCOUNTING_SOURCE__EBAY,
        sourceTransactionId: ebayTransaction.transactionId,
        transactionDate: toIsoDateString(ebayTransaction.transactionDate),
        creditedAccount: ACCOUNT_NAME__EBAY,
        debitedAccount: ACCOUNT_NAME__LISTING_FEES,
        skuOrPurchaseId: item.SKU,
        amount: ebayTransaction.amount.value,
        description: EBAY_FEE_DATA.INSERTION_FEE.description,
        who: "eBay",
      },
      attributes: { ...MESSAGE_TYPE__TRANSACTION },
    },
  ];
};

const toIsoDateString = (isoDateTimeString) =>
  dateFormat(Date.parse(isoDateTimeString), ISO_DATE_MASK);
