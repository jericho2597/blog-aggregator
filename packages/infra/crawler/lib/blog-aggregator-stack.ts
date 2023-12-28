import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';


export class BlogAggregatorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create single schema table 
    // PK will be partition records by blog source url
    // SK will sort records by type and url (type:url)
    //    e.g.   SK = post:https://blog.com/article1     (for a article record)
    //           SK = source:https://blog.com            (for metadata record on blog source)
    const table = new dynamodb.Table(this, 'montable', {
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      }
    });

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'BlogAggregatorQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
