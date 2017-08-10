const LogGroup = require('../functions/log-group');
const test = require('tape');
const AWS = require('@mapbox/mock-aws-sdk-js');
const http = require('http');

test('[log-group] create handles error', (assert) => {
  const createLogGroup = AWS.stub('CloudWatchLogs', 'createLogGroup', (opts, cb) => {
    assert.deepEqual(opts, {
      logGroupName: 'LogGroup Name'
    });
    cb(new Error('createLogGroup error'));
  });

  const loggroup = new LogGroup('LogGroup Name', false, 'us-east-1');

  loggroup.create((err) => {
    assert.equals(err.message, 'createLogGroup error', 'errors');
    assert.ok(createLogGroup.callCount === 1, 'createLogGroup called');
    AWS.CloudWatchLogs.restore();
    assert.end();
  });
});

test('[log-group] create handles success', (assert) => {
  const createLogGroup = AWS.stub('CloudWatchLogs', 'createLogGroup', (opts, cb) => {
    assert.deepEqual(opts, {
      logGroupName: 'LogGroup Name'
    });
    cb();
  });

  const loggroup = new LogGroup('LogGroup Name', false, 'us-east-1');

  loggroup.create((err) => {
    assert.ifError(err, 'should not error');
    assert.ok(createLogGroup.callCount === 1, 'createLogGroup called');
    AWS.CloudWatchLogs.restore();
    assert.end();
  });
});

test('[log-group] update does the same thing as create', (assert) => {
  const createLogGroup = AWS.stub('CloudWatchLogs', 'createLogGroup', (opts, cb) => {
    assert.deepEqual(opts, {
      logGroupName: 'LogGroup Name'
    });
    cb();
  });

  const loggroup = new LogGroup('LogGroup Name', false, 'us-east-1');

  loggroup.update((err) => {
    assert.ifError(err, 'should not error');
    assert.ok(createLogGroup.callCount === 1, 'createLogGroup called');
    AWS.CloudWatchLogs.restore();
    assert.end();
  });
});

test('[log-group] delete does nothing', (assert) => {
  const loggroup = new LogGroup('LogGroup Name', false, 'us-east-1');
  loggroup.delete(() => {
    assert.end();
  });
});

test('[log-group] manage parses events and relays LatestStreamLabel through Response', assert => {
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

  const createLogGroup = AWS.stub('CloudWatchLogs', 'createLogGroup', (opts, cb) => {
    assert.deepEqual(opts, {
      logGroupName: 'LogGroup Name'
    });
    cb();
  });

  LogGroup.manage({
    ResponseURL: 'http://aws.response.com/hello',
    PhysicalResourceId: 'abc',
    StackId: 'abc:def:ghi:stackId',
    LogicalResourceId: 'abc',
    ResourceProperties: {
      LogGroupName: 'LogGroup Name',
      IgnoreConflicts: 'false',
      Region: 'us-east-1'
    },
    RequestId: 'abc',
    RequestType: 'CREATE'
  }, {
    done: (err, body) => {
      assert.ifError(err, 'should not error');
      assert.equals(JSON.parse(body).Status, 'SUCCESS');
      createLogGroup.restore();
      assert.end();
    }
  });
});