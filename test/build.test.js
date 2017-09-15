const build = require('../lib/build').build;
// const cf = require('@mapbox/cloudfriend');
const test = require('tape');

test('[build] error scenarios', assert => {
  // Test that it doesn't work for a bogus resource
  assert.throws(() => {
    build({
      CustomResourceName: 'bogus',
      LogicalName: 'BogusResource', 
      S3Bucket: 'code bucket', 
      S3Key: 'lambda/code',
      Handler: 'my.handler',
      Properties: { isBogus: true }
    });
  }, /bogus is not an available magical-cfn-resource/, 'not a valid CustomResourceName');

  // Test that you need CustomFunctionName
  assert.throws(() => {
    build({
      customresourcename: 'SpotFleet',
      LogicalName: 'SpotFleetResource',
      S3Key: 'lambda/code',
      S3Bucket: 'code',
      Handler: 'my.handler',
      Properties: { 
        SpotFleetRequestConfigData: { },
        Region: 'region'
      }
    });
  }, /Missing CustomResourceName/, 'missing CustomResourceName');

  // Test that you need LogicalName
  assert.throws(() => {
    build({
      CustomResourceName: 'SpotFleet',
      Handler: 'my.handler',
      Properties: { 
        SpotFleetRequestConfigData: { },
        Region: 'region'
      }
    });
  }, /Missing LogicalName/, 'missing LogicalName');

  // Test that you need S3Bucket
  assert.throws(() => {
    build({
      CustomResourceName: 'SpotFleet',
      LogicalName: 'SpotFleetResource',
      S3Key: 'lambda/code',
      Handler: 'my.handler',
      Properties: { 
        SpotFleetRequestConfigData: { },
        Region: 'region'
      }
    });
  }, /Missing S3Bucket/, 'missing S3Bucket');
  
  // Test that you need S3Key
  assert.throws(() => {
    build({
      CustomResourceName: 'SpotFleet',
      LogicalName: 'SpotFleetResource',
      S3Bucket: 'code',
      Handler: 'my.handler',
      Properties: { 
        SpotFleetRequestConfigData: { },
        Region: 'region'
      }
    });
  }, /Missing S3Key/, 'missing S3Key');

  // Test that you need Handler
  assert.throws(() => {
    build({
      CustomResourceName: 'SpotFleet',
      LogicalName: 'SpotFleetResource',
      S3Key: 'lambda/code',
      S3Bucket: 'code'
    });
  }, /Missing Handler/, 'missing Handler');

  // Test that you need Properties
  assert.throws(() => {
    build({
      CustomResourceName: 'SpotFleet',
      LogicalName: 'SpotFleetResource',
      S3Key: 'lambda/code',
      S3Bucket: 'code',
      Handler: 'my.handler'
    });
  }, /Missing Properties/, 'missing Properties');

  // Test that you need Properties
  assert.throws(() => {
    build({
      CustomResourceName: 'SpotFleet',
      LogicalName: 'SpotFleetResource',
      S3Key: 'lambda/code',
      S3Bucket: 'code',
      Handler: 'my.handler',
      Properties: { 
        Region: 'region'
      }
    });
  }, /Missing SpotFleetRequestConfigData/, 'Missing SpotFleetRequestConfigData');

  // Test that you need SpotFleetRequestConfigData.IamInstanceProfile
  assert.throws(() => {
    build({
      CustomResourceName: 'SpotFleet',
      LogicalName: 'SpotFleetResource',
      S3Key: 'lambda/code',
      S3Bucket: 'code',
      Handler: 'my.handler',
      Properties: { 
        Region: 'region',
        SpotFleetRequestConfigData: {}
      }
    });
  }, /Missing LaunchSpecifications in SpotFleetRequestConfigData/, 'Missing LaunchSpecifications in SpotFleetRequestConfigData');

  // Test that you need SpotFleetRequestConfigData.IamInstanceProfile
  assert.throws(() => {
    build({
      CustomResourceName: 'SpotFleet',
      LogicalName: 'SpotFleetResource',
      S3Key: 'lambda/code',
      S3Bucket: 'code',
      Handler: 'my.handler',
      Properties: { 
        Region: 'region',
        SpotFleetRequestConfigData: {
          LaunchSpecifications: []
        }
      }
    });
  }, /Missing LaunchSpecifications\[0\] in SpotFleetRequestConfigData/, 'Missing LaunchSpecifications in SpotFleetRequestConfigData');

  // Test that you need Properties
  assert.throws(() => {
    build({
      CustomResourceName: 'SpotFleet',
      LogicalName: 'SpotFleetResource',
      S3Key: 'lambda/code',
      S3Bucket: 'code',
      Handler: 'my.handler',
      Properties: { 
        Region: 'region',
        SpotFleetRequestConfigData: {
          LaunchSpecifications: [{
            IamInstanceProfile: 'cauliflower'
          }]
        }
      }
    });
  }, /Missing IamFleetRole in SpotFleetRequestConfigData/, 'Missing IamFleetRole in SpotFleetRequestConfigData');

  assert.end();
});

// Test that once you have everything, it returns the right resource with all of the right fields
test('[build] success', assert => {
  const template = build({
    CustomResourceName: 'SpotFleet',
    LogicalName: 'SpotFleetLogicalName',
    S3Key: 'lambda/code',
    S3Bucket: 'code',
    Handler: 'my.handler',
    Properties: { 
      SpotFleetRequestConfigData: {
        LaunchSpecifications: [
          {
            IamInstanceProfile: {'Arn': 'cauliflower'}
          },
          {
            IamInstanceProfile: {'Arn': 'cauliflower2'}
          },
          {
            IamInstanceProfile: {'Arn': 'cauliflower3'}
          },
          {
            YeaNoProfile: 'cauliflower5'
          }
        ],
        IamFleetRole: 'parsnips'
      },
      Region: 'region'
    }
  });

  assert.deepEquals(Object.keys(template.Resources), ['SpotFleetLogicalNameRole', 'SpotFleetLogicalNameFunction', 'SpotFleetLogicalName'], 'role, function, and custom resource use logical name');
  assert.equals(template.Resources.SpotFleetLogicalNameRole.Type, 'AWS::IAM::Role', 'Type is AWS::IAM::Role');
  assert.equals(template.Resources.SpotFleetLogicalNameFunction.Type, 'AWS::Lambda::Function', 'Type is AWS::Lambda::Function');

  assert.equals(template.Resources.SpotFleetLogicalNameFunction.Properties.Code.S3Bucket, 'code', 'S3Bucket is params.S3Bucket');
  assert.deepEquals(template.Resources.SpotFleetLogicalNameFunction.Properties.Code.S3Key, 'lambda/code', 'S3Key is params.S3Key');
  assert.equals(template.Resources.SpotFleetLogicalNameFunction.Properties.Handler, 'my.handler', 'Handler is params.Handler');

  // Special spotfleet logic
  assert.equals(template.Resources.SpotFleetLogicalNameRole.Properties.Policies[0].PolicyDocument.Statement[2].Resource, 'parsnips'); 
  assert.deepEqual(template.Resources.SpotFleetLogicalNameRole.Properties.Policies[0].PolicyDocument.Statement[3].Resource,'cauliflower'); 

  assert.end();
});

test('[build] success on SnsSubscription', assert => {   
  const template = build({   
    CustomResourceName: 'SnsSubscription',   
    LogicalName: 'SnsSubscriptionLogicalName',   
    S3Key: 'lambda/code',    
    S3Bucket: 'code',    
    Handler: 'my.handler',   
    Properties: {    
      Protocol: 'email',   
      TopicArn: 'arn:aws:sns:us-east-1:special-topic',   
      Endpoint: 'someone@mapbox.com'   
    }    
  });    
   
  assert.deepEquals(Object.keys(template.Resources), ['SnsSubscriptionLogicalNameRole', 'SnsSubscriptionLogicalNameFunction', 'SnsSubscriptionLogicalName'], 'role, function, and custom resource use logical name');    
  assert.equals(template.Resources.SnsSubscriptionLogicalNameRole.Type, 'AWS::IAM::Role', 'Type is AWS::IAM::Role');   
  assert.equals(template.Resources.SnsSubscriptionLogicalNameFunction.Type, 'AWS::Lambda::Function', 'Type is AWS::Lambda::Function');   
   
  assert.equals(template.Resources.SnsSubscriptionLogicalNameFunction.Properties.Code.S3Bucket, 'code', 'S3Bucket is params.S3Bucket');    
  assert.deepEquals(template.Resources.SnsSubscriptionLogicalNameFunction.Properties.Code.S3Key, 'lambda/code', 'S3Key is params.S3Key');    
  assert.deepEqual(template.Resources.SnsSubscriptionLogicalName.Type,'Custom::SnsSubscription', 'Type equals Custom::SnSSubnscription');  
  assert.ok( typeof template.Resources.SnsSubscriptionLogicalName.Type === 'string', 'Resource Type name is a string');
  assert.equals(template.Resources.SnsSubscriptionLogicalNameFunction.Properties.Handler, 'my.handler', 'Handler is params.Handler');    
   
  assert.end();    
});    

test('[build] success with Conditional', assert => {
  const params = {
    CustomResourceName: 'SpotFleet',
    LogicalName: 'SpotFleetLogicalName',
    S3Key: 'lambda/code',
    S3Bucket: 'code',
    Handler: 'my.handler',
    Properties: { 
      SpotFleetRequestConfigData: {
        LaunchSpecifications: [{
          IamInstanceProfile: 'cauliflower'
        }],
        IamFleetRole: 'parsnips'
      },
      SpotFleetRegion: 'region'
    },
    Condition: 'Conditional'
  };
  const template =  build(params);
  assert.equals(template.Resources.SpotFleetLogicalNameRole.Condition, 'Conditional', 'Conditional in Role');
  assert.equals(template.Resources.SpotFleetLogicalNameFunction.Condition, 'Conditional', 'Conditional in Function');
  assert.equals(template.Resources.SpotFleetLogicalName.Condition, 'Conditional', 'Conditional in Custom Resource');
  assert.deepEqual(template.Resources.SpotFleetLogicalName.Type,'Custom::'+params.CustomResourceName, 'Type equals Custom::params.CustomResourceName');  
  assert.ok( typeof template.Resources.SpotFleetLogicalName.Type === 'string', 'Resource Type name is a string');
  assert.end();
})

test('[build] success with other resources for S3NotificationTopicConfig', assert => {
  const params = {
    CustomResourceName: 'S3NotificationTopicConfig',
    LogicalName: 'S3TopicConfig',
    S3Bucket: 'code',
    S3Key: 'lambda/code',
    Handler: 'my.handler',
    Properties: {
      Id: 'test-config',
      SnsTopicArn: 'arn:aws:sns:us-east-1:special-topic',
      Bucket: 'test-bucket',
      BucketRegion: 'us-east-1',
      EventTypes: ['s3:ObjectCreated:*'],
      BucketNotificationResources: [ 'arn:aws:s3:::test-bucket' ]
    }
  };

  const template = build(params);
  assert.ok(template.Resources.hasOwnProperty('S3TopicConfigSnsPolicy'), 'an SNS Policy is part of the resources built');
  assert.end();
});