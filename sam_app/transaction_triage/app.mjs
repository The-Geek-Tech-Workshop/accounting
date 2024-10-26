import constants from "accounting_constants";

const TRANSACTION_EBAY_NAMES = ["eBay", "EBAY Commerce UK Ltd"];

export const lambdaHandler = async (event) => {
  const attributes = event.detail.MessageAttributes || {};
  const newDetailType = attributes.isEnriched
    ? constants.MESSAGE.DETAIL_TYPE.TRIAGED_TRANSACTION
    : isEbayTransaction(event)
    ? constants.MESSAGE.DETAIL_TYPE.EBAY_TRANSACTION
    : constants.MESSAGE.DETAIL_TYPE.TRIAGED_TRANSACTION;

  return {
    Messages: [
      {
        Detail: event.detail,
        DetailType: newDetailType,
      },
    ],
  };
};

const isEbayTransaction = (event) => {
  const messageJson = JSON.parse(event.detail.Message);
  return TRANSACTION_EBAY_NAMES.includes(messageJson.who);
};
