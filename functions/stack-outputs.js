var AWS = require('aws-sdk');
var utils = require('../lib/utils');
var Response = require('../lib/response');

module.exports = StackOutputs;

/**
 * Represents a CloudFormation stack's outputs
 * @param {string} name - the name of the CloudFormation stack
 * @param {string} region - the region the CloudFormation stack is in
 */
function StackOutputs(stackName, region) {
  if (!stackName)
    throw new Error('Missing Parameter StackName');
  if (!region)
    throw new Error('Missing Parameter Region');

  this.stackName = stackName;
  this.region = region;
  this.cfn = new AWS.CloudFormation({ region: region });
}

/**
 * A Lambda function to find a CloudFormation stack's outputs
 * @static
 * @param {object} event - a Lambda invocation event sent from a custom CloudFormation resource
 * @param {object} context - the Lambda invocation context
 * @example
 * // a custom CloudFormation resource that is backed by this Lambda function must
 * // provide the ARN for this Lambda function, the name and region of an existing
 * // CloudFormation stack
 * {
 *   "Type": "Custom::StackOutputs",
 *   "Properties": {
 *     "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function/stack-outputs",
 *     "Name": "my-stack",
 *     "Region": "us-east-1"
 *   }
 * }
 */
StackOutputs.manage = function(event, context) {
  if (!utils.validCloudFormationEvent(event))
    return context.done(null, 'ERROR: Invalid CloudFormation event');

  var response = new Response(event, context);

  var requestType = event.RequestType.toLowerCase();
  var message;
  try {
    message = new StackOutputs(
      event.ResourceProperties.StackName,
      event.ResourceProperties.Region
    );
  } catch (err) {
    return response.send(err);
  }

  message[requestType](function(err, data) {
    response.send(err, data);
  });
};

/**
 * A create event looks up the stack's outputs
 * @param {function} callback - a function to handle the response
 */
StackOutputs.prototype.create = function(callback) {
  var params = { StackName: this.stackName };
  var stackName = this.stackName;
  var region = this.region;

  this.cfn.describeStacks(params, function(err, data) {
    if (err) return callback(err);
    if (!data.Stacks[0]) return callback(new Error('No stack named %s was found in %s'), stackName, region);

    var outputs = data.Stacks[0].Outputs.reduce(function(outputs, o) {
      outputs[o.OutputKey] = o.OutputValue;
      return outputs;
    }, {});

    callback(null, outputs);
  });
};

/**
 * An update event looks up the stack's outputs
 * @param {function} callback - a function to handle the response
 */
StackOutputs.prototype.update = StackOutputs.prototype.create;

/**
 * Nothing to do when an StackOutputs resource is deleted
 * @param {function} callback - a function to handle the response
 */
StackOutputs.prototype.delete = function(callback) {
  callback();
};
