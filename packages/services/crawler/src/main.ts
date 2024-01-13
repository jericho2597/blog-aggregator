import { querySources } from "./dynamo/dynamo";
import { refreshFromRSS } from "./adapter/rss";
import { refreshFromYoutube } from "./adapter/youtube";
import { refreshFromWebpage } from "./adapter/web";
import { SourceItem } from "./types/dynamo-schema";

const runBlogRefresh = async () => {
  const sources: SourceItem[] | undefined = await querySources();

  if (sources == undefined) {
    console.error("Could not retrieve sources from DynamoDB");
    return;
  }

  sources.forEach((source) => {
    if (source.type == "rss") {
      // refresh source using RSS feed endpoint
      refreshFromRSS(source.SK);
    } else if (source.type == "youtube") {
      // refresh source using youtube API
      refreshFromYoutube(source.SK);
    } else if (source.type == "web") {
      // refresh source by crawling page
      if (!source.content_url_pattern) {
        console.error(
          "Could not find regex pattern used to discover content for this source."
        );
        return;
      }
      refreshFromWebpage(source.SK, new RegExp(source.content_url_pattern));
    }
  });
};

runBlogRefresh();
