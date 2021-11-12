import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as rds from "@aws-cdk/aws-rds";
import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const defaultDatabaseName = "ExampleService";

    // Create the VPC needed for the Aurora Serverless DB cluster
    const vpc = new ec2.Vpc(this, "ExampleServiceVPC");

    // Create the Serverless Aurora DB cluster
    const cluster = new rds.ServerlessCluster(this, "ExampleServiceCluster", {
      vpc,
      defaultDatabaseName,
      engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
      parameterGroup: rds.ParameterGroup.fromParameterGroupName(
        this,
        "ParameterGroup",
        "default.aurora-mysql5.7"
      ),
      // Optional, disable the instance from pausing after 5 minutes
      // scaling: { autoPause: cdk.Duration.seconds(0) },
    });

    // Create a HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        environment: { 
          dbName: defaultDatabaseName,
          clusterArn: cluster.clusterArn,
          secretArn: cluster.secret?.secretArn||""
        },
      },
      routes: {
        "GET /": "src/lambda.handler",
      },
    });

    // Grant access to the cluster from the Lambda function
    cluster.grantDataApiAccess(api.getFunction("GET /"));

    // Show the endpoint in the output
    this.addOutputs({
      ApiEndpoint: api.url,
      SecretArn: cluster.secret?.secretArn || "",
      ClusterIdentifier: cluster.clusterIdentifier,
    });
  }
}
