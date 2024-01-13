#!/usr/bin/env node
import "source-map-support/register";
import * as dotenv from "dotenv";
import * as cdk from "aws-cdk-lib";
import { BlogAggregatorStack } from "../lib/blog-aggregator-stack";

dotenv.config();

const app = new cdk.App();

new BlogAggregatorStack(app, "BlogAggregatorStack", {
  crawler_ecr_registry: process.env.CRAWLER_ECR_REGISTRY as string,
  crawler_ecr_tag: process.env.CRAWLER_ECR_TAG as string,
  openai_api_key: process.env.OPENAI_API_KEY as string,
  youtube_api_key: process.env.YOUTUBE_API_KEY as string,
  cdkProps: {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  },
});
