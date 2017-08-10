var AWS = require('aws-sdk');
var utils = require('../lib/utils');
var Response = require('../lib/response');

module.exports = LogGroup;

/**
 * Represents Log Group
 * @param {string} logGroupName - the name of the Log Group
 * @param {boolean} ignoreConflicts - if `true`, an error due to overlapping
 * log group names will be ignored
 * @param {string} region - the region in which to launch the group
 */
function LogGroup(logGroupName, ignoreConflicts, region) {
  if (!logGroupName)
    throw new Error('Missing Parameter LogGroupName');

  this.logGroupName = logGroupName;
  this.ignoreConflicts = ignoreConflicts;
  this.logs = new AWS.CloudWatchLogs({ region: region });
}

/**
 * A Lambda function to manage a LogGroup in response to a CloudFormation event.
 * @static
 * @param {object} event - a Lambda invocation event sent from a custom CloudFormation resource
 * @param {object} context - the Lambda invocation context
 * @example
 * // a custom CloudFormation resource that is backed by this Lambda function must
 * // provide the ARN for this Lambda function and the desired name of the LogGroup.
 * {
 *   "Type": "Custom::LogGroup",
 *   "Properties": {
 *     "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function/manage-log-group",
 *     "LogGroupName": "my-log-group",
 *     "IgnoreConflicts": false
 *   }
 * }
 */
LogGroup.manage = function(event, context) {
  if (!utils.validCloudFormationEvent(event))
    return context.done(null, 'ERROR: Invalid CloudFormation event');

  var response = new Response(event, context);
  var requestType = event.RequestType.toLowerCase();

  var logGroup;
  try {
    logGroup = new LogGroup(
      event.ResourceProperties.LogGroupName,
      event.ResourceProperties.IgnoreConflicts,
      event.StackId.split(':')[3]
    );
  } catch (err) {
    return response.send(err);
  }

  logGroup[requestType](function(err) {
    if (err) response.send(err);
    else response.send(null, { LogGroupName: event.ResourceProperties.LogGroupName });
  });
};

/**
 * Create a the LogGroup
 * @param {function} callback - a function to handle the response
 */
LogGroup.prototype.create = function(callback) {
  var ignoreConflicts = this.ignoreConflicts;

  var params = {
    logGroupName: this.logGroupName
  };

  this.logs.createLogGroup(params, function(err) {
    if (err && err.code === 'ResourceAlreadyExistsException' && ignoreConflicts)
      return callback();
    callback(err);
  });
};

/**
 * Update simply creates a new Log Group with a new name
 * @param {function} callback - a function to handle the response
 */
LogGroup.prototype.update = function(callback) {
  this.create(callback);
};

/**
 * Delete is a no-op
 * @param {function} callback - a function to handle the response
 */
LogGroup.prototype.delete = function(callback) {
  callback();
};
