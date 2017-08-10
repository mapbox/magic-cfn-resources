var AWS = require('aws-sdk');
var utils = require('../lib/utils');
var Response = require('../lib/response');

module.exports = SnsMessage;

/**
 * Represents an SNS message
 * @param {string} snsTopicArn - the ARN for the SNS topic to send the message to
 * @param {string} subject - the subject of the message
 * @param {string} message - the content of the message
 * @param {boolean} sendOnUpdate - if set to `true`, send another SNS message
 * on UPDATE events
 */
function SnsMessage(snsTopicArn, subject, message, sendOnUpdate) {
  if (!snsTopicArn)
    throw new Error('Missing Parameter SnsTopicArn');
  if (!subject)
    throw new Error('Missing Parameter Subject');
  if (!message)
    throw new Error('Missing Parameter Message');

  this.snsTopicArn = snsTopicArn;
  this.subject = subject;
  this.message = message;
  this.sendOnUpdate = sendOnUpdate;
  this.sns = new AWS.SNS({ region: snsTopicArn.split(':')[3] });
}

/**
 * A Lambda function to send an SNS message in response to a CloudFormation event.
 * @static
 * @param {object} event - a Lambda invocation event sent from a custom CloudFormation resource
 * @param {object} context - the Lambda invocation context
 * @example
 * // a custom CloudFormation resource that is backed by this Lambda function must
 * // provide the ARN for this Lambda function, the ARN for an SNS topic, the
 * // subject and message to be sent. Optionally, specify SendOnUpdate: "true"
 * // to send messages again when the resource is updated.
 * {
 *   "Type": "Custom::SnsMessage",
 *   "Properties": {
 *     "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function/sns-message",
 *     "SnsTopicArn": "arn:aws:sns:us-east-1:123456789012:my-sns-topic",
 *     "Subject": "subject",
 *     "Message": "message"
 *   }
 * }
 */
SnsMessage.manage = function(event, context) {
  if (!utils.validCloudFormationEvent(event))
    return context.done(null, 'ERROR: Invalid CloudFormation event');

  var response = new Response(event, context);

  var requestType = event.RequestType.toLowerCase();
  var message;
  try {
    message = new SnsMessage(
      event.ResourceProperties.SnsTopicArn,
      event.ResourceProperties.Subject,
      event.ResourceProperties.Message,
      event.ResourceProperties.SendOnUpdate === 'true' ? true : false
    );
  } catch (err) {
    return response.send(err);
  }

  message[requestType](function(err) {
    response.send(err);
  });
};

/**
 * A create event triggers the SNS message to be sent
 * @param {function} callback - a function to handle the response
 */
SnsMessage.prototype.create = function(callback) {
  var params = {
    TopicArn: this.snsTopicArn,
    Subject: this.subject,
    Message: this.message
  };

  this.sns.publish(params, callback);
};

/**
 * An update event triggers the SNS message to be sent if specified via
 * SendOnUpdate parameter.
 * @param {function} callback - a function to handle the response
 */
SnsMessage.prototype.update = function(callback) {
  if (!this.sendOnUpdate) return callback();
  this.create(callback);
};

/**
 * Nothing to do when an SnsMessage resource is deleted
 * @param {function} callback - a function to handle the response
 */
SnsMessage.prototype.delete = function(callback) {
  callback();
};
