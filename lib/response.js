var url = require('url');
var https = require('https');
var crypto = require('crypto');

module.exports = Response;

/**
 * Represents a response to CloudFormation indicating whether or not the custom
 * resource was created successfully.
 * @param {object} event - the Lambda invocation event
 * @param {object} context - the Lambda invocation context
 * @example
 * function MyCustomLambdaFunction(event, context) {
 *   var response = new Response(event, context);
 *
 *   manageCustomResource(event.RequestType, event.RequestProperties, function(err, id) {
 *     if (err) return response.send(err);
 *     response.setId(id);
 *     response.send(null, { additional: 'properties' });
 *   });
 * }
 */
function Response(event, context) {
  var parsedUrl = url.parse(event.ResponseURL);

  /**
   * Data to be sent in the response body
   * @memberof Response
   * @instance
   * @property {string} Status - either `FAILED` or `SUCCESS`
   * @property {string} Reason - a description is required if status is set to `FAILED`
   * @property {string} PhysicalResourceId - the physical id of the managed backend
   * resource. This will be provided in an `Update` or `Delete` event, and must be
   * generated during a `Create` event.
   * @property {string} StackId - set by the invocation event and should not be adjusted
   * @property {string} LogicalResourceId - set by the invocation event and should not be adjusted
   * @property {string} RequestId - set by the invocation event and should not be adjusted
   * @private
   */
  this.responseData = {
    PhysicalResourceId: event.PhysicalResourceId || crypto.randomBytes(16).toString('hex'),
    StackId: event.StackId,
    LogicalResourceId: event.LogicalResourceId,
    RequestId: event.RequestId
  };

  /**
   * Request options used to send the response
   * @memberof Response
   * @instance
   * @private
   */
  this.options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: 'PUT',
    headers: {
      'content-type': '',
      'content-length': 0
    }
  };

  /**
   * Function to finish the Lambda invocation
   * @memberof Response
   * @instance
   * @private
   */
  this.done = context.done.bind(context);
}

/**
 * Set the PhysicalResourceId to be used in the response to CloudFormation. You
 * **must** provide this id when responding to a `Create` event.
 * @param {string} id - the id to be provided
 */
Response.prototype.setId = function(id) {
  this.responseData.PhysicalResourceId = id;
};

/**
 * Send the response and finish the Lambda invocation
 * @param {object} [err] - set to null if no error occurred, or provide an Error object
 * @param {object} [data] - A hash of key-value pairs accessible via `Fn::GetAtt` calls on this custom resource
 */
Response.prototype.send = function(err, data) {
  if (err) console.log(err);

  this.responseData.Status = err ? 'FAILED' : 'SUCCESS';
  this.responseData.Reason = err ? err.message || 'Unspecified failure' : '';
  this.responseData.Data = data;

  var body = JSON.stringify(this.responseData);
  var options = this.options;
  options.headers['content-length'] = body.length;
  var done = this.done;

  console.log('Response body: %j', this.responseData);
  console.log('Response options: %j', this.options);

  (function sendResponse(attempts) {
    if (attempts > 5) return done(new Error('Failed to respond to CloudFormation'));

    var req = https.request(options, function() {
      done(null, err || body);
    }).on('error', function(requestError) {
      console.log(requestError);
      attempts++;
      sendResponse(attempts);
    });

    req.write(body);
    req.end();
  })(0);
};
