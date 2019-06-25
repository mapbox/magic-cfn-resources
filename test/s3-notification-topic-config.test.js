const S3NotificationConfig = require('../functions/s3-notification-topic-config');
const test = require('tape');
const AWS = require('@mapbox/mock-aws-sdk-js');
const http = require('http');

test('[s3-notification-topic-config] create handles errors', assert => {
  AWS.stub('S3', 'getBucketNotificationConfiguration', (cb) => {
    return cb(null, {
      TopicConfigurations: [],
      LambdaConfigurations: [],
      QueueConfigurations: []
    });
  });

  AWS.stub('S3', 'putBucketNotificationConfiguration', (opts, cb) => {
    assert.ok(opts.hasOwnProperty('NotificationConfiguration'), 'should have NotificationConfiguration passed in call');
    return cb(new Error('random error'));
  });

  const notificationConfig = new S3NotificationConfig('test-config', 'arn:aws:sns:us-east-1:special-topic', 'test-bucket', 'us-east-1', ['s3:objectCreated:*']);

  notificationConfig.create((err) => {
    assert.equal(err.message, 'random error', 'errors');
    AWS.S3.restore();
    assert.end();
  });
});

test('[s3-notification-topic-config] create handles success', assert => {
  AWS.stub('S3', 'getBucketNotificationConfiguration', (cb) => {
    return cb(null, {
      TopicConfigurations: [],
      LambdaConfigurations: [],
      QueueConfigurations: []
    });
  });

  AWS.stub('S3', 'putBucketNotificationConfiguration', (opts, cb) => {
    assert.ok(opts.hasOwnProperty('NotificationConfiguration'), 'should have NotificationConfiguration passed in call');
    return cb(null, 'putBucket success');
  });

  const notificationConfig = new S3NotificationConfig('test-config', 'arn:aws:sns:us-east-1:special-topic', 'test-bucket', 'us-east-1', ['s3:objectCreated:*']);

  notificationConfig.create((err, res) => {
    assert.ifError(err, 'does not error');
    assert.notOk(res, 'no response is success');
    AWS.S3.restore();
    assert.end();
  });
});

test('[s3-notification-topic-config] update deletes old topic config and creates the new one', assert => {
  const getBucket = AWS.stub('S3', 'getBucketNotificationConfiguration');
  getBucket.onCall(0).yields(null, {
    TopicConfigurations: [{
      Id: 'test-config',
      TopicArn: 'arn:aws:sns:us-east-1:special-topic',
      Events: [ 's3:ObjectCreated:*' ]
    }],
    LambdaConfigurations: [],
    QueueConfigurations: []
  });
  getBucket.onCall(1).yields(null, {
    TopicConfigurations: [],
    LambdaConfigurations: [],
    QueueConfigurations: []
  });

  const putBucket = AWS.stub('S3', 'putBucketNotificationConfiguration');
  putBucket.onCall(0).callsFake((opts, cb) => {
    assert.ok(opts.NotificationConfiguration.TopicConfigurations.length === 0, 'no TopicConfigurations');
    cb(null, 'putBucket success');
  });
  putBucket.onCall(1).callsFake((opts, cb) => {
    assert.ok(opts.hasOwnProperty('NotificationConfiguration'), 'has Notification configuration passed to function');
    cb(null, 'putBucket success');
  });

  const notificationConfig = new S3NotificationConfig(
    'test-config',
    'arn:aws:sns:us-east-1:special-topic',
    'test-bucket',
    'us-east-1',
    ['s3:objectCreated:*'],
    undefined,
    undefined,
    {
      Id: 'test-config',
      Bucket: 'test-bucket',
      BucketRegion: 'us-east-1'
    });

  notificationConfig.update((err, res) => {
    assert.ifError(err, 'does not error');
    assert.notOk(res, 'no response is success');
    getBucket.restore();
    putBucket.restore();
    assert.end();
  });
});

test('[s3-notification-topic-config] delete removes the config', assert => {
  AWS.stub('S3', 'getBucketNotificationConfiguration', (cb) => {
    return cb(null, {
      TopicConfigurations: [{
        Id: 'test-config',
        TopicArn: 'arn:aws:sns:us-east-1:special-topic',
        Events: [ 's3:ObjectCreated:*' ]
      }],
      LambdaConfigurations: [],
      QueueConfigurations: []
    });
  });

  AWS.stub('S3', 'putBucketNotificationConfiguration', (opts, cb) => {
    assert.ok(opts.hasOwnProperty('NotificationConfiguration'), 'should have NotificationConfiguration passed in call');
    assert.ok(opts.NotificationConfiguration.TopicConfigurations.length === 0, 'should not have any TopicConfigurations');
    return cb(null, 'putBucket success');
  });

  const notificationConfig = new S3NotificationConfig('test-config', 'arn:aws:sns:us-east-1:special-topic', 'test-bucket', 'us-east-1', ['s3:objectCreated:*']);

  notificationConfig.delete((err, res) => {
    assert.ifError(err, 'does not error');
    assert.notOk(res, 'no response is success');
    AWS.S3.restore();
    assert.end();
  });
});

test('[s3-notification-topic-config] manage parses events and relays LatestStreamLabel through Response', assert => {
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

  AWS.stub('S3', 'getBucketNotificationConfiguration', (cb) => {
    return cb(null, {
      TopicConfigurations: [],
      LambdaConfigurations: [],
      QueueConfigurations: []
    });
  });

  AWS.stub('S3', 'putBucketNotificationConfiguration', (opts, cb) => {
    assert.ok(opts.hasOwnProperty('NotificationConfiguration'), 'should have NotificationConfiguration passed in call');
    assert.ok(opts.NotificationConfiguration.TopicConfigurations.length === 1, 'should have a TopicConfiguration');
    return cb(null, 'putBucket success');
  });

  S3NotificationConfig.manage({
    ResponseURL: 'https://api.mapbox.com/hello',
    PhysicalResourceId: 'abc',
    StackId: 'abc',
    LogicalResourceId: 'abc',
    ResourceProperties: {
      Id: 'test-config',
      SnsTopicArn: 'arn:aws:sns:us-east-1:special-topic',
      Bucket: 'test-bucket',
      BucketRegion: 'us-east-1',
      EventTypes: [ 's3:ObjectCreated:*' ],
      PrefixFilter: 'prefix',
      SuffixFilter: '.jpg'
    },
    RequestId: 'abc',
    RequestType: 'CREATE'
  }, {
    done: (err, body) => {
      assert.ifError(err, 'no error');
      assert.equals(JSON.parse(body).Status, 'SUCCESS', 'status is success');
      AWS.S3.restore();
      assert.end();
    }
  });
});
