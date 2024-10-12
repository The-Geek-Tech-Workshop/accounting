export default Object.freeze({
  ACCOUNTING: {
    SOURCE: {
      EBAY: "EBAY",
    },
    FROM: {
      EBAY: "eBay",
    },
  },
  ACCOUNT: {
    EBAY: "eBay (GTW)",
    OUTWARD_SHIPPING: "Outward Shipping",
    INWARD_SHIPPING: "Inward Shipping",
    LISTING_FEES: "Listing Fees",
    TRANSACTION_FEES: "Transaction Fees",
    SALES: "Sales",
  },
  MESSAGE: {
    SOURCE: {
      GTW_ACCOUNTING: "custom.gtw.accountingApp",
    },
    DETAIL_TYPE: {
      TRANSACTION: "transaction",
      EBAY_TRANSACTION: "ebay-transaction",
      EBAY_FEEDITEM: "ebay-feeditem",
      STARLING_VERIFIED_FEEDITEM: "starling-verified-feeditem",
      TRIAGED_TRANSACTION: "triaged-transaction",
    },
    ATTRIBUTES: {
      MESSAGE_TYPE: {
        TRANSACTION: {
          messageType: {
            DataType: "String",
            StringValue: "TRANSACTION",
          },
        },
      },
    },
  },
  EBAY: {
    FEE_TYPE: {
      INSERTION_FEE: "INSERTION_FEE",
    },
  },
});