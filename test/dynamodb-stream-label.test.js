const DynamoDBStreamLabel = require('../functions/dynamodb-stream-label');
const test = require('tape');
const AWS = require('@mapbox/mock-aws-sdk-js');
const https = require('https');

// Confirm create calls describe table and returns LatestStreamLabel
// Confirm create handles labelless table
// Confirm create handles error
// Confirm update calls create
// Confirm delete does nothing
// Confirm manage function parses event and relays LatestStreamLabel through Response

test('[dynamodb-stream-label] create handles errors', assert => {
  AWS.stub('DynamoDB', 'describeTable', (opts, cb) => {
    assert.deepEquals(opts, { TableName: 'special-table' }, 'describeTable params');
    return cb(new Error('random error'));
  });

  const stream = new DynamoDBStreamLabel('special-table', 'us-east-1');

  stream.create((err) => {
    assert.equals(err.message, 'random error');
    AWS.DynamoDB.restore();
    assert.end();
  });
});

test('[dynamodb-stream-label] create handles success', assert => {
  AWS.stub('DynamoDB', 'describeTable', (opts, cb) => {
    assert.deepEquals(opts, { TableName: 'special-table' }, 'describeTable params');
    return cb(null, {
      Table: {
        LatestStreamLabel: '2017-03-02T05:00:00.000Z'
      }
    });
  });

  const stream = new DynamoDBStreamLabel('special-table', 'us-east-1');

  stream.create((err, label) => {
    assert.ifError(err, 'should not error');
    assert.equals(label, '2017-03-02T05:00:00.000Z', 'stream label');
    AWS.DynamoDB.restore();
    assert.end();
  });
});

test('[dynamodb-stream-label] create handles missing stream label', assert => {
  AWS.stub('DynamoDB', 'describeTable', (opts, cb) => {
    assert.deepEquals(opts, { TableName: 'special-table' }, 'describeTable params');
    return cb(null, {
      Table: {}
    });
  });

  const stream = new DynamoDBStreamLabel('special-table', 'us-east-1');

  stream.create((err) => {
    assert.equals(err.message, 'Table is not stream enabled', 'missing label error');
    AWS.DynamoDB.restore();
    assert.end();
  });
});

test('[dynamodb-stream-label] update does the same thing as create', assert => {
  AWS.stub('DynamoDB', 'describeTable', (opts, cb) => {
    assert.deepEquals(opts, { TableName: 'special-table' }, 'describeTable params');
    return cb(null, {
      Table: {
        LatestStreamLabel: '2017-03-02T05:00:00.000Z'
      }
    });
  });

  const stream = new DynamoDBStreamLabel('special-table', 'us-east-1');

  stream.update((err, label) => {
    assert.ifError(err, 'should not error');
    assert.equals(label, '2017-03-02T05:00:00.000Z', 'stream label');
    AWS.DynamoDB.restore();
    assert.end();
  });
});

test('[dynamodb-stream-label] delete does nothing', assert => {
  const describe = AWS.stub('DynamoDB', 'describeTable', (opts, cb) => {
    assert.deepEquals(opts, { TableName: 'special-table' }, 'describeTable params');
    return cb(null, {
      Table: {
        LatestStreamLabel: '2017-03-02T05:00:00.000Z'
      }
    });
  });

  const stream = new DynamoDBStreamLabel('special-table', 'us-east-1');

  stream.delete(() => {
    assert.equals(describe.callCount, 0, 'describe should not be called');
    AWS.DynamoDB.restore();
    assert.end();
  });
});

test('[dynamodb-stream-label] manage parses events and relays LatestStreamLabel through Response', assert => {
  AWS.stub('DynamoDB', 'describeTable', (opts, cb) => {
    assert.deepEquals(opts, { TableName: 'special-table' }, 'describeTable params');
    return cb(null, {
      Table: {
        LatestStreamLabel: '2017-03-02T05:00:00.000Z'
      }
    });
  });

  https.request = (options, cb) => {
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

  DynamoDBStreamLabel.manage({
    ResponseURL: 'http://aws.response.com/hello',
    PhysicalResourceId: 'abc',
    StackId: 'abc',
    LogicalResourceId: 'abc',
    ResourceProperties: {
      TableName: 'special-table',
      TableRegion: 'us-east-1'
    },
    RequestId: 'abc',
    RequestType: 'CREATE'
  }, {
    done: (err, body) => {
      assert.ifError(err, 'should not error');
      assert.equals(JSON.parse(body).PhysicalResourceId, '2017-03-02T05:00:00.000Z', 'PhysicalResourceId is stream label');
      AWS.DynamoDB.restore();
      assert.end();
    }
  });
});
