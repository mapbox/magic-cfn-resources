var AWS = require('aws-sdk');
var utils = require('../lib/utils');
var Response = require('../lib/response');

module.exports = DynamoDBStreamLabel;

/**
 * Looks up the label for a stream associated with a DynamoDB table.
 *
 * @param {string} tableName - the name of the table
 * @param {string} tableRegion - the region in which the table resides
 */
function DynamoDBStreamLabel(tableName, tableRegion) {
  if (!tableName)
    throw new Error('Missing Parameter TableName');
  if (!tableRegion)
    throw new Error('Missing Parameter TableRegion');

  this.dynamodb = new AWS.DynamoDB({ region: tableRegion });
  this.tableName = tableName;
}

/**
 * A Lambda function to look up a stream label in response to a CloudFormation event.
 * If the table does not have an associated stream, Create or Update events will fail.
 *
 * @static
 * @param {object} event - a Lambda invocation event sent from a custom CloudFormation resource
 * @param {object} context - the Lambda invocation context
 * @example
 * // a custom CloudFormation resource that is backed by this Lambda function must
 * // provide the ARN for this Lambda function, the table's name and region.
 * {
 *   "Type": "Custom::DynamoDBStreamLabel",
 *   "Properties": {
 *     "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function/dynamodb-stream-label",
 *     "TableName": "my-table-with-a-stream",
 *     "TableRegion": "us-east-1"
 *   }
 * }
 */
DynamoDBStreamLabel.manage = function(event, context) {
  if (!utils.validCloudFormationEvent(event))
    return context.done(null, 'ERROR: Invalid CloudFormation event');

  var response = new Response(event, context);

  var requestType = event.RequestType.toLowerCase();
  var stream;
  try {
    stream = new DynamoDBStreamLabel(
      event.ResourceProperties.TableName,
      event.ResourceProperties.TableRegion
    );
  } catch(err) {
    return response.send(err);
  }

  stream[requestType](function(err, label) {
    if (label) response.setId(label);
    response.send(err);
  });
};

/**
 * Lookup the stream label
 *
 * @param {function} callback - a function to handle the response
 */
DynamoDBStreamLabel.prototype.create = function(callback) {
  this.dynamodb.describeTable({ TableName: this.tableName }, function(err, data) {
    if (err) return callback(err);

    var label = data.Table.LatestStreamLabel;
    if (!label) return callback(new Error('Table is not stream enabled'));

    callback(null, label);
  });
};

/**
 * Lookup the stream label
 *
 * @param {function} callback - a function to handle the response
 */
DynamoDBStreamLabel.prototype.update = function(callback) {
  this.create(callback);
};

/**
 * Handle the Delete event via no-op
 *
 * @param {function} callback - a function to handle the response
 */
DynamoDBStreamLabel.prototype.delete = function(callback) {
  callback();
};
