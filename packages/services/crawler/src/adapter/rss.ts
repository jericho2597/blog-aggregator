import Parser from "rss-parser";
import { itemExists } from "../dynamo/dynamo";
import { ContentItem } from "../types/dynamo-schema";

/**
 * Source is the SK from dynamoDB source record
 * The first ":" splits the source name and the source url
 *
 * e.g.    "netflixtechblog:https://netflixtechblog.com/feed"
 *
 * @param source
 */
export async function refreshFromRSS(source: string) {
  console.log(`Making request to RSS feed: ${source}`);

  const [sourceName, url] = source.split(/:(.+)/);

  const parser = new Parser();
  const feed = await parser.parseURL(url);
  console.log(`Received results from: ${feed.title}`);

  const newItems: ContentItem[] = [];
  for (let item of feed.items) {
    if (item.link == undefined) continue;
    const SK = `${sourceName}:${item.link}`;
    if (!(await itemExists("content", SK))) {
      newItems.push({
        PK: "content",
        SK: SK,
      });
    }
  }

  console.log("New items:" + newItems.length);
}
