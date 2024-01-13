import Parser from "rss-parser";
import { itemExists, insertContent } from "../dynamo/dynamo";
import { ContentItem } from "../types/dynamo-schema";
import { generateWebpageDescription } from "../openai/gpt";

const MAX_RESULTS = 5;

/**
 * Source is the SK from dynamoDB source record
 * The first ":" splits the source name and the source url
 *
 * e.g.    "netflixtechblog:https://netflixtechblog.com/feed"
 *
 * @param source
 */
export async function refreshFromRSS(source: string) {
  try {
    console.log(`Making request to RSS feed: ${source}`);

    const [sourceName, url] = source.split(/:(.+)/);

    const parser = new Parser();
    const feed = await parser.parseURL(url);
    console.log(`Received results from: ${feed.title}`);
    const items = limitResults(feed.items, MAX_RESULTS);

    const newItems: ContentItem[] = [];
    for (let item of items) {
      if (item.link == undefined) continue;
      const SK = `${sourceName}:${item.link}`;
      if (!(await itemExists("content", SK))) {
        try {
          newItems.push({
            PK: "content",
            SK: SK,
            unix_time: Date.now(),
            type: "rss",
            title: item.title || "-",
            description: await generateWebpageDescription(item.link),
          });
        } catch (error) {
          console.error(`Error creating item: ${item}`, error);
        }
      }
    }

    console.log(`Found ${newItems.length} new items:`);
    if (newItems.length != 0) {
      insertContent(newItems);
    }
  } catch (error) {
    console.error(`Error refreshing ${source} RSS feed `, error);
  }
}

function limitResults(items: any[], count: number) {
  return items.slice(0, count);
}
