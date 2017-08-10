const SnsMessage = require('../functions/sns-message');
const test = require('tape');
const AWS = require('@mapbox/mock-aws-sdk-js');
const http = require('http');

test('[sns-message] create handles errors', assert => {
  AWS.stub('SNS', 'publish', (opts, cb) => {
    assert.deepEquals(opts, {
      TopicArn: 'arn:special',
      Subject: 'Thing to say',
      Message: 'Specifics'
    });
    return cb(new Error('random error'));
  }); 

  const message = new SnsMessage('arn:special', 'Thing to say', 'Specifics', true);

  message.create((err) => {
    assert.equals(err.message, 'random error');
    AWS.SNS.restore();
    assert.end();
  });
});

test('[sns-message] create handles success', assert => {
  AWS.stub('SNS', 'publish', (opts, cb) => {
    assert.deepEquals(opts, {
      TopicArn: 'arn:special',
      Subject: 'Thing to say',
      Message: 'Specifics'
    });
    return cb();
  }); 

  const message = new SnsMessage('arn:special', 'Thing to say', 'Specifics', true);

  message.create((err) => {
    assert.ifError(err);
    AWS.SNS.restore();
    assert.end();
  });
});

test('[sns-message] update does the same thing as create when sendOnUpdate is `true`', assert => {
  const publish = AWS.stub('SNS', 'publish', (opts, cb) => {
    assert.deepEquals(opts, {
      TopicArn: 'arn:special',
      Subject: 'Thing to say',
      Message: 'Specifics'
    });
    return cb();
  }); 

  const message = new SnsMessage('arn:special', 'Thing to say', 'Specifics', true);

  message.update((err) => {
    assert.ifError(err);
    assert.equals(publish.callCount, 1);
    AWS.SNS.restore();
    assert.end();
  });
});

test('[sns-message] update does nothing when sendOnUpdate is `false`', assert => {
  const publish = AWS.stub('SNS', 'publish', (opts, cb) => {
    assert.deepEquals(opts, {
      TopicArn: 'arn:special',
      Subject: 'Thing to say',
      Message: 'Specifics'
    });
    return cb();
  }); 

  const message = new SnsMessage('arn:special', 'Thing to say', 'Specifics', false);

  message.update((err) => {
    assert.ifError(err);
    assert.equals(publish.callCount, 0);
    AWS.SNS.restore();
    assert.end();
  });
});

test('[sns-message] delete does nothing', assert => {
  const publish = AWS.stub('SNS', 'publish', (opts, cb) => {
    assert.deepEquals(opts, {
      TopicArn: 'arn:special',
      Subject: 'Thing to say',
      Message: 'Specifics'
    });
    return cb();
  }); 

  const message = new SnsMessage('arn:special', 'Thing to say', 'Specifics', false);

  message.delete((err) => {
    assert.ifError(err);
    assert.equals(publish.callCount, 0);
    AWS.SNS.restore();
    assert.end();
  });
});

test('[sns-message] manage parses events and relays LatestStreamLabel through Response', assert => {
  AWS.stub('SNS', 'publish', (opts, cb) => {
    assert.deepEquals(opts, {
      TopicArn: 'arn:special',
      Subject: 'Thing to say',
      Message: 'Specifics'
    });
    return cb();
  }); 

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

  SnsMessage.manage({
    ResponseURL: 'http://aws.response.com/hello',
    PhysicalResourceId: 'abc',
    StackId: 'abc',
    LogicalResourceId: 'abc',
    ResourceProperties: {
      SnsTopicArn: 'arn:special',
      Subject: 'Thing to say',
      Message: 'Specifics',
      SendOnUpdate: 'true'
    },
    RequestId: 'abc',
    RequestType: 'CREATE'
  }, {
    done: (err, body) => {
      assert.ifError(err);
      assert.equals(JSON.parse(body).Status, 'SUCCESS');
      AWS.SNS.restore();
      assert.end();
    }
  });
});
