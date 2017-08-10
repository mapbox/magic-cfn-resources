var AWS = require('aws-sdk');
var utils = require('../lib/utils');
var Response = require('../lib/response');

module.exports = SpotFleet;

/**
 * Represents an Spot fleet
 * @param {object} spotFleetRequestConfigData - see [the CloudFormation documentation](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-spotfleet-spotfleetrequestconfigdata.html)
 * @param {string} region - the region to request a spot fleet in
 * @param {string} [requestId] - the ID of a preexisting spot fleet
 */
function SpotFleet(spotFleetRequestConfigData, region, overrideTargetCapacity, requestId) {
  if (!spotFleetRequestConfigData)
    throw new Error('Missing Parameter SpotFleetRequestConfigData');
  if (!region)
    throw new Error('Missing Parameter Region');

  if (requestId) this.requestId = requestId;

  // Need to number/booleanify the payload that CFN fucked with
  this.spotFleetRequestConfigData = JSON.parse(JSON.stringify(spotFleetRequestConfigData), function(key, val) {
    if (key === 'SpotPrice') return val;
    if (key === 'WeightedCapacity') return parseFloat(val);
    if (key === 'TargetCapacity') return Math.ceil(parseFloat(val));
    if (val === '') return val;
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (!isNaN(val)) return parseInt(val, 10);
    return val;
  });

  this.region = region;
  this.overrideTargetCapacity = overrideTargetCapacity;
  this.ec2 = new AWS.EC2({ region: region });
}

/**
 * A Lambda function to create a SpotFleet whose instances are not cleaned up when the request is canceled
 * @static
 * @param {object} event - a Lambda invocation event sent from a custom CloudFormation resource
 * @param {object} context - the Lambda invocation context
 * @example
 * // a custom CloudFormation resource that is backed by this Lambda function must
 * // provide [SpotFleetRequestConfigData](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-spotfleet-spotfleetrequestconfigdata.html),
 * // and the region to request the spot fleet in.
 * {
 *   "Type": "Custom::SpotFleet",
 *   "Properties": {
 *     "SpotFleetRequestConfigData": { ... }
 *     "Region": "us-east-1"
 *   }
 * }
 */
SpotFleet.manage = function(event, context) {
  if (!utils.validCloudFormationEvent(event))
    return context.done(null, 'ERROR: Invalid CloudFormation event');

  var response = new Response(event, context);

  var requestType = event.RequestType.toLowerCase();
  var spotFleet;
  try {
    spotFleet = new SpotFleet(
      event.ResourceProperties.SpotFleetRequestConfigData,
      event.ResourceProperties.Region,
      event.ResourceProperties.OverrideTargetCapacity === 'true' ? true : false,
      event.PhysicalResourceId
    );
  } catch (err) {
    return response.send(err);
  }

  console.log('%s %s in %s', event.RequestType, event.LogicalResourceId, event.StackId);
  console.log('%s override existing target capacity', event.ResourceProperties.OverrideTargetCapacity ? 'Will not' : 'Will');
  spotFleet[requestType](function(err, requestId) {
    if (requestId) response.setId(requestId);
    response.send(err);
  });
};

/**
 * A create event triggers the creation of a spot fleet
 * @param {function} callback - a function to handle the response
 */
SpotFleet.prototype.create = function(callback) {
  var params = {
    SpotFleetRequestConfig: this.spotFleetRequestConfigData,
    DryRun: false
  };

  this.ec2.requestSpotFleet(params, function(err, data) {
    if (err) return callback(err);
    console.log('Created request %s', data.SpotFleetRequestId);
    callback(null, data.SpotFleetRequestId);
  });
};

/**
 * An update event must create a new fleet and cancel the old one
 * @param {function} callback - a function to handle the response
 */
SpotFleet.prototype.update = function(callback) {
  var _this = this;

  this.ec2.describeSpotFleetRequests({
    SpotFleetRequestIds: [this.requestId]
  }, function(err, data) {
    if (err && err.code !== 'InvalidSpotFleetRequestId.NotFound') return callback(err);

    if (!_this.overrideTargetCapacity && data && data.SpotFleetRequestConfigs.length) {
      _this.spotFleetRequestConfigData.TargetCapacity = Math.max(
        Number(_this.spotFleetRequestConfigData.TargetCapacity),
        Number(data.SpotFleetRequestConfigs[0].SpotFleetRequestConfig.TargetCapacity)
      );
    }

    _this.create(function(err, requestId) {
      if (err) return callback(err);

      _this.delete(function(err) {
        if (err) return callback(err); // ? with new fleet request id ?

        callback(null, requestId);
      });
    });
  });
};

/**
 * Cancel a SpotFleet without terminating its instances
 * @param {function} callback - a function to handle the response
 */
SpotFleet.prototype.delete = function(callback) {
  if (!this.requestId) return callback();
  if (!/^sfr-[a-z0-9-]{36}$/.test(this.requestId)) return callback();

  var requestId = this.requestId;
  var ec2 = this.ec2;

  ec2.describeSpotFleetRequests({
    SpotFleetRequestIds: [requestId]
  }, function(err) {
    if (err && err.code === 'InvalidSpotFleetRequestId.NotFound') return callback();
    if (err) return callback(err);

    console.log('Cancel fleet request %s', requestId);
    ec2.cancelSpotFleetRequests({
      SpotFleetRequestIds: [requestId],
      TerminateInstances: false,
      DryRun: false
    }, function(err) {
      if (err) return callback(err);
      callback();
    });
  });
};
