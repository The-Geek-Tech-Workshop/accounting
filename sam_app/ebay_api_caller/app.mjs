import ebayClientBuilder from "gtw-ebay-client";
import { program } from "commander";

program
  .version("1.0.0", "-v, --version")
  .usage("OPTIONS...")
  .option("-p, --payout <string>", "Interogate a payout")
  .option("-o --order <string>", "Interrogate an order Id")
  .parse(process.argv);

const options = program.opts();

const ebayClient = await ebayClientBuilder(
  `${import.meta.dirname}/ebay-auth.json`
);

if (options.payout) {
  console.log(`Requesting transactions for payout ${options.payout}`);
  const eBayTransactionsResponse =
    await ebayClient.sell.finances.sign.getTransactions({
      filter: `payoutId:{${options.payout}}`,
    });
  console.log(JSON.stringify(eBayTransactionsResponse, null, 4));
} else if (options.order) {
  const ebayOrderResponse = await ebayClient.trading.GetOrders({
    OrderIDArray: [{ OrderID: options.order }],
  });
  console.log(JSON.stringify(ebayOrderResponse, null, 4));
}
