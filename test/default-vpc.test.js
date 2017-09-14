'use strict';

const test = require('tape');
const sinon = require('sinon');
const AWS = require('@mapbox/mock-aws-sdk-js');
const defaultVpc = require('../functions/default-vpc');
const utils = require('../lib/utils');
const Response = require('../lib/response');

test('[default VPC] success', (assert) => {
  const event = {
    RequestType: '',
    ResourceProperties: '',
    StackId: '',
    LogicalResourceId: '',
    RequestId: '',
    ResponseURL: ''
  };

  AWS.stub('EC2', 'describeVpcs', function() {
    this.request.promise.returns(Promise.resolve({
      Vpcs: [{ VpcId: 'vpcid' }]
    }));
  });

  AWS.stub('EC2', 'describeSubnets', function() {
    this.request.promise.returns(Promise.resolve({
      Subnets: [
        { SubnetId: 'a', AvailabilityZone: '1a' },
        { SubnetId: 'b', AvailabilityZone: '1b' }
      ]
    }));
  });

  AWS.stub('EC2', 'describeRouteTables', function() {
    this.request.promise.returns(Promise.resolve({
      RouteTables: [
        { RouteTableId: 'a' },
        { RouteTableId: 'b' }
      ]
    }));
  });

  sinon.spy(utils, 'validCloudFormationEvent');

  sinon.stub(Response.prototype, 'send').callsFake((err, info) => {
    assert.ifError(err, 'success');

    assert.deepEqual(info, {
      VpcId: 'vpcid',
      AvailabilityZones: ['1a','1b'],
      AvailabilityZoneCount: 2,
      PublicSubnets: ['a', 'b'],
      RouteTable: 'a'
    }, 'returns expected info');

    assert.equal(utils.validCloudFormationEvent.callCount, 1, 'checks event validity');

    AWS.EC2.restore();
    utils.validCloudFormationEvent.restore();
    Response.prototype.send.restore();
    assert.end();
  });

  const done = () => {
    assert.fail('failed');

    AWS.EC2.restore();
    utils.validCloudFormationEvent.restore();
    Response.prototype.send.restore();
    assert.end();
  }

  defaultVpc(event, { done });
});

test('[default VPC] failure', (assert) => {
  const event = {
    RequestType: '',
    ResourceProperties: '',
    StackId: '',
    LogicalResourceId: '',
    RequestId: '',
    ResponseURL: ''
  };

  AWS.stub('EC2', 'describeVpcs', function() {
    this.request.promise = () => Promise.reject(new Error('foo'));
  });

  sinon.stub(Response.prototype, 'send').callsFake((err) => {
    assert.equal(err.message, 'foo', 'provides error message to cloudformation');

    AWS.EC2.restore();
    Response.prototype.send.restore();
    assert.end();
  });

  const done = () => {
    assert.fail('failed');

    AWS.EC2.restore();
    Response.prototype.send.restore();
    assert.end();
  }

  defaultVpc(event, { done });
});
