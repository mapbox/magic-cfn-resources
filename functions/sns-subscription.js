var AWS = require('aws-sdk');
var utils = require('../lib/utils');
var Response = require('../lib/response');

module.exports = SnsSubscription;

/**
 * Represents an SNS subscription
 * @param {string} snsTopicArn - the ARN for the SNS topic to subscribe to
 * @param {string} protocol - the subscription protocol
 * @param {string} endpoint - the endpoint to subscribe to the SNS topic
 * @param {string} [oldEndpoint] - the endpoint that was previously subscribed
 */
function SnsSubscription(snsTopicArn, protocol, endpoint, oldEndpoint) {
  if (!snsTopicArn)
    throw new Error('Missing Parameter SnsTopicArn');
  if (!protocol)
    throw new Error('Missing Parameter Protocol');
  if (!endpoint)
    throw new Error('Missing Parameter Endpoint');

  this.snsTopicArn = snsTopicArn;
  this.protocol = protocol;
  this.endpoint = endpoint;
  if (oldEndpoint) this.oldEndpoint = oldEndpoint;
  this.sns = new AWS.SNS({ region: snsTopicArn.split(':')[3] });
}

/**
 * A Lambda function to manage an SNS subscription in response to a CloudFormation event.
 * @static
 * @param {object} event - a Lambda invocation event sent from a custom CloudFormation resource
 * @param {object} context - the Lambda invocation context
 * @example
 * // a custom CloudFormation resource that is backed by this Lambda function must
 * // provide the ARN for this Lambda function, the ARN for an SNS topic, the
 * // protocol and endpoint for the subscription.
 * {
 *   "Type": "Custom::SnsSubscription",
 *   "Properties": {
 *     "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function/manage-sns-subscription",
 *     "SnsTopicArn": "arn:aws:sns:us-east-1:123456789012:my-sns-topic",
 *     "Protocol": "email",
 *     "Endpoint": "somebody@somewhere.com"
 *   }
 * }
 */
SnsSubscription.manage = function(event, context) {
  if (!utils.validCloudFormationEvent(event))
    return context.done(null, 'ERROR: Invalid CloudFormation event');
  var response = new Response(event, context);

  var requestType = event.RequestType.toLowerCase();
  var subscription;

  try {
    subscription = new SnsSubscription(
      event.ResourceProperties.SnsTopicArn,
      event.ResourceProperties.Protocol,
      event.ResourceProperties.Endpoint,
      event.OldResourceProperties ? event.OldResourceProperties.Endpoint : undefined
    );
  } catch (err) {
    return response.send(err);
  }
  console.log('past sns initialization');
  subscription[requestType](function(err) {
    response.send(err);
  });
};

/**
 * Create  the subscription
 * @param {function} callback - a function to handle the response
 */
SnsSubscription.prototype.create = function(callback) {
  var params = {
    Protocol: this.protocol,
    TopicArn: this.snsTopicArn,
    Endpoint: this.endpoint
  };
  console.log('in create');
  this.sns.subscribe(params, callback);
};

/**
 * Update the subscription by unsubscribing an old endpoint and subscribing a new one
 * @param {function} callback - a function to handle the response
 */
SnsSubscription.prototype.update = function(callback) {
  var remove = this.delete.bind(this);
  var create = this.create.bind(this);

  remove(function(err) {
    if (err) return callback(err);
    create(callback);
  });
};

/**
 * Delete the subscription
 * @param {function} callback - a function to handle the response
 */
SnsSubscription.prototype.delete = function(callback) {
  var endpoint = this.oldEndpoint || this.endpoint;
  var listParams = { TopicArn: this.snsTopicArn };
  var snsSubscription = this;

  console.log('Searching for subscription to delete: %s', endpoint);

  (function listSubscriptions(next) {
    if (next) listParams.NextToken = next;
    snsSubscription.sns.listSubscriptionsByTopic(listParams, function(err, data) {
      if (err && (err.code === 'NotFound' || err.code === 'InvalidParameter' || err.code === 'InvalidClientTokenId')) {
        console.log('No topic %s found', listParams.TopicArn);
        return callback();
      }

      if (err) return callback(err);

      var arn = data.Subscriptions.filter(function(subscription) {
        return subscription.Endpoint === endpoint;
      }).map(function(subscription) {
        return subscription.SubscriptionArn;
      })[0];

      var params = { SubscriptionArn: arn };

      if (arn === 'PendingConfirmation') {
        console.log('Found pending subscription');
        return callback();
      }

      if (arn) {
        console.log('Deleting subscription %s', arn);
        return snsSubscription.sns.unsubscribe(params, callback);
      }

      if (data.NextToken) return listSubscriptions(data.NextToken);

      console.log('No subscription found');
      callback();
    });
  })();
};
