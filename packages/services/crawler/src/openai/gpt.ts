import { OpenAI } from "openai";
import * as cheerio from "cheerio";

const OPEN_API_KEY = process.env.OPEN_API_KEY as string;

const openai = new OpenAI({
  apiKey: OPEN_API_KEY,
});

/**
 * Generate a description of a youtube video based on it's title and description
 *
 * @param title
 * @param description
 * @returns
 */
export async function generateVideoDescription(
  title: string,
  description: string
) {
  const prompt = `Summarize the following YouTube video for a website card display:\nTitle: ${title}\nDescription: ${description}\n\nSummary:`;

  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-3.5-turbo",
  });

  if (!chatCompletion.choices[0].message.content) {
    throw Error(`Error retrieving GPT completion. response: ${chatCompletion}`);
  }

  // Extracting the text of the first completion choice
  return chatCompletion.choices[0].message.content.trim();
}

/**
 * Generate a description of a webpage by scraping the page content
 *
 * @param url
 * @returns
 */
export async function generateWebpageDescription(url: string): Promise<string> {
  const extractedContent = await fetchAndExtractContent(url);

  const prompt = `Write a concise summary for the following article that has been scraped using node-fetch and cheerio:\n\n${extractedContent}\n\nSummary:`;

  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-3.5-turbo",
  });

  if (!chatCompletion.choices[0].message.content) {
    throw Error(`Error retrieving GPT completion. response: ${chatCompletion}`);
  }

  // Extracting the text of the first completion choice
  return chatCompletion.choices[0].message.content.trim();
}

/**
 * Extract title of a webpage article by scraping the page content
 *
 * @param url
 * @returns
 */
export async function extractWebpageTitle(url: string) {
  const extractedContent = await fetchAndExtractContent(url);

  const prompt = `Give me the title of this article that has been scraped using node-fetch and cheerio:\n\n${extractedContent}\n\nTitle:`;

  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-3.5-turbo",
  });

  if (!chatCompletion.choices[0].message.content) {
    throw Error(`Error retrieving GPT completion. response: ${chatCompletion}`);
  }

  // Extracting the text of the first completion choice
  return chatCompletion.choices[0].message.content.trim();
}

/**
 * Fetch the page content and attempt to extract the main article content
 *
 * @param url
 * @returns
 */
async function fetchAndExtractContent(url: string) {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  // Attempt to extract title and meta description
  const title = $("title").text() || "";
  const metaDescription = $('meta[name="description"]').attr("content") || "";

  // Generic content extraction
  let mainContent = $("main").text();
  if (!mainContent) {
    mainContent = $("article").text(); // Fallback to article tag
    if (!mainContent) {
      // Fallback to div tags, looking for large blocks of text
      $("div").each((i, el) => {
        const textLength = $(el).text().length;
        if (textLength > 500) {
          // Threshold for considering a div as main content
          mainContent = $(el).text();
          return false; // Break the loop
        }
      });
    }
    if (!mainContent) {
      mainContent = $("html").text();
    }
  }

  return truncateText(
    `${title}\n\n${metaDescription}\n\n${mainContent}`.trim()
  );
}

// Define a function to truncate text to a specific number of tokens to limit API cost
function truncateText(text: string, maxTokens: number = 600): string {
  const tokens = text.split(/\s+/);
  if (tokens.length > maxTokens) {
    return tokens.slice(0, maxTokens).join(" ") + "...";
  }
  return text;
}
