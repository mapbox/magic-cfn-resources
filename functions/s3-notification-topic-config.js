var AWS = require('aws-sdk');
var utils = require('../lib/utils');
var Response = require('../lib/response');

module.exports = S3NotificationTopicConfig;

/**
* Represents an S3 Bucket Notification Configuration 
* @param {string} Id - an Id to identify the notification config
* @param {string} snsTopicArn - the ARN for the SNS topic to get bucket notifications
* @param {string} bucket - the S3 bucket to set notification configurations on
* @param {string} bucketRegion - the region of the S3 bucket
* @param {array} events - an array of events the topic will be notified on 
* @param {string} prefixFilter - string to filter prefixes on (optional) https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html#notification-how-to-filtering
* @param {string} suffixFilter - string to filter suffixes on (optional) https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html#notification-how-to-filtering
*/
function S3NotificationTopicConfig(Id, snsTopicArn, bucket, bucketRegion, eventTypes, prefixFilter, suffixFilter, oldResources){
  if(!Id)
    throw new Error('Missing Parameter Id');
  if(!snsTopicArn)
    throw new Error('Missing Parameter SnsTopicArn');
  if(!bucket)
    throw new Error('Missing Parameter Bucket');
  if(!bucketRegion)
    throw new Error('Missing Parameter BucketRegion');
  if(!eventTypes)
    throw new Error('Missing Parameter Events');
  if(!Array.isArray(eventTypes))
    throw new Error('Events must be an Array');

  this.id = Id;
  this.snsTopicArn = snsTopicArn;
  this.bucket = bucket;
  this.bucketRegion = bucketRegion;
  this.prefixFilter = (prefixFilter) ? prefixFilter : undefined;
  this.suffixFilter = (suffixFilter) ? suffixFilter: undefined;
  this.events = eventTypes;
  if (oldResources) this.oldId = oldResources.Id;
  if (oldResources) this.oldBucket = oldResources.Bucket;
  if (oldResources) this.oldBucketRegion = oldResources.BucketRegion;

  this.s3 = new AWS.S3({
    params: { Bucket: bucket },
    region: bucketRegion
  });

  this.olds3 = (oldResources) ? new AWS.S3({
    params: { Bucket: oldResources.Bucket },
    region: oldResources.BucketRegion
  }) : undefined;
}

/**
 * A Lambda function to manage an S3 Bucket Notification Topic Configuration in response to a CloudFormation event.
 * @static
 * @param {object} event - a Lambda invocation event sent from a custom CloudFormation resource
 * @param {object} context - the Lambda invocation context
 * @example
 * // a custom CloudFormation resource that is backed by this Lambda function must
 * // provide the ARN for this Lambda function, the ARN for an SNS topic, an
 * // S3 bucket name, the S3 bucket's region, an array of filters to filter which notifications
 * // the SNS topic will receive, and an array of events that the topic will be notified on.
 * {
 *   "Type": "Custom::S3NotificationTopicConfig",
 *   "Properties": {
 *     "Id": "name of subscription"
 *     "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function/s3-bucket-notification-config",
 *     "SnsTopicArn": "arn:aws:sns:us-east-1:123456789012:my-s3-bucket-notification-config",
 *     "S3BucketName": "bucket",
 *     "S3BucketRegion": "us-east-1",
 *     "PrefixFilter": "prefix",
 *     "SuffixFilter": "jpg",
 *     "Events": [ 's3:ObjectCreated:*']
 *   }
 * }
 */

 S3NotificationTopicConfig.manage = function(event, context) {
  if (!utils.validCloudFormationEvent(event))
    return context.done(null, 'ERROR: Invalid CloudFormation event');
  var response = new Response(event, context);

  var requestType = event.RequestType.toLowerCase();
  var topicConfig;

  try {
    topicConfig = new S3NotificationTopicConfig(
      event.ResourceProperties.Id,
      event.ResourceProperties.SnsTopicArn,
      event.ResourceProperties.Bucket,
      event.ResourceProperties.BucketRegion,
      event.ResourceProperties.EventTypes,
      event.ResourceProperties.PrefixFilter,
      event.ResourceProperties.SuffixFilter,
      event.OldResourceProperties ? event.OldResourceProperties : undefined
    );
  } catch (err) {
    return response.send(err);
  }

  topicConfig[requestType](function(err) {
    response.send(err);
  });
 }

 /**
 * Create  the notification configuration
 * @param {function} callback - a function to handle the response
 */
S3NotificationTopicConfig.prototype.create = function(callback) {
  var s3 = this.s3;
  var topicArn = this.snsTopicArn;
  var events = this.events;
  var prefixFilter = this.prefixFilter;
  var suffixFilter = this.suffixFilter;
  var id = this.id;


  s3.getBucketNotificationConfiguration(function(err, data) {
    if (err) return callback(err);
    var config = {
      TopicArn: topicArn,
      Events: events,
      Id: id
    };

    if(prefixFilter || suffixFilter) {
      config.Filter= { Key: { FilterRules: [] } };
      if(prefixFilter) config.Filter.Key.FilterRules.push({ Name: 'Prefix', Value: prefixFilter });
      if(suffixFilter) config.Filter.Key.FilterRules.push({ Name: 'Suffix', Value: suffixFilter });
    }

    var existingConfig;
    if (data && data.TopicConfigurations) {
      for(var idx = 0; idx < data.TopicConfigurations.length; idx++) {
        if(id === data.TopicConfigurations[idx].Id) {
          existingConfig = idx;
          break;
        }
      }
    }
    else {
      if(!data) data = {};
      data.TopicConfigurations = [];
    }

    if(existingConfig > -1) {
      data.TopicConfigurations.splice(existingConfig, 1, config);
    }
    else {
      data.TopicConfigurations.push(config);
    }
    s3.putBucketNotificationConfiguration({ NotificationConfiguration: data }, (err) => {
      if (err) return callback(err);
      callback();
    });
  });
}

/**
 * Update the notification configuration by removing it from the configuration and then creating it again
 * @param {function} callback - a function to handle the response
 */
S3NotificationTopicConfig.prototype.update = function(callback) {
  var remove = this.delete.bind(this);
  var create = this.create.bind(this);

  remove(function(err) {
    if (err) return callback(err);
    create(callback);
  });
}

/**
 * Delete the topic notification configuration
 * @param {function} callback - a function to handle the response
 */
S3NotificationTopicConfig.prototype.delete = function(callback) {
  var s3 = this.olds3 || this.s3;
  var toDeleteId = this.oldId || this.id;

  s3.getBucketNotificationConfiguration(function(err, data) {
    if(err) return callback(err);
    if(!data.TopicConfigurations) return callback();

    var existingConfigIdx;
    for(var idx = 0; idx < data.TopicConfigurations.length; idx++) {
      if(this.id === data.TopicConfigurations[idx].Id) {
        existingConfigIdx = idx;
        break;
      }
    }

    if(existingConfigIdx <= 0) return callback();
    data.TopicConfigurations.splice(existingConfigIdx, 1);

    s3.putBucketNotificationConfiguration( { NotificationConfiguration: data}, (err) => {
      if (err) return callback(err);
      callback();
    });
  });
}