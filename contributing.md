## Adding functions

Create a new module in `/functions/`. It is suggested that you structure your code using classical JavaScript inheritance patterns, although the only hard requirement is that you expose a function that implements the same interface as a Lambda function and sends the required response to CloudFormation.

The suggested interface would be similar to this example:

```js
// Helper modules provided by this library
var utils = require('./utils');
var Response = require('./response');

module.exports = MyCustomResource;

function MyCustomResource(args) {
  this.args = args;
}

MyCustomResource.manage = function(event, context) {
  // Use a utility function to make sure the event is from CloudFormation
  if (!utils.validCloudFormationEvent(event))
    return context.done(null, 'ERROR: Invalid CloudFormation event');

  // Construct the response to send to CloudFormation
  var response = new Response(event, context);

  // Construct an instance of the custom resource, passing any arguments required
  var myCustomResource = new MyCustomResource(event);

  // Call the create/update/delete method on the custom resource
  myCustomResource[event.RequestType.toLowerCase()](function(err) {
    // Sending an error object marks the CloudFormation event as a failure
    if (err) return response.send(err);

    // Otherwise, the data sent will be available in the CloudFormation template via `Fn::GetAtt`
    response.send(null, { extra: 'attributes' });
  });
};

MyCustomResource.prototype.create = function(callback) {
  createCustomResource(this.args, callback);
};

MyCustomResource.prototype.update = function(callback) {
  updateCustomResource(this.args, callback);
};

MyCustomResource.prototype.delete = function(callback) {
  deleteCustomResource(this.args, callback);
};
```

Then in `index.js`, add a reference to the static `manage` function to be used by Lambda:

```js
module.exports.myCustomResource = require('./functions/my-custom-resource').manage;
```

Finally, add the AWS:IAM:Role resource to `roles` in `build.js` in `/lib/`.


```js
const roles = {
  ...
  newResourceName: {
    Type: 'AWS::IAM::Role',
    ...
  },
};
```
## Documentation

Use [JSDoc style comments](http://usejsdoc.org/index.html) and build documentation via [documentation-js](https://github.com/documentationjs/documentation) by running `npm run-script docs`.

## Considerations

- Try to write functions to have no external dependencies aside from the [AWS SDK for JS](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/index.html).
- During the create event you must assign your backend resource a PhysicalResourceId. Make sure that this ID will be sufficient to identify the backend resource in a later update or delete event.
- The update and delete events are particularly challenging. They may or may not be triggered after a resource was actually created, so it is not safe to assume that the resource already exists. Be sure to handle both scenarios or you may end up with a stack that you're unable to delete.
