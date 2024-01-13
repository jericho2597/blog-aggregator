import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import { ScheduledFargateTask } from "aws-cdk-lib/aws-ecs-patterns";
import { Schedule } from "aws-cdk-lib/aws-events";

type BlogAggregatorStackProps = {
  crawler_ecr_tag: string;
  crawler_ecr_registry: string;
  openai_api_key: string;
  youtube_api_key: string;
  cdkProps: cdk.StackProps;
};

export class BlogAggregatorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BlogAggregatorStackProps) {
    super(scope, id, props.cdkProps);

    // create single schema table
    // PK will be partition records by type (source or content record)
    // SK will sort records by source id and url (type:url)
    //    e.g.   SK = blog1:https://blog1.com/article1     (for a content record)
    //           SK = blog1:https://blog1.com            (for metadata record on source)
    const table = new dynamodb.Table(this, "table", {
      partitionKey: {
        name: "PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: dynamodb.AttributeType.STRING,
      },
    });
    table.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY); // Data can easily be recrawled

    const vpc = new ec2.Vpc(this, "MyVpc", {
      natGateways: 0,
      maxAzs: 3, // Default is all AZs in the region
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "PublicSubnet",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const cluster = new ecs.Cluster(this, "crawler-cluster", {
      vpc,
    });

    const taskRole = new iam.Role(this, "crawler-role", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    // Attach a policy to the role that only allows actions on the specific DynamoDB table
    const policy = new iam.Policy(this, "crawler-policy", {
      statements: [
        new iam.PolicyStatement({
          actions: ["dynamodb:*"],
          resources: [table.tableArn],
        }),
      ],
    });

    taskRole.attachInlinePolicy(policy);

    const executionRole = new iam.Role(this, "crawler-execution-role", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "crawler-task", {
      taskRole: taskRole,
      executionRole: executionRole,
      cpu: 256, // 0.25 vCPU
      memoryLimitMiB: 512, // 512 MB
    });

    const ecrRepo = ecr.Repository.fromRepositoryName(
      this,
      "ecr-repo",
      props.crawler_ecr_registry
    );
    taskDefinition.addContainer("crawler-container", {
      image: ecs.ContainerImage.fromEcrRepository(
        ecrRepo,
        props.crawler_ecr_tag
      ),
      environment: {
        DYNAMODB_TABLE_NAME: table.tableName,
        REGION: props.cdkProps.env?.region as string,
        OPEN_API_KEY: props.openai_api_key,
        YOUTUBE_API_KEY: props.youtube_api_key,
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "BlogAggregator" }),
    });

    const schedule = new events.Rule(this, "crawler-schedule", {
      schedule: events.Schedule.rate(cdk.Duration.days(3)),
    });

    schedule.addTarget(
      new targets.EcsTask({
        cluster,
        taskDefinition,
        subnetSelection: {
          subnetType: ec2.SubnetType.PUBLIC,
        },
      })
    );
  }
}
