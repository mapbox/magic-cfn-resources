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
        { SubnetId: 'a', AvailabilityZone: '1a', MapPublicIpOnLaunch: true },
        { SubnetId: 'b', AvailabilityZone: '1b', MapPublicIpOnLaunch: true },
        { SubnetId: 'c', AvailabilityZone: '1c', AvailabilityZoneId: 'use1-az3', MapPublicIpOnLaunch: false },
        { SubnetId: 'd', AvailabilityZone: '1d', AvailabilityZoneId: 'use1-az6', MapPublicIpOnLaunch: false }
      ]
    }));
  });

  AWS.stub('EC2', 'describeRouteTables', function() {
    this.request.promise.returns(Promise.resolve({
      RouteTables: [
        { RouteTableId: 'x' },
        { RouteTableId: 'z' }
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
      PrivateSubnetAvailabilityZones: ['1c', '1d'],
      PrivateSubnetAvailabilityZoneCount: 2,
      AzIndexedPublicSubnets: ['a', 'b', { Ref: 'AWS::NoValue' }, { Ref: 'AWS::NoValue' }, { Ref: 'AWS::NoValue' }, { Ref: 'AWS::NoValue' }],
      AzIndexedPrivateSubnets: [{ Ref: 'AWS::NoValue' }, { Ref: 'AWS::NoValue' }, 'c', 'd', { Ref: 'AWS::NoValue' }, { Ref: 'AWS::NoValue' }],
      PublicSubnets: ['a', 'b'],
      PrivateSubnets: ['c', 'd'],
      FargateArm64PrivateSubnets: ['d'],
      RouteTable: 'x',
      RouteTables: ['x', 'z']
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
