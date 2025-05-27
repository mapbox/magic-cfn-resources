const test = require('tape');
const { validCloudFormationEvent } = require('../lib/utils');

test('validCloudFormationEvent - valid event returns true', t => {
  const validEvent = {
    RequestType: 'Create',
    ResourceProperties: {},
    StackId: 'arn:aws:cloudformation:...',
    LogicalResourceId: 'MyResource',
    RequestId: 'unique-id',
    ResponseURL: 'https://cloudformation-custom-resource-response'
  };
  t.equal(validCloudFormationEvent(validEvent), true, 'Returns true for valid event');
  t.end();
});

test('validCloudFormationEvent - missing one required key returns false', t => {
  const invalidEvent = {
    RequestType: 'Create',
    ResourceProperties: {},
    StackId: 'arn:aws:cloudformation:...',
    LogicalResourceId: 'MyResource',
    // Missing RequestId
    ResponseURL: 'https://cloudformation-custom-resource-response'
  };

  t.equal(validCloudFormationEvent(invalidEvent), false, 'Returns false when one key is missing');
  t.end();
});

test('validCloudFormationEvent - all keys missing returns false', t => {
  const emptyEvent = {};
  t.equal(validCloudFormationEvent(emptyEvent), false, 'Returns false for empty object');
  t.end();
});

test('validCloudFormationEvent - null and undefined return false', t => {
  t.equal(validCloudFormationEvent(null), false, 'Returns false for null');
  t.equal(validCloudFormationEvent(undefined), false, 'Returns false for undefined');
  t.end();
});