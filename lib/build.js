// builds cfn resources for lambda function
const cf = require('@mapbox/cloudfriend');

module.exports.build = build;
function build(params) {
  const functions = new Set(['SnsSubscription', 'DynamoDBStreamLabel', 'StackOutputs', 'SpotFleet']);

  if(!params.CustomResourceName)
    throw new Error('Missing CustomResourceName');
  if (!functions.has(params.CustomResourceName))
    throw new Error(`${params.CustomResourceName} is not an available magical-cfn-resource`);
  if (!params.LogicalName)
    throw new Error('Missing LogicalName');
  if (!params.S3Bucket)
    throw new Error('Missing S3Bucket');
  if (!params.S3Key)
    throw new Error('Missing S3Key');
  if (!params.Handler)
    throw new Error('Missing Handler');
  if (!params.Properties)
    throw new Error('Missing Properties');
  if (params.CustomResourceName === 'SpotFleet') {
    if (!params.Properties.SpotFleetRequestConfigData)
      throw new Error('Missing SpotFleetRequestConfigData');
    if (!params.Properties.SpotFleetRequestConfigData.LaunchSpecifications)
      throw new Error('Missing LaunchSpecifications in SpotFleetRequestConfigData');
    if (!params.Properties.SpotFleetRequestConfigData.LaunchSpecifications[0])
      throw new Error('Missing LaunchSpecifications[0] in SpotFleetRequestConfigData');
    if (!params.Properties.SpotFleetRequestConfigData.LaunchSpecifications[0].IamInstanceProfile)
      throw new Error('Missing IamInstanceProfile in SpotFleetRequestConfigData.LaunchSpecifications[0]');
    if (!params.Properties.SpotFleetRequestConfigData.IamFleetRole)
      throw new Error('Missing IamFleetRole in SpotFleetRequestConfigData');
  }

  const CustomResource = {};

  const roles = {
    SnsSubscription: {
      Type: 'AWS::IAM::Role',
      Properties: {
        // #### Assume role policy
        // Identifies that this role can be assumed by a Lambda function.
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Sid: '',
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com'
              },
              Action: 'sts:AssumeRole'
            }
          ]
        },
        Policies: [
          {
            // #### Runtime policy
            // Defines the permissions that the Lambda function will
            // have once it has assumed this role.
            PolicyName: 'SnsSubscriptionPolicy',
            PolicyDocument: {
              Statement: [
                // The function can write CloudWatch Logs
                {
                  Effect: 'Allow',
                  Action: ['logs:*'],
                  Resource: 'arn:aws:logs:*:*:*'
                },
                // The function is able to create and delete subscriptions
                // for all SNS topics.
                {
                  Effect: 'Allow',
                  Action: [
                    'sns:Subscribe',
                    'sns:Unsubscribe',
                    'sns:ListSubscriptionsByTopic'
                  ],
                  Resource: '*'
                }
              ]
            }
          }
        ]
      }
    },
    DynamoDBStreamLabel: {
      Type: 'AWS::IAM::Role',
      Properties: {
        // #### Assume role policy
        // Identifies that this role can be assumed by a Lambda function.
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Sid: '',
              Effect: 'Allow',
              Principal: { Service: 'lambda.amazonaws.com' },
              Action: 'sts:AssumeRole'
            }
          ]
        },
        Policies: [
          {
            // #### Runtime policy
            // Defines the permissions that the Lambda function will have once
            // it has assumed this role.
            PolicyName: 'DynamoDBStreamLabelPolicy',
            PolicyDocument: {
              Statement: [
                // The function can write CloudWatch Logs
                {
                  Effect: 'Allow',
                  Action: ['logs:*'],
                  Resource: 'arn:aws:logs:*:*:*'
                },
                // The function is able to describe DynamoDB tables
                {
                  Effect: 'Allow',
                  Action: [
                    'dynamodb:DescribeTable'
                  ],
                  Resource: '*'
                }
              ]
            }
          }
        ]
      }
    },
    StackOutputs: {
      Type: 'AWS::IAM::Role',
      Properties: {
        // #### Assume role policy
        // Identifies that this role can be assumed by a Lambda function.
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Sid: '',
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com'
              },
              Action: 'sts:AssumeRole'
            }
          ]
        },
        Policies: [
          {
            // #### Runtime policy
            // Defines the permissions that the Lambda function will
            // have once it has assumed this role.
            PolicyName: 'LogGroupPolicy',
            PolicyDocument: {
              Statement: [
                // The function can write to and create CloudWatch Logs
                {
                  Effect: 'Allow',
                  Action: ['logs:*'],
                  Resource: 'arn:aws:logs:*:*:*'
                },
                // The function can describe stacks
                {
                  Effect: 'Allow',
                  Action: ['cloudformation:DescribeStacks'],
                  Resource: '*'
                }
              ]
            }
          }
        ]
      }
    },
    SpotFleet: {
      Type: 'AWS::IAM::Role',
      Properties: {
        // #### Assume role policy
        // Identifies that this role can be assumed by a Lambda function.
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Sid: '',
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com'
              },
              Action: 'sts:AssumeRole'
            }
          ]
        },
        Policies: [
          {
            // #### Runtime policy
            // Defines the permissions that the Lambda function will
            // have once it has assumed this role.
            PolicyName: 'SpotFleetPolicy',
            PolicyDocument: {
              Statement: [
                // The function can write CloudWatch Logs
                {
                  Effect: 'Allow',
                  Action: ['logs:*'],
                  Resource: 'arn:aws:logs:*:*:*'
                },
                // The function is able to create and delete spot fleet requests
                {
                  Effect: 'Allow',
                  Action: ['ec2:*'],
                  Resource: '*'
                },
                {
                  Effect: 'Allow',
                  Action: [
                    'iam:ListRoles',
                    'iam:PassRole'
                  ],
                  Resource: params.Properties.SpotFleetRequestConfigData.IamFleetRole
                },
                {
                  Effect: 'Allow',
                  Action: ['iam:ListInstanceProfiles'],
                  Resource: params.Properties.SpotFleetRequestConfigData.LaunchSpecifications
                    .map((spec) => spec.IamInstanceProfile)
                }
              ]
            }
          }
        ]
      }
    }
  };
  CustomResource[`${params.LogicalName}Role`] = roles[params.CustomResourceName];
  CustomResource[`${params.LogicalName}Function`] = {
    Type: 'AWS::Lambda::Function',
    // #### Properties
    Properties: {
      // - Code: You must upload your Lambda function as a .zip file
      // to S3, and refer to it here.
      Code: {
        S3Bucket: params.S3Bucket,
        S3Key: params.S3Key
      },
      // - Role: Refers to the ARN of the Role defined above.
      Role: cf.getAtt(`${params.LogicalName}Role`, 'Arn'),
      // - Other parameters as described by
      // [the AWS documentation](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html).
      Description: `Manages ${params.CustomResourceName}`,
      Handler: params.Handler,
      MemorySize: 128,
      Runtime: 'nodejs6.10',
      Timeout: 30
    }
  };
  CustomResource[params.LogicalName] = {
    Type: 'Custom::MagicCfnResource',
    Properties: Object.assign({ ServiceToken: cf.getAtt(`${params.LogicalName}Function`, 'Arn')}, params.Properties)
  };

  if (params.Condition) { 
    CustomResource[`${params.LogicalName}Role`]['Condition'] = params.Condition;
    CustomResource[`${params.LogicalName}Function`]['Condition'] = params.Condition;
    CustomResource[params.LogicalName]['Condition'] = params.Condition;
  }

  return { Resources: CustomResource };
}
