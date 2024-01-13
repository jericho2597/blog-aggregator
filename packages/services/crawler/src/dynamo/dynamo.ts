import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { ContentItem, SourceItem } from "../types/dynamo-schema";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME as string;
const REGION = process.env.REGION as string;

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
    return data.Items as SourceItem[];
  } catch (err) {
    console.error("Error", err);
  }
}

/**
 * Return bool of whether item with PK and SK already exists in table
 *
 * @param pk
 * @param sk
 * @returns
 */
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

export async function insertContent(items: ContentItem[]) {
  const chunks = splitIntoChunks(items, 25);

  for (const chunk of chunks) {
    console.log(`Writing chunk of ${chunk.length} items into Dynamo table`);
    const writeRequests = chunk.map((item) => ({
      PutRequest: {
        Item: item,
      },
    }));

    const params = {
      RequestItems: {
        [TABLE_NAME]: writeRequests,
      },
    };

    try {
      const result = await ddbClient.send(new BatchWriteCommand(params));
      console.log("Batch write successful", result);
    } catch (err) {
      console.error("Error writing batch", err, "params:", params);
    }
  }
}

// Helper function to split an array into chunks
function splitIntoChunks<T>(array: T[], chunkSize: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
