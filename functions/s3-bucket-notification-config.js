var AWS = require('aws-sdk');
var utils = require('../lib/utils');
var Response = require('../lib/response');

module.exports = S3BucketNotificationConfig;

/**
 * Represents an S3 Bucket Notification Configuration 
 * @param {string} snsTopicArn - the ARN for the SNS topic to get bucket notifications
 * @param {string} bucket - the S3 bucket to set notification configurations on
 * @param {string} bucketRegion - the region of the S3 bucket
 * @param {array} filters - an array of filtering rules https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html#notification-how-to-filtering
 */
function S3BucketNotificationConfig(configType, endpoint, bucket, bucketRegion, filterRules, eventType){
  if(!configType || !configType in new Set('TopicConfig', 'LambdaConfig', 'QueueConfig'))
      throw new Error('Missing or invalid ConfigType')
  if(!snsTopicArn)
    throw new Error('Missing Parameter SnsTopicArn');
  if(!bucket)
    throw new Error('Missing Parameter Bucket');
  if(!bucketRegion)
    throw new Error('Missing Parameter BucketRegion');
  if(!filters)
    throw new Error('Missing Parameter Filters');
  if(!Array.isArray(filters))
    throw new Error('Filters must be an Array');
  this.snsTopicArn = snsTopicArn;
  this.bucket = bucket;
  this.bucketRegion = bucketRegion;
  this.filters = filters;
  this.s3 = new AWS.S3({
    params: { Bucket: bucket },
    region: region
  });
}

/**
 * A Lambda function to manage an S3 Bucket Notification Configuration in response to a CloudFormation event.
 * @static
 * @param {object} event - a Lambda invocation event sent from a custom CloudFormation resource
 * @param {object} context - the Lambda invocation context
 * @example
 * // a custom CloudFormation resource that is backed by this Lambda function must
 * // provide the ARN for this Lambda function, the ARN for an SNS topic, an
 * // S3 bucket name, the S3 bucket's region and an array of filters to filter which notifications the SNS topic will receive.
 * {
 *   "Type": "Custom::S3BucketNotificationConfig",
 *   "Properties": {
 *     "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function/s3-bucket-notification-config",
 *     "SnsTopicArn": "arn:aws:sns:us-east-1:123456789012:my-s3-bucket-notification-config",
 *     "S3BucketName": "bucket",
 *     "S3BucketRegion": "us-east-1",
 *     "Filters": [ {"Name": "Prefix", "Value: "prefix" }, {"Name": "Suffix", "Value": "jpg"}]
 *   }
 * }
 */

 S3BucketNotificationConfig.manage = function(event, context) {
  if (!utils.validCloudFormationEvent(event))
    return context.done(null, 'ERROR: Invalid CloudFormation event');
  var response = new Response(event, context);
  var requestType = event.RequestType.toLowerCase();
  var notificationConfig;

  try {
    notificationConfig = new S3BucketNotificationConfig(
      event.ResourceProperties.SnsTopicArn,
      event.ResourceProperties.Bucket,
      event.ResourceProperties.BucketRegion,
      event.ResourceProperties.Filters
    );
  } catch (err) {
    return response.send(err);
  }

  notificationConfig[requestType](function(err) {
    response.send(err);
  });
 }

 /**
 * Create  the notification configuration
 * @param {function} callback - a function to handle the response
 */
S3BucketNotificationConfig.prototype.create = function(callback) {
  this.s3.getBucketNotificationConfiguration(function(err, data) {
    if (err) return callback(err);

    var config = {
      TopicArn: this.snsTopicArn,
      Events: ['s3:ObjectCreated:*'],
      Filter: {
        Key: {
          FilterRules: this.filters
        }
      }
    };

    var index = (data.TopicConfigurations || []).reduce(function(index, config, i) {
      if(!config.Filter || !config.Filter.Key || !config.Filter.Key.FilterRules)
        return index;
      var prefix = config.Filter.Key.FilterRules.find(function(key) {
        return key.Name === 'Prefix';
      });
      index[prefix.Value] = i.toString();

      return index;
    }, {});

    if (index[process.env.StackName]) {
      data.TopicConfigurations.splice(Number(index[process.env.StackName]), 1, config);
    } else {
      data.TopicConfigurations = data.TopicConfigurations || [];
      data.TopicConfigurations.push(config);
    }

    s3.putBucketNotificationConfiguration({ NotificationConfiguration: data }, callback);
  });
}

/**
 * Update the notification configuration by removing it from the configuration and then creating it again
 * @param {function} callback - a function to handle the response
 */
S3BucketNotificationConfig.prototype.update = function(callback) {
  var remove = this.delete.bind(this);
  var create = this.create.bind(this);

  remove(function(err) {
    if (err) return callback(err);
    create(callback);
  });
}

/**
 * Delete the notification configuration
 * @param {function} callback - a function to handle the response
 */
S3BucketNotificationConfig.prototype.delete = function(callback) {

}