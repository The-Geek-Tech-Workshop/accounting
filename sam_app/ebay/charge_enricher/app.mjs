import constants from "accounting_constants";

const ebayChargeIdRegex = /^eBay C (?<chargeId>.+)$/gm;

export const lambdaHandler = async (event) => {
  const transaction = JSON.parse(event.detail.Message);
  const ebayChargeId = ebayChargeIdRegex.exec(transaction.reference).groups
    .chargeId;

  return {
    Messages: [
      {
        Detail: {
          Message: JSON.stringify({
            ...transaction,
            debitedAccount: constants.ACCOUNT.EBAY,
            description: `Charge ${ebayChargeId}`,
          }),
          MessageAttributes: {
            isEnriched: true,
          },
        },
        DetailType: constants.MESSAGE.DETAIL_TYPE.TRANSACTION,
      },
    ],
  };
};
