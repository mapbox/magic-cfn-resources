module.exports.SnsSubscription = require('./functions/sns-subscription').manage;
module.exports.DynamoDbStreamLabel = require('./functions/dynamodb-stream-label').manage;
module.exports.StackOutputs = require('./functions/stack-outputs').manage;
module.exports.SpotFleet = require('./functions/spot-fleet').manage;

module.exports.GenericMagicResource = require('./functions/generic');

module.exports.build = require('./lib/build').build;
