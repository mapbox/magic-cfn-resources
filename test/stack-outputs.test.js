const StackOutputs = require('../functions/stack-outputs');
const test = require('tape');
const AWS = require('@mapbox/mock-aws-sdk-js');
const http = require('http');

test('[stack-outputs] create handles errors', assert => {
  AWS.stub('CloudFormation', 'describeStacks', (opts, cb) => {
    assert.deepEquals(opts, {
      StackName: 'StackName'
    }, 'describeStacks params');
    return cb(new Error('random error'));
  });

  const stackoutputs = new StackOutputs('StackName', 'us-east-1');

  stackoutputs.create((err) => {
    assert.equals(err.message, 'random error', 'errors');
    AWS.CloudFormation.restore();
    assert.end();
  });
});

test('[stack-outputs] create handles success', assert => {
  const describeStacks = AWS.stub('CloudFormation', 'describeStacks', (opts, cb) => {
    assert.deepEquals(opts, {
      StackName: 'StackName'
    }, 'describeStacks params');
    return cb(null, { Stacks: [ { Outputs: [{ OutputKey: 'First', OutputValue: 'first output' }, { OutputKey: 'Second', OutputValue: 'second output'}] }] });
  });

  const stackoutputs = new StackOutputs('StackName', 'us-east-1');

  stackoutputs.create((err, res) => {
    assert.ifError(err, 'should not error');
    assert.ok(describeStacks.callCount === 1, 'describeStacks called');
    assert.deepEqual(res, { First: 'first output', Second: 'second output' }, 'response has output key and output value');
    AWS.CloudFormation.restore();
    assert.end();
  });
});

test('[stack-outputs] update does the same thing as create', assert => {
  AWS.stub('CloudFormation', 'describeStacks', (opts, cb) => {
    assert.deepEquals(opts, {
      StackName: 'StackName'
    }, 'describeStacks params');
    return cb(null, { Stacks: [ { Outputs: [{ OutputKey: 'First', OutputValue: 'first output' }, { OutputKey: 'Second', OutputValue: 'second output'}] }] });
  });

  const stackoutputs = new StackOutputs('StackName', 'us-east-1');

  stackoutputs.update((err, res) => {
    assert.ifError(err, 'should not error');
    assert.deepEqual(res, { First: 'first output', Second: 'second output' }, 'response has output key and output value');
    AWS.CloudFormation.restore();
    assert.end();
  });
});

test('[stack-outputs] delete does nothing', assert => {
  const stackoutputs = new StackOutputs('StackName', 'us-east-1');

  stackoutputs.delete(() => {
    assert.end();
  });
});

test('[stack-outputs] manage parses events and relays LatestStreamLabel through Response', assert => {
  http.request = (options, cb) => {
    return {
      on: function() {
        return this;
      },
      write: () => {},
      end: () => {
        return cb();
      }
    };
  };

  const describeStacks = AWS.stub('CloudFormation', 'describeStacks', (opts, cb) => {
    assert.deepEquals(opts, {
      StackName: 'Stack Name'
    }, 'describeStacks params');
    return cb(null, { Stacks: [ { Outputs: [{ OutputKey: 'First', OutputValue: 'first output' }, { OutputKey: 'Second', OutputValue: 'second output'}] }] });
  });


  StackOutputs.manage({
    ResponseURL: 'http://api.mapbox.com/hello',
    PhysicalResourceId: 'abc',
    StackId: 'abc',
    LogicalResourceId: 'abc',
    ResourceProperties: {
      StackName: 'Stack Name',
      Region: 'us-east-1'
    },
    RequestId: 'abc',
    RequestType: 'CREATE'
  }, {
    done: (err, body) => {
      assert.ifError(err, 'no error');
      assert.ok (describeStacks.callCount === 1, 'describeStacks called');
      assert.equals(JSON.parse(body).Status, 'SUCCESS', 'status is success');
      AWS.CloudFormation.restore();
      assert.end();
    }
  });

});
