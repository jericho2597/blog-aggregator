import * as cheerio from "cheerio";
import { ContentItem } from "../types/dynamo-schema";
import { insertContent, itemExists } from "../dynamo/dynamo";
import { extractWebpageTitle, generateWebpageDescription } from "../openai/gpt";

const MAX_RESULTS = 5;

/**
 * Source is the SK from dynamoDB source record
 * The first ":" splits the source name and the source url
 *
 * e.g.    "netflixtechblog:https://netflixtechblog.com/"
 *
 * @param source
 */
export async function refreshFromWebpage(
  source: string,
  contentUrlPattern: RegExp
) {
  try {
    console.log(`Refreshing from web source: ${source}`);

    const [sourceName, url] = source.split(/:(.+)/);

    const links = await getLinksOnPage(url, contentUrlPattern);

    const newItems: ContentItem[] = [];
    for (let link of links) {
      const SK = `${sourceName}:${link}`;
      if (!(await itemExists("content", SK))) {
        try {
          newItems.push({
            PK: "content",
            SK: SK,
            unix_time: Date.now(),
            type: "web",
            title: await extractWebpageTitle(link),
            description: await generateWebpageDescription(link),
          });
        } catch (error) {
          console.error(`Error creating item for link: ${link}`, error);
        }
      }
    }

    console.log(`Found ${newItems.length} new items:`);
    if (newItems.length != 0) {
      insertContent(newItems);
    }
  } catch (error) {
    console.error(`Error refreshing ${source} web source `, error);
  }
}

/**
 * Get all links on the page that are on the same domain
 *
 * @param url
 * @returns
 */
async function getLinksOnPage(url: string, contentUrlPattern: RegExp) {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  const base = new URL(url);
  const baseDomain = base.hostname;

  const links = $("a")
    .map((i, el) => {
      const href = $(el).attr("href");
      if (!href) return undefined;

      try {
        const fullUrl = new URL(href, base);
        // Check if the domain of the URL matches the base domain
        if (
          fullUrl.hostname === baseDomain &&
          contentUrlPattern.test(fullUrl.href)
        ) {
          return fullUrl.href;
        }
        return undefined;
      } catch {
        return undefined;
      }
    })
    .get()
    .filter((href): href is string => href !== undefined);

  return limitResults(getUniqueLinks(links), MAX_RESULTS);
}

function getUniqueLinks(links: string[]) {
  const uniqueLinks = new Set(links);
  return Array.from(uniqueLinks);
}

function limitResults(links: string[], count: number) {
  return links.slice(0, count);
}
