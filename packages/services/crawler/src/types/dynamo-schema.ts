type SourceType = "rss" | "youtube" | "web";

export type SourceItem = {
  PK: "string";
  SK: string;
  type: SourceType;
  content_url_pattern?: string;
};

export type ContentItem = {
  PK: "content";
  SK: string;
  unix_time: number;
  type: SourceType;
  title: string;
  description: string;
};
