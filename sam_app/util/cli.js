#!/usr/bin/env node
import { program } from "commander";
import { addStarlingTransaction } from "./main.js";

const app = program.version("1.0.0", "-v --version");

const add = app.command("add").alias("a");
add
  .command("feed-item")
  .alias("fi")
  .description("Add a feed-item from Starling")
  .argument("<account-id>", "UUID for the account to add from")
  .argument("<category-id>", "UUID for the category to add")
  .argument("<feed-item-id>", "UUID for the feed-item to add")
  .action(async (accountUid, categoryUid, feedItemUid) =>
    addStarlingTransaction({ accountUid, categoryUid, feedItemUid })
  );
app.parseAsync(process.argv);
