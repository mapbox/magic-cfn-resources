// builds cfn resources for lambda function
const cf = require('@mapbox/cloudfriend');

module.exports.build = build;
function build(params) {
  const functions = new Set(['SnsSubscription', 'SnsMessage', 'DynamoDBStreamLabel', 'LogGroup', 'StackOutputs', 'SpotFleet']);
  
  if(!params.CustomFunctionName)
    throw new Error('Missing CustomFunctionName');
  if (!functions.has(params.CustomFunctionName))
    throw new Error(`${params.CustomFunctionName} is not a custom-cfn-function`);
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

  const customFunctions = {
    SnsSubscription: {
      // ### SNS Subscriptions Role
      // The IAM role that is associated with the SNS subscriptions function,
      // which provides permission for the function to manage subscriptions
      SnsSubscriptionRole: {
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
      // ### SNS Subscriptions
      // Can be used to automatically subscribe email addresses to SNS topics. The
      // recepient **must confirm the subscription**.
      SnsSubscriptionFunction: {
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
          Role: cf.getAtt('SnsSubscriptionRole', 'Arn'),
          // - Other parameters as described by
          // [the AWS documentation](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html).
          Description: 'Manages SNS subscriptions',
          Handler: params.Handler,
          MemorySize: 128,
          Runtime: 'nodejs6.10',
          Timeout: 30
        }
      },
      SnsSubscription: {
        Name: params.LogicalName,
        Type: 'Custom::SnsSubscriptionFunction',
        Properties: {
          ServiceToken: cf.getAtt('SnsSubscriptionFunction', 'Arn'),
          SnsTopicArn: params.Properties.SnsTopicArn,
          Protocol: params.Properties.Protocol,
          Endpoint: params.Properties.Endpoint
        }
      }
    },
    SnsMessage: {
      // ### SNS Message Role
      // The IAM role that is associated with the SNS subscriptions function,
      // which provides permission for the function to manage subscriptions
      SnsMessageRole: {
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
              PolicyName: 'SnsMessagePolicy',
              PolicyDocument: {
                Statement: [
                  // The function can write CloudWatch Logs
                  {
                    Effect: 'Allow',
                    Action: ['logs:*'],
                    Resource: 'arn:aws:logs:*:*:*'
                  },
                  // The function is able to publish to all SNS topics.
                  {
                    Effect: 'Allow',
                    Action: [
                      'sns:Publish'
                    ],
                    Resource: '*'
                  }
                ]
              }
            }
          ]
        }
      },
      // ### SNS Message
      // Can be used to send a message to a specific SNS topic.
      SnsMessageFunction: {
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
          Role: cf.getAtt('SnsMessageRole', 'Arn'),
          // - Other parameters as described by
          // [the AWS documentation](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html).
          Description: 'Sends SNS messages',
          Handler: params.Handler,
          MemorySize: 128,
          Runtime: 'nodejs6.10',
          Timeout: 30
        }
      },
      SnsMessage: {
        Name: params.LogicalName,
        Type: 'Custom::SnsMessageFunction',
        Properties: {
          ServiceToken: cf.getAtt('SnsMessageFunction', 'Arn'),
          SnsTopicArn: params.Properties.SnsTopicArn,
          Subject: params.Properties.Subject,
          Message: params.Properties.Message
        }
      }
    },
    DynamoDBStreamLabel: {
      // ### DynamoDB Stream Label Role
      // The IAM role that is associated with the DynamoDB Stream Label function,
      // which provides permission for the function to describe DynamoDB tables
      DynamoDBStreamLabelRole: {
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
      // ### DynamoDB Stream Label
      // Can be used to look up the label for a stream associated with a DynamoDB
      // table.
      DynamoDBStreamLabelFunction: {
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
          Role: cf.getAtt('DynamoDBStreamLabelRole', 'Arn'),
          // - Other parameters as described by
          // [the AWS documentation](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html).
          Description: 'Retrieves DynamoDB stream labels',
          Handler: params.Handler,
          MemorySize: 128,
          Runtime: 'nodejs6.10',
          Timeout: 60
        }
      },
      DynamoDBStreamLabel: {
        Name: params.LogicalName,
        Type: 'Custom::DynamoDBStreamLabelFunction',
        Properties: {
          ServiceToken: cf.getAtt('DynamoDBStreamLabelFunction', 'Arn'),
          TableName: params.Properties.TableName,
          TableRegion: params.Properties.TableRegion
        }
      }
    },
    LogGroup: {
      // ### CloudWatchLogs LogGroup Role
      // The IAM role that is associated with the CloudWatchLogs LogGroup function,
      // which provides permission for the function to manage LogGroups
      LogGroupRole: {
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
                  }
                ]
              }
            }
          ]
        }
      },
      // ### CloudWatchLogs LogGroup
      // Can be used to specify a name when creating a LogGroup. Native CloudFormation
      // does not allow you to specify a name.
      LogGroupFunction: {
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
          Role: cf.getAtt('LogGroupRole', 'Arn'),
          // - Other parameters as described by
          // [the AWS documentation](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html).
          Description: 'Manages CloudWatchLogs LogGroups',
          Handler: params.Handler,
          MemorySize: 128,
          Runtime: 'nodejs6.10',
          Timeout: 30
        }
      },
      LogGroup: {
        Name: params.LogicalName,
        Type: 'Custom::LogGroupFunction',
        Properties: {
          ServiceToken: cf.getAtt('LogGroupFunction', 'Arn'),
          LogGroupName: params.Properties.LogGroupName,
          IgnoreConflicts: params.Properties.IgnoreConflicts || false
        }
      }
    },
    StackOutputs: {
      // ### CloudFormation StackOutputs Role
      // The IAM role that is associated with the CloudFormation StackOutputs function,
      // which provides permission for the function to lookup stack outputs
      StackOutputsRole: {
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
      // ### CloudFormation StackOutputs
      // Can be used to look up outputs from other CloudFormation stacks
      StackOutputsFunction: {
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
          Role: cf.getAtt('StackOutputsRole', 'Arn'),
          // - Other parameters as described by
          // [the AWS documentation](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html).
          Description: 'Lookup CloudFormation stack outputs',
          Handler: params.Handler,
          MemorySize: 128,
          Runtime: 'nodejs6.10',
          Timeout: 30
        }
      },
      StackOutputs: {
        Name: params.LogicalName,
        Type: 'Custom::StackOutputsFunction',
        Properties: {
          ServiceToken: cf.getAtt('LogGroupFunction', 'Arn'),
          Name: params.Properties.StackName,
          Region: params.Properties.StackRegion
        }
      }
    },
    SpotFleet: {
      // ### Spot Fleet Role
      // The IAM role that is associated with the SporFleet function,
      // which provides permission for the function to manage spot fleets
      SpotFleetRole: {
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
                    Action: [
                      'ec2:*',
                      'iam:PassRole',
                      'iam:ListRoles',
                      'iam:ListInstanceProfiles'
                    ],
                    Resource: '*'
                  }
                ]
              }
            }
          ]
        }
      },
      // ### SpotFleet
      // Can be used to create a SpotFleet whose instances will not be terminated
      // when the SpotFleet request is canceled during a CFN update.
      SpotFleetFunction: {
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
          Role: cf.getAtt('SpotFleetRole', 'Arn'),
          // - Other parameters as described by
          // [the AWS documentation](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html).
          Description: 'Manages SpotFleets',
          Handler: params.Handler,
          MemorySize: 128,
          Runtime: 'nodejs6.10',
          Timeout: 30
        }
      },
      SpotFleet: {
        Name: params.LogicalName,
        Type: 'Custom::SpotFleetFunction',
        Properties: {
          ServiceToken: cf.getAtt('SpotFleetFunction', 'Arn'),
          SpotFleetRequestConfigData: params.Properties.SpotFleetRequestConfigData,
          Region: params.Properties.SpotFleetRegion
        }
      }
    }
  };

  return { Resources: customFunctions[params.CustomFunctionName] };
}
    
    

    
    
    
    
  