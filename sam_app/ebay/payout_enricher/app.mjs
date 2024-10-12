import constants from "accounting_constants";

const ebayPayoutIdRegex = /^P\*(?<payoutId>.+)$/gm;

export const lambdaHandler = async (event) => {
  const transaction = JSON.parse(event.detail.Message);
  const ebayPayoutId = ebayPayoutIdRegex.exec(transaction.reference).groups
    .payoutId;

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
