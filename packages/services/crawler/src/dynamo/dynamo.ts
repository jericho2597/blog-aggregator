import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

const TABLE_NAME =
  process.env.DYNAMODB_TABLE_NAME ||
  "BlogAggregatorStack-table8235A42E-XM6NAME1ACE2";
const REGION = process.env.REGION || "ap-southeast-2";

// Create DynamoDB client
const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * Get the blog/content source records from DynamoDB
 *
 * @returns sources: Record<string, any>[] | undefined
 */
export async function querySources() {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk",
    ExpressionAttributeValues: {
      ":pk": "source",
    },
  };

  try {
    console.log(`Querying ${TABLE_NAME} for sources`);
    const data = await docClient.send(new QueryCommand(params));
    console.log(`Retrieved ${data.Items?.length} source/s from ${TABLE_NAME}`);
    return data.Items;
  } catch (err) {
    console.error("Error", err);
  }
}

export async function itemExists(pk: string, sk: string) {
  console.log(`Checking if record {PK: ${pk}, SK: ${sk}} exists.`);
  const params = {
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: sk },
  };

  const data = await ddbClient.send(new GetCommand(params));
  console.log(
    `Record {PK: ${pk}, SK: ${sk}} ${
      !!data.Item ? "already exists." : "does not exist."
    }`
  );
  return !!data.Item;
}
