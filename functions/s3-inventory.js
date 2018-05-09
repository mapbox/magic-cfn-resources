var AWS = require('aws-sdk');
var utils = require('../lib/utils');
var Response = require('../lib/response');

module.exports = S3Inventory;

function S3Inventory(Bucket, BucketRegion, Id, InventoryConfiguration, OldId) {
  if (!Bucket)
    throw new Error('Missing Parameter Bucket');
  if (!BucketRegion)
    throw new Error('Missing Parameter BucketRegion');
  if (!Id)
    throw new Error('Missing Parameter Id');
  if (!InventoryConfiguration)
    throw new Error('Missing Parameter InventoryConfiguration');

  this.s3 = new AWS.S3({ region: BucketRegion });
  this.params = { Bucket, Id, InventoryConfiguration };

  if (OldId !== Id) this.oldId = OldId;
}

S3Inventory.manage = function(event, context, callback) {
  if (!utils.validCloudFormationEvent(event))
    return callback(null, 'ERROR: Invalid CloudFormation event');

  var response = new Response(event, context);
  var requestType = event.RequestType.toLowerCase();

  var s3Inventory;
  try {
    s3Inventory = new S3Inventory(
      event.ResourceProperties.Bucket,
      event.ResourceProperties.BucketRegion,
      event.ResourceProperties.Id,
      event.ResourceProperties.InventoryConfiguration,
      event.OldResourceProperties ? event.OldResourceProperties.Id : undefined
    );
  } catch (err) {
    return response.send(err);
  }

  s3Inventory[requestType](function(err, physicalId) {
    if (err) return response.send(err);
    if (physicalId) response.setId(physicalId);
    response.send();
  });
}

S3Inventory.prototype.create = function(callback) {
  const id = this.params.Id;
  this.s3.putBucketInventoryConfiguration(this.params, function(err) {
    if (err) return callback(err);
    callback(null, id);
  });
};

S3Inventory.prototype.update = function(callback) {
  var old = this.oldId;
  var s3 = this.s3;
  var bucket = this.params.Bucket;

  this.create(function(err, id) {
    if (err) return callback(err);
    if (!old) return callback(null, id);

    s3.deleteBucketInventoryConfiguration({
      Bucket: bucket,
      Id: old
    }, function (err) {
      if (err) return callback(err);
      callback(null, id);
    });

  })
};

S3Inventory.prototype.delete = function(callback) {
  this.s3.deleteBucketInventoryConfiguration({
    Bucket: this.params.Bucket,
    Id: this.params.Id
  }, function(err) {
    if (err) return callback(err);
    callback();
  });
};
