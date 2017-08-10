const build = require('../lib/build').build;
// const cf = require('@mapbox/cloudfriend');
const test = require('tape');

test('[build] error scenarios', assert => {
  // Test that it doesn't work for a bogus function
  assert.throws(() => {
    build({
      CustomFunctionName: 'bogus',
      LogicalName: 'BogusResource', 
      S3Bucket: 'code bucket', 
      S3Key: 'lambda/code',
      Handler: 'my.handler',
      Properties: { isBogus: true }
    });
  }, /bogus is not an available function/, 'not a valid CustomFunctionName');

  // Test that you need CustomFunctionName
  assert.throws(() => {
    build({
      customfunctionname: 'SpotFleet',
      LogicalName: 'SpotFleetResource',
      S3Key: 'lambda/code',
      S3Bucket: 'code',
      Handler: 'my.handler',
      Properties: { 
        SpotFleetRequestConfigData: { },
        SpotFleetRegion: 'region'
      }
    });
  }, /Missing CustomFunctionName/, 'missing CustomFunctionName');

  // Test that you need LogicalName
  assert.throws(() => {
    build({
      CustomFunctionName: 'SpotFleet',
      Handler: 'my.handler',
      Properties: { 
        SpotFleetRequestConfigData: { },
        SpotFleetRegion: 'region'
      }
    });
  }, /Missing LogicalName/, 'missing LogicalName');

  // Test that you need S3Bucket
  assert.throws(() => {
    build({
      CustomFunctionName: 'SpotFleet',
      LogicalName: 'SpotFleetResource',
      S3Key: 'lambda/code',
      Handler: 'my.handler',
      Properties: { 
        SpotFleetRequestConfigData: { },
        SpotFleetRegion: 'region'
      }
    });
  }, /Missing S3Bucket/, 'missing S3Bucket');
  
  // Test that you need S3Key
  assert.throws(() => {
    build({
      CustomFunctionName: 'SpotFleet',
      LogicalName: 'SpotFleetResource',
      S3Bucket: 'code',
      Handler: 'my.handler',
      Properties: { 
        SpotFleetRequestConfigData: { },
        SpotFleetRegion: 'region'
      }
    });
  }, /Missing S3Key/, 'missing S3Key');

  // Test that you need Handler
  assert.throws(() => {
    build({
      CustomFunctionName: 'SpotFleet',
      LogicalName: 'SpotFleetResource',
      S3Key: 'lambda/code',
      S3Bucket: 'code'
    });
  }, /Missing Handler/, 'missing Handler');

  // Test that you need Properties
  assert.throws(() => {
    build({
      CustomFunctionName: 'SpotFleet',
      LogicalName: 'SpotFleetResource',
      S3Key: 'lambda/code',
      S3Bucket: 'code',
      Handler: 'my.handler'
    });
  }, /Missing Properties/, 'missing Properties');

  assert.end();
});

// Test that once you have everything, it returns the right resource with all of the right fields
test('[build] success', assert => {
  const template = build({
    CustomFunctionName: 'SpotFleet',
    LogicalName: 'SpotFleetResource',
    S3Key: 'lambda/code',
    S3Bucket: 'code',
    Handler: 'my.handler',
    Properties: { 
      SpotFleetRequestConfigData: { },
      SpotFleetRegion: 'region'
    }
  });

  assert.deepEquals(Object.keys(template.Resources), ['SpotFleetRole', 'SpotFleetFunction', 'SpotFleet']);
  assert.equals(template.Resources.SpotFleetRole.Type, 'AWS::IAM::Role');
  assert.equals(template.Resources.SpotFleetFunction.Type, 'AWS::Lambda::Function');

  assert.equals(template.Resources.SpotFleetFunction.Properties.Code.S3Bucket, 'code');
  assert.deepEquals(template.Resources.SpotFleetFunction.Properties.Code.S3Key, 'lambda/code');
  assert.equals(template.Resources.SpotFleetFunction.Properties.Handler, 'my.handler');

  assert.end();
});
