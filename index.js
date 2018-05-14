module.exports.SnsSubscription = require('./functions/sns-subscription').manage;
module.exports.DynamoDbStreamLabel = require('./functions/dynamodb-stream-label').manage;
module.exports.StackOutputs = require('./functions/stack-outputs').manage;
module.exports.SpotFleet = require('./functions/spot-fleet').manage;
module.exports.S3NotificationTopicConfig = require('./functions/s3-notification-topic-config').manage;
module.exports.DefaultVpc = require('./functions/default-vpc');
module.exports.S3Inventory = require('./functions/s3-inventory').manage;

module.exports.helpers = {
  Response: require('./lib/response'),
  validateEvent: require('./lib/utils').validCloudFormationEvent
};

module.exports.build = require('./lib/build').build;
