module.exports.validCloudFormationEvent = validCloudFormationEvent;

/**
 * Determines if an invocation event originated from CloudFormation
 * @param {object} event - a Lambda invocation event
 * @returns {boolean} indication of whether the event originated from CloudFormation
 * @private
 */
function validCloudFormationEvent(event) {
  var required = [
    'RequestType',
    'ResourceProperties',
    'StackId',
    'LogicalResourceId',
    'RequestId',
    'ResponseURL'
  ];

  return required.reduce(function(valid, key) {
    if (!(key in event)) return false;
    return key;
  }, true);
}
