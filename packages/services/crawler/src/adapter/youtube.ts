import * as cheerio from "cheerio";
import { ContentItem } from "../types/dynamo-schema";
import { insertContent, itemExists } from "../dynamo/dynamo";
import { generateVideoDescription } from "../openai/gpt";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const MAX_RESULTS = 5;

/**
 * Source is the SK from dynamoDB source record
 * The first ":" splits the source name and the youtube channel page
 *
 * e.g.    "The Primeagen:https://www.youtube.com/@ThePrimeagen"
 *
 * @param source
 */
export async function refreshFromYoutube(source: string) {
  try {
    console.log(`Making request to YouTube source: ${source}`);

    const [sourceName, url] = source.split(/:(.+)/);

    const channelId = await getChannelIDFromUrl(url);

    const endpoint = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=${MAX_RESULTS}`;
    const response = await fetch(endpoint);
    const data = await response.json();

    const videos = data.items.map(
      (item: {
        snippet: {
          title: string;
          publishedAt: string;
          description: string;
          videoId: string;
        };
        id: {
          videoId: string;
        };
      }) => ({
        title: item.snippet.title,
        videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        uploadDate: new Date(item.snippet.publishedAt).getTime(),
        description: item.snippet.description,
      })
    );

    const newItems: ContentItem[] = [];
    for (let item of videos) {
      if (item.videoUrl == undefined) continue;
      const SK = `${sourceName}:${item.videoUrl}`;
      if (!(await itemExists("content", SK))) {
        try {
          newItems.push({
            PK: "content",
            SK: SK,
            unix_time: item.uploadDate,
            type: "youtube",
            title: item.title,
            description: await generateVideoDescription(
              item.title,
              item.description
            ),
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
    console.error(`Error refreshing ${source} Youtube Channel`, error);
  }
}

/**
 * This function is a workaround to the limitations of the YouTube
 * API not supporting any channel requests using new generation
 * channel handles (e.g. @ThePrimeagen).
 *
 * This makes a request to get the page source of the youtube channel
 * and extracts the channel id from the source. This id can then
 * be used in reqs to the youtube API.
 *
 * @param url
 * @returns
 */
async function getChannelIDFromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const body = await response.text();
  const $ = cheerio.load(body);
  const channelUrl = $('meta[property="og:url"]').attr("content");

  if (!channelUrl) {
    throw new Error("Unable to find the og:url meta tag.");
  }

  const parts = channelUrl.split("/");
  const channelId = parts[4];

  if (!channelId.startsWith("UC")) {
    throw Error("Could not find valid channel id. Found " + channelId);
  }

  console.log("Found channel id: " + parts[4]);
  return channelId;
}
