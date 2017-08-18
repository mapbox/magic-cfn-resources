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
function S3BucketNotificationConfig(snsTopicArn, bucket, bucketRegion, filters){
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