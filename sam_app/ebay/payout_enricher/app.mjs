import constants from "accounting_constants";

export const lambdaHandler = async (event) => {
  const transaction = JSON.parse(event.detail.Message);
  const ebayPayoutId = event.detail.MessageAttributes.ebayId;

  return {
    Messages: [
      {
        Detail: {
          Message: JSON.stringify({
            ...transaction,
            creditedAccount: constants.ACCOUNT.EBAY,
            description: `Payout ${ebayPayoutId}`,
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
