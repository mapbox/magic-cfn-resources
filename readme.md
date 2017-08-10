# magic-cfn-resources

Builds [Lambda-backed custom Cloudformation resources](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-custom-resources-lambda.html). When `magic-cfn-resources`'s' `build` method is used, a `Lambda` function is built and used to create a resource. Resources that can be built with `magic-cfn-resources` are: `SnsSubscription`, `SnsMessage`, `DynamoDBStreamLabel`, `LogGroup`, `StackOutputs`, and `SpotFleet`.

## Provided resources in detail:

### SNS Subscriptions

This allows you to manage SNS subscriptions as though they are first-class CloudFormation resources.

### SNS Messages

This allows you to send SNS messages to a specified topic. By default, the message
is only sent when the resource is created. If you wish to have the message sent
again when the resource is updated, set `"SendOnUpdate": "true"`.

### DynamoDB Stream Labels

This does not actually create any backend resource, but looks up the label for the stream associated with a DynamoDB table.

This resource will use the stream's label as its PhysicalResourceId, so you can then access the label itself in your template via:

```json
{ "Ref": "LogicalNameOfYourCustomResource" }
```

### CloudWatchLogs LogGroup

Creates a LogGroup. Native CloudFormation support for this resource type does not allow you to set the group's name. The `IgnoreConflicts` parameter is optional and defaults to `false`. If `true`, any naming conflict while creating a resource will be ignored.

If needed, you can access the Log Group's name using `Fn::GetAtt`

```json
{ "Fn::GetAtt": ["LogicalNameOfYourCustomResource", "LogGroupName"] }
```

### CloudFormation StackOutputs

Looks up the Outputs for an existing CloudFormation stack.

You can access the values of the stack's outputs with `Fn::GetAtt`

```json
{ "Fn::GetAtt": ["LogicalNameOfYourCustomResource", "LogicalNameOfStackOutput"] }
```

## To create a magical resource in your own CloudFormation template:
#### In an existing script or in a new script (i.e. `sns-subscription.js`):
```js
// Purpose: create a handler for your Lambda function to reference

const magicCfnResources = require('@mapbox/magic-cfn-resources');
// export the custom function needed for your stack.
module.exports.SnsSubscription = magicCfnResources.SnsSubscription;
```
*Another example: `module.exports.LogGroup = magicCfnResources.LogGroup;`*

#### In the CloudFormation template of your stack:
```js
const magicCfnResources = require('@mapbox/magic-cfn-resources');
```
#### Then, pass in the necessary parameters to `magicCfnResources.build`. These are the parameters needed for each resource:

*SnsSubscription*
```js
const SnsSubscription = magicCfnResources.build({
  CustomFunctionName: 'SnsSubscription',
  LogicalName: 'Logical Name', // a name to refer to the custom resource being built
  S3Bucket: 'Bucket Name', // the S3 bucket the code for the handler lives in
  S3Key: 'Key', // the S3 key for where the handler lives
  Handler: 'sns-subscription.SnsSubscription', // references the handler created in the repository
  Properties: {
    SnsTopicArn: 'Topic Arn', // the ARN of the SNS Topic you are subscribing to
    Protocol: 'Protocol', // the SNS protocol, i.e. 'sqs', 'email'
    Endpoint: 'Endpoint' // the endpoint you are subscribing
  } 
});
```
*SnsMessage*
```js
const SnsMessage = magicCfnResources.build({
  CustomFunctionName: 'SnsMessage',
  LogicalName: 'Logical Name', // a name to refer to the custom resource being built
  S3Bucket: 'Bucket Name', // the S3 bucket the code for the handler lives in
  S3Key: 'Key', // the S3 key for where the handler lives
  Handler: 'sns-message.SnsMessage', // references the handler created in the repository
  Properties: {
    SnsTopicArn: 'Topic Arn', // the ARN of the SNS Topic you are subscribing to
    Subject: 'Subject', // the subject of the message
    Message: 'Message', // the content for the message
  } 
});
```

*DynamoDBStreamLabel*
```js
const DynamoDBStreamLabel = magicCfnResources.build({
  CustomFunctionName: 'DynamoDBStreamLabel',
  LogicalName: 'Logical Name', // a name to refer to the custom resource being built
  S3Bucket: 'Bucket Name', // the S3 bucket the code for the handler lives in
  S3Key: 'Key', // the S3 key for where the handler lives
  Handler: 'dynamodb-stream-label.DynamoDBStreamLabel', // references the handler created in the repository
  Properties: {
    TableName: 'Name of Table', // the name of the DynamoDB table
    TableRegion: 'Region' // the region of the DynamoDB table i.e.: 'us-east-1'
  } 
});
```

*LogGroup*
```js
const LogGroup = magicCfnResources.build({
  CustomFunctionName: 'LogGroup',
  LogicalName: 'Logical Name', // a name to refer to the custom resource being built
  S3Bucket: 'Bucket Name', // the S3 bucket the code for the handler lives in
  S3Key: 'Key', // the S3 key for where the handler lives
  Handler: 'log-group.LogGroup', // references the handler created in the repository
  Properties: {
    LogGroupName: 'Name' ,// name for the log group
    IgnoreConflicts: true // optional, false by default
  } 
});
```

*StackOutputs*
```js
const StackOutputs = magicCfnResources.build({
  CustomFunctionName: 'StackOutputs',
  LogicalName: 'Logical Name', // a name to refer to the custom resource being built
  S3Bucket: 'Bucket Name', // the S3 bucket the code for the handler lives in
  S3Key: 'Key', // the S3 key for where the handler lives
  Handler: 'stack-outputs.StackOutputs', // references the handler created in the repository
  Properties: {
    StackName: 'Name', // name of the CloudFormation stack
    StackRegion: 'region' // region of the CloudFormation stack i.e.: 'us-east-1'
  } 
});
```

*SpotFleet*
```js
const SpotFleet = magicCfnResources.build({
  CustomFunctionName: 'SpotFleet',
  LogicalName: 'Logical Name', // a name to refer to the custom resource being built
  S3Bucket: 'Bucket Name', // the S3 bucket the code for the handler lives in
  S3Key: 'Key', // the S3 key for where the handler lives
  Handler: 'spot-fleet.SpotFleet', // references the handler created in the repository
  Properties: {
    SpotFleetRequestConfigData: { }, // object with SpotFleet configuration specifics
    SpotFleetRegion: 'region', // region of the SpotFleet i.e.: 'us-east-1'
  } 
});
```

#### Merge the resources created with `build` with the resources already in the stack's template:. i.e.:
```js
const cloudfriend = require('@mapbox/cloudfriend');
const magicCfnResources = require('@mapbox/magic-cfn-resources');

module.exports = cloudfriend.merge(SnsSubscription, <Stack Resources>);
```

## To build new functions

Check out [contributing.md](https://github.com/mapbox/magic-cfn-functions/blob/master/contributing.md) for a discussion of the framework this library provides for writing other functions.
