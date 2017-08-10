module.exports.SnsSubscription = require('./functions/sns-subscription').manage;
module.exports.DynamoDbStreamLabel = require('./functions/dynamodb-stream-label').manage;
module.exports.LogGroup = require('./functions/log-group').manage;
module.exports.SnsMessage = require('./functions/sns-message').manage;
module.exports.StackOutputs = require('./functions/stack-outputs').manage;
module.exports.SpotFleet = require('./functions/spot-fleet').manage;

module.exports.build = require('./lib/build').build;
