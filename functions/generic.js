const utils = require('../lib/utils');
const Response = require('../lib/response');

const isFunc = (value) => typeof value === 'function';

class GenericMagicResource {
  constructor(handlers, newProps, oldProps) {
    this._handlers = {
      create: handlers.create.bind(this),
      modify: handlers.modify.bind(this),
      remove: handlers.remove.bind(this),
      validate: handlers.validate.bind(this)
    };

    this._handlers.validate(newProps);

    Object.assign(this, newProps);
    this.oldProps = oldProps;
  }

  create(callback) {
    this._handlers.create(callback);
  }

  update(callback) {
    this._handlers.modify(callback);
  }

  delete(callback) {
    this._handlers.remove(callback);
  }
}

module.exports = (create, modify, remove, validate = () => {}) => {
  if (!isFunc(create) || !isFunc(modify) || !isFunc(remove))
    throw new Error('Must provide create, modify, and remove functions');

  if (validate && !isFunc(validate))
    throw new Error('Optional validate argument must be a function');

  const manage = (event, context, callback) => {
    if (!utils.validCloudFormationEvent(event))
      return callback(null, 'ERROR: Invalid CloudFormation event');
    const response = new Response(event, context);

    const requestType = event.RequestType.toLowerCase();
    let magicResource;

    try {
      magicResource = new GenericMagicResource(
        { create, modify, remove, validate },
        event.ResourceProperties,
        event.OldResourceProperties
      );
    } catch (err) {
      return response.send(err);
    }

    magicResource[requestType]((err) => {
      response.send(err);
    });
  };

  return manage;
}
