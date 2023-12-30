import { querySources } from "./dynamo/dynamo";
import { refreshFromRSS } from "./adapter/rss";

const runBlogRefresh = async () => {
  const sources = await querySources();

  if (sources == undefined) {
    console.error("Could not retrieve sources from DynamoDB");
    return;
  }

  sources.forEach((source) => {
    const content = refreshFromRSS(source.SK);
  });
  // refresh source links
  // write source links back to dynamoDB
  // read unread articles/blogs from dynamoDB
  // get content from articles/blogs and write to dynamoDB
};

runBlogRefresh();
