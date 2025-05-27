const test = require('tape');
const sinon = require('sinon');
const https = require('https');
const Response = require('../lib/response');

test('Response constructor initializes correctly', t => {
  const fakeEvent = {
    ResponseURL: 'https://cloudformation.mock/response',
    StackId: 'stack-123',
    LogicalResourceId: 'logic-456',
    RequestId: 'req-789'
  };

  const context = { done: sinon.spy() };
  const res = new Response(fakeEvent, context);

  t.ok(res.responseData.PhysicalResourceId, 'PhysicalResourceId is generated');
  t.equal(res.responseData.StackId, 'stack-123');
  t.equal(res.responseData.LogicalResourceId, 'logic-456');
  t.equal(res.responseData.RequestId, 'req-789');
  t.equal(typeof res.done, 'function', 'context.done is bound correctly');

  t.equal(res.options.hostname, 'cloudformation.mock', 'hostname parsed correctly');
  t.equal(res.options.method, 'PUT');
  t.end();
});

test('Response#setId sets PhysicalResourceId', t => {
  const fakeEvent = {
    ResponseURL: 'https://cloudformation.mock/response',
    StackId: '',
    LogicalResourceId: '',
    RequestId: ''
  };
  const context = { done: () => {} };
  const res = new Response(fakeEvent, context);

  res.setId('my-id');
  t.equal(res.responseData.PhysicalResourceId, 'my-id', 'PhysicalResourceId set correctly');
  t.end();
});

test('Response#send handles success', t => {
  const fakeEvent = {
    ResponseURL: 'https://mockhost/mockpath',
    StackId: 'stack',
    LogicalResourceId: 'logic',
    RequestId: 'req'
  };

  const context = { done: sinon.spy() };
  const res = new Response(fakeEvent, context);

  const req = {
    write: sinon.spy(),
    end: sinon.spy()
  };

  const requestStub = sinon.stub(https, 'request').returns({
    write: sinon.spy(),
    end: sinon.spy(),
    on: function (event, handler) {
      if (event === 'error') {
        process.nextTick(() => handler(new Error('Mock HTTPS error')));
      }
      return this; // important for chaining
    }
  });

  sinon.stub(console, 'log');

  res.send(null, { Foo: 'Bar' });

  setTimeout(() => {
    t.equal(res.responseData.Status, 'SUCCESS', 'Status should be SUCCESS');
    t.equal(res.responseData.Reason, '', 'Reason should be empty');
    t.deepEqual(res.responseData.Data, { Foo: 'Bar' }, 'Data is set');
    t.ok(req.write.calledOnce, 'request.write was called');
    t.ok(req.end.calledOnce, 'request.end was called');
    t.ok(context.done.calledOnce, 'context.done was called');

    requestStub.restore();
    console.log.restore();
    t.end();
  }, 10);
});

test('Response#send handles failure and retries', t => {
  const fakeEvent = {
    ResponseURL: 'https://mockhost/mockpath',
    StackId: 'stack',
    LogicalResourceId: 'logic',
    RequestId: 'req'
  };

  const context = { done: sinon.spy() };
  const res = new Response(fakeEvent, context);

  let attempt = 0;

  const req = {
    write: sinon.spy(),
    end: sinon.spy(),
    on: function (event, handler) {
      if (event === 'error') {
        process.nextTick(() => handler(new Error('Mock HTTPS error')));
      }
      return this;
    }
  };

  sinon.stub(console, 'log');
  sinon.stub(https, 'request').callsFake(() => {
    attempt++;
    return req;
  });

  res.send(new Error('Something went wrong'));

  setTimeout(() => {
    t.ok(context.done.calledOnce, 'context.done should be called after retries');
    t.equal(res.responseData.Status, 'FAILED', 'Status should be FAILED');
    t.ok(req.write.called, 'request.write called');
    t.ok(req.end.called, 'request.end called');
    t.ok(attempt >= 5, 'Retries occurred');

    https.request.restore();
    console.log.restore();
    t.end();
  }, 50);
});
