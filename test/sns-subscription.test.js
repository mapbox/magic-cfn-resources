const SnsSubscription = require('../functions/sns-subscription');
const test = require('tape');
const AWS = require('@mapbox/mock-aws-sdk-js');
const http = require('http');

test('[sns-subscription] create handles errors', assert => {
  AWS.stub('SNS', 'subscribe', (opts, cb) => {
    assert.deepEquals(opts, {
      Protocol: 'email',
      TopicArn: 'arn:aws:sns:us-east-1:special-topic',
      Endpoint: 'someone@mapbox.com'
    });
    return cb(new Error('random error'));
  }); 

  const subscription = new SnsSubscription('arn:aws:sns:us-east-1:special-topic', 'email', 'someone@mapbox.com');

  subscription.create((err) => {
    assert.equals(err.message, 'random error');
    AWS.SNS.restore();
    assert.end();
  });
});

test('[sns-subscription] create handles success', assert => {
  const subscribe = AWS.stub('SNS', 'subscribe', (opts, cb) => {
    assert.deepEquals(opts, {
      Protocol: 'email',
      TopicArn: 'arn:aws:sns:us-east-1:special-topic',
      Endpoint: 'someone@mapbox.com'
    });
    return cb();
  }); 

  const subscription = new SnsSubscription('arn:aws:sns:us-east-1:special-topic', 'email', 'someone@mapbox.com');

  subscription.create((err) => {
    assert.ifError(err);
    assert.equals(subscribe.callCount, 1);
    AWS.SNS.restore();
    assert.end();
  });
});

test('[sns-subscription] update unsubscribes old endpoint and subscribes the new one', assert => {
  const subscribe = AWS.stub('SNS', 'subscribe', (opts, cb) => {
    assert.deepEquals(opts, {
      Protocol: 'email',
      TopicArn: 'arn:aws:sns:us-east-1:special-topic',
      Endpoint: 'someone-new@mapbox.com'
    });
    return cb();
  }); 

  const unsubscribe = AWS.stub('SNS', 'unsubscribe', (opts, cb) => {
    assert.deepEquals(opts, {
      SubscriptionArn: 'arn:aws:sns:us-east-1:special-subscription'
    });
    return cb();
  }); 

  const listSubscriptionsByTopic = AWS.stub('SNS', 'listSubscriptionsByTopic')
    .onCall(0)
    .callsFake((opts, cb) => {
      assert.deepEquals(opts, { TopicArn: 'arn:aws:sns:us-east-1:special-topic' });

      return cb(null, {
        Subscriptions: [{
          Endpoint: 'the.wrong.email@mapbox.com'
        }],
        NextToken: 'this-tells-you-to-page'
      });
    })
    .onCall(1)
    .callsFake((opts, cb) => {
      assert.deepEquals(opts, {
        TopicArn: 'arn:aws:sns:us-east-1:special-topic',
        NextToken: 'this-tells-you-to-page'
      });

      return cb(null, {
        Subscriptions: [{
          Endpoint: 'someone@mapbox.com',
          SubscriptionArn: 'arn:aws:sns:us-east-1:special-subscription'
        }]
      });
    });

  const subscription = new SnsSubscription('arn:aws:sns:us-east-1:special-topic', 'email', 'someone-new@mapbox.com', 'someone@mapbox.com');

  subscription.update((err) => {
    assert.ifError(err);
    assert.equals(subscribe.callCount, 1);
    assert.equals(unsubscribe.callCount, 1);
    assert.equals(listSubscriptionsByTopic.callCount, 2);
    AWS.SNS.restore();
    assert.end();
  });
});

test('[sns-subscription] update still works when old subscription is not found', assert => {
  const subscribe = AWS.stub('SNS', 'subscribe', (opts, cb) => {
    assert.deepEquals(opts, {
      Protocol: 'email',
      TopicArn: 'arn:aws:sns:us-east-1:special-topic',
      Endpoint: 'someone-new@mapbox.com'
    });
    return cb();
  }); 

  const unsubscribe = AWS.stub('SNS', 'unsubscribe', (opts, cb) => {
    assert.deepEquals(opts, {
      SubscriptionArn: 'arn:aws:sns:us-east-1:special-subscription'
    });
    return cb();
  }); 

  const listSubscriptionsByTopic = AWS.stub('SNS', 'listSubscriptionsByTopic', (opts, callback) => {
    assert.deepEquals(opts, { TopicArn: 'arn:aws:sns:us-east-1:special-topic' });

    return callback(null, {
      Subscriptions: [{
        Endpoint: 'the.wrong.email@mapbox.com',
        SubscriptionArn: 'arn:aws:sns:us-east-1:special-subscription'
      }]
    });
  });

  const subscription = new SnsSubscription('arn:aws:sns:us-east-1:special-topic', 'email', 'someone-new@mapbox.com', 'someone@mapbox.com');

  subscription.update((err) => {
    assert.ifError(err);
    assert.equals(subscribe.callCount, 1);
    assert.equals(unsubscribe.callCount, 0);
    assert.equals(listSubscriptionsByTopic.callCount, 1);
    AWS.SNS.restore();
    assert.end();
  });
});

test('[sns-subscription] delete does same thing as update', assert => {
  const unsubscribe = AWS.stub('SNS', 'unsubscribe', (opts, cb) => {
    assert.deepEquals(opts, {
      TopicArn: 'arn:special',
      Subject: 'Thing to say',
      Message: 'Specifics'
    });
    return cb();
  });

  const listSubscriptionsByTopic = AWS.stub('SNS', 'listSubscriptionsByTopic', (opts, callback) => {
    assert.deepEquals(opts, { TopicArn: 'arn:aws:sns:us-east-1:special-topic' }); 
    return callback(null, {
      Subscriptions: [{
        Endpoint: 'the.wrong.email@mapbox.com',
        SubscriptionArn: 'arn:aws:sns:us-east-1:special-subscription'
      }]
    });
  });

  const subscription = new SnsSubscription('arn:aws:sns:us-east-1:special-topic', 'email', 'someone-new@mapbox.com', 'someone@mapbox.com');

  subscription.delete((err) => {
    assert.ifError(err);
    assert.equals(unsubscribe.callCount, 0);
    assert.ok(listSubscriptionsByTopic.callCount > 0)
    AWS.SNS.restore();
    assert.end();
  });
});

test('[sns-subscription] manage parses events and relays LatestStreamLabel through Response', assert => {
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
  const subscribe = AWS.stub('SNS', 'subscribe', (opts, cb) => {
    assert.deepEquals(opts, {
      Protocol: 'sqs',
      TopicArn: 'arn:special',
      Endpoint: 'endpoint'
    });
    return cb();
  }); 

  SnsSubscription.manage({
    ResponseURL: 'http://aws.response.com/hello',
    PhysicalResourceId: 'abc',
    StackId: 'abc',
    LogicalResourceId: 'abc',
    ResourceProperties: {
      SnsTopicArn: 'arn:special',
      Endpoint: 'endpoint',
      Protocol: 'sqs'
    },
    RequestId: 'abc',
    RequestType: 'CREATE'
  }, {
    done: (err, body) => {
      assert.ifError(err);
      assert.equals(JSON.parse(body).Status, 'SUCCESS');
      subscribe.restore();
      assert.end();
    }
  });
});