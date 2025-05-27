module.exports.validCloudFormationEvent = validCloudFormationEvent;

/**
 * Determines if an invocation event originated from CloudFormation
 * @param {object} event - a Lambda invocation event
 * @returns {boolean} indication of whether the event originated from CloudFormation
 * @private
 */
function validCloudFormationEvent(event) {
  if (!event || typeof event !== 'object') return false;

  const required = [
    'RequestType',
    'ResourceProperties',
    'StackId',
    'LogicalResourceId',
    'RequestId',
    'ResponseURL'
  ];

  return required.every(key => key in event);
}
