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
            IamInstanceProfile: 'cauliflower'
          },
          {
            IamInstanceProfile: 'cauliflower2'
          },
          {
            IamInstanceProfile: 'cauliflower3'
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
  assert.deepEqual(template.Resources.SpotFleetLogicalNameRole.Properties.Policies[0].PolicyDocument.Statement[3].Resource,['cauliflower','cauliflower2','cauliflower3']); 

  assert.end();
});

test('[build] success with Conditional', assert => {
  const template =  build({
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
  });
  assert.equals(template.Resources.SpotFleetLogicalNameRole.Condition, 'Conditional', 'Conditional in Role');
  assert.equals(template.Resources.SpotFleetLogicalNameFunction.Condition, 'Conditional', 'Conditional in Function');
  assert.equals(template.Resources.SpotFleetLogicalName.Condition, 'Conditional', 'Conditional in Custom Resource');
  assert.end();
})
