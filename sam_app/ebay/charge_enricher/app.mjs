import constants from "accounting_constants";

export const lambdaHandler = async (event) => {
  const transaction = JSON.parse(event.detail.Message);
  const ebayChargeId = event.detail.MessageAttributes.ebayId;

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
