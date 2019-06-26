const SpotFleet = require('../functions/spot-fleet');
const test = require('tape');
const AWS = require('@mapbox/mock-aws-sdk-js');
const http = require('http');

test('[spot-fleet] create handles errors', assert => {
  AWS.stub('EC2', 'requestSpotFleet', (opts, cb) => {
    assert.deepEquals(opts, {
      SpotFleetRequestConfig: {
        AllocationStrategy : 'diversified',
        ExcessCapacityTerminationPolicy : 'noTermination',
        IamFleetRole : 'IAM Fleet Role',
        LaunchSpecifications : [{
          InstanceType: 'r3.8xlarge',
          WeightedCapacity: 2.44
        }],
        SpotPrice : '20',
        TargetCapacity : 5,
        TerminateInstancesWithExpiration : false,
        ValidFrom : 'start date',
        ValidUntil : 'end date'
      },
      DryRun: false
    }, 'requestSpotFleet parameters');
    return cb(new Error('random error'));
  });

  const spotfleet = new SpotFleet({
    AllocationStrategy : 'diversified',
    ExcessCapacityTerminationPolicy : 'noTermination',
    IamFleetRole : 'IAM Fleet Role',
    LaunchSpecifications : [{
      InstanceType: 'r3.8xlarge',
      WeightedCapacity: 2.44
    }],
    SpotPrice : '20',
    TargetCapacity : 5,
    TerminateInstancesWithExpiration : 'false',
    ValidFrom : 'start date',
    ValidUntil : 'end date'
  }, 'us-east-1', false, 'requestId');

  spotfleet.create((err) => {
    assert.equals(err.message, 'random error', 'error occurs');
    AWS.EC2.restore();
    assert.end();
  });
});

test('[spot-fleet] create handles success', assert => {
  const requestSpotFleet = AWS.stub('EC2', 'requestSpotFleet', (opts, cb) => {
    assert.deepEquals(opts, {
      SpotFleetRequestConfig: {
        AllocationStrategy : 'diversified',
        ExcessCapacityTerminationPolicy : 'noTermination',
        IamFleetRole : 'IAM Fleet Role',
        LaunchSpecifications : [{
          InstanceType: 'r3.8xlarge',
          WeightedCapacity: 2.44
        }],
        SpotPrice : '20',
        TargetCapacity : 5,
        TerminateInstancesWithExpiration : false,
        ValidFrom : 'start date',
        ValidUntil : 'end date'
      },
      DryRun: false
    });
    return cb(null, { SpotFleetRequestId: 'sfr-firstrequestid1111111111111111111111'});
  });

  const spotfleet = new SpotFleet({
    AllocationStrategy : 'diversified',
    ExcessCapacityTerminationPolicy : 'noTermination',
    IamFleetRole : 'IAM Fleet Role',
    LaunchSpecifications : [{
      InstanceType: 'r3.8xlarge',
      WeightedCapacity: 2.44
    }],
    SpotPrice : '20',
    TargetCapacity : 5,
    TerminateInstancesWithExpiration : 'false',
    ValidFrom : 'start date',
    ValidUntil : 'end date'
  }, 'us-east-1', false, 'sfr-firstrequestid1111111111111111111111');

  spotfleet.create((err) => {
    assert.ifError(err, 'no error');
    assert.equals(requestSpotFleet.callCount, 1, 'requestSpotFleet called');
    requestSpotFleet.restore();
    assert.end();
  });
});

test('[spot-fleet] update updates the requestId, yields the requestId from _this, not this', (assert) => {
  const spotfleet = new SpotFleet({
    AllocationStrategy : 'diversified',
    ExcessCapacityTerminationPolicy : 'noTermination',
    IamFleetRole : 'IAM Fleet Role',
    LaunchSpecifications : [{
      InstanceType: 'r3.8xlarge',
      WeightedCapacity: 2.44
    }],
    SpotPrice : '20',
    TargetCapacity : 1,
    TerminateInstancesWithExpiration : 'false',
    ValidFrom : 'start date',
    ValidUntil : 'end date'
  }, 'us-east-1', false, 'sfr-firstrequestid1111111111111111111111');

  const describeSpotFleetRequests = AWS.stub('EC2', 'describeSpotFleetRequests').yields(null, {
    SpotFleetRequestConfigs: [
      {
        SpotFleetRequestConfig: {
          TargetCapacity: 1
        }
      }
    ]
  });
  AWS.stub('EC2', 'requestSpotFleet').yields(null, { SpotFleetRequestId: 'sfr-secondrequestid222222222222222222222' });
  AWS.stub('EC2', 'cancelSpotFleetRequests').yields(null, 'sfr-firstrequestid1111111111111111111111 canceled');

  spotfleet.update((err, res) => {
    assert.ifError(err, 'should not error');
    assert.equal(describeSpotFleetRequests.callCount, 2, 'describeSpotFleetRequests called twice');
    assert.equal(res, 'sfr-secondrequestid222222222222222222222', 'request id coming from _this' );
    AWS.EC2.restore();
    assert.end();
  });

});

test('[spot-fleet] delete cancels spot fleet request', (assert) => {
  const describeSpotFleetRequests = AWS.stub('EC2', 'describeSpotFleetRequests').yields(null);
  const cancelSpotFleetRequests = AWS.stub('EC2', 'cancelSpotFleetRequests').yields(null, 'sfr-firstrequestid1111111111111111111111 canceled');
  const spotfleet = new SpotFleet({
    AllocationStrategy : 'diversified',
    ExcessCapacityTerminationPolicy : 'noTermination',
    IamFleetRole : 'IAM Fleet Role',
    LaunchSpecifications : [{
      InstanceType: 'r3.8xlarge',
      WeightedCapacity: 2.44
    }],
    SpotPrice : '20',
    TargetCapacity : 1,
    TerminateInstancesWithExpiration : 'false',
    ValidFrom : 'start date',
    ValidUntil : 'end date'
  }, 'us-east-1', false, 'sfr-firstrequestid1111111111111111111111');

  spotfleet.delete((err) => {
    assert.ifError(err, 'should not error');
    assert.equal(describeSpotFleetRequests.callCount, 1, 'calls describeSpotFleetRequests once');
    assert.equal(cancelSpotFleetRequests.callCount, 1, 'calls cancelSpotFleetRequests once');
    AWS.EC2.restore();
    assert.end();
  });
});

test('[spot-fleet] delete does nothing if request id not found', (assert) => {
  const describeSpotFleetRequests = AWS.stub('EC2', 'describeSpotFleetRequests').yields({ code: 'InvalidSpotFleetRequestId.NotFound' });
  const cancelSpotFleetRequests = AWS.stub('EC2', 'cancelSpotFleetRequests').yields(null, 'sfr-firstrequestid1111111111111111111111 canceled');
  const spotfleet = new SpotFleet({
    AllocationStrategy : 'diversified',
    ExcessCapacityTerminationPolicy : 'noTermination',
    IamFleetRole : 'IAM Fleet Role',
    LaunchSpecifications : [{
      InstanceType: 'r3.8xlarge',
      WeightedCapacity: 2.44
    }],
    SpotPrice : '20',
    TargetCapacity : 1,
    TerminateInstancesWithExpiration : 'false',
    ValidFrom : 'start date',
    ValidUntil : 'end date'
  }, 'us-east-1', false, 'sfr-firstrequestid1111111111111111111111');

  spotfleet.delete((err) => {
    assert.ifError(err, 'should not error');
    assert.equal(describeSpotFleetRequests.callCount, 1, 'calls describeSpotFleetRequests once');
    assert.equal(cancelSpotFleetRequests.callCount, 0, 'does not call cancelSpotFleetRequests');
    AWS.EC2.restore();
    assert.end();
  });
});

test('[spot-fleet] manage parses events and relays LatestStreamLabel through Response', assert => {

  http.request = (options, cb) => {
    return {
      on: function() {
        return this;
      },
      write: () => {},
      end: () => {
        return cb();
      }
    };
  };
  const requestSpotFleet = AWS.stub('EC2', 'requestSpotFleet', (opts, cb) => {
    assert.deepEquals(opts, {
      SpotFleetRequestConfig: {
        AllocationStrategy : 'diversified',
        ExcessCapacityTerminationPolicy : 'noTermination',
        IamFleetRole : 'IAM Fleet Role',
        LaunchSpecifications : [{
          InstanceType: 'r3.8xlarge',
          WeightedCapacity: 2.44
        }],
        SpotPrice : '20',
        TargetCapacity : 5,
        TerminateInstancesWithExpiration : false,
        ValidFrom : 'start date',
        ValidUntil : 'end date'
      },
      DryRun: false
    });
    return cb(null, { SpotFleetRequestId: 'sfr-firstrequestid1111111111111111111111'});
  });

  SpotFleet.manage({
    ResponseURL: 'http://api.mapbox.com/hello',
    PhysicalResourceId: 'abc',
    StackId: 'abc',
    LogicalResourceId: 'abc',
    ResourceProperties: {
      SpotFleetRequestConfigData: {
        AllocationStrategy : 'diversified',
        ExcessCapacityTerminationPolicy : 'noTermination',
        IamFleetRole : 'IAM Fleet Role',
        LaunchSpecifications : [{
          InstanceType: 'r3.8xlarge',
          WeightedCapacity: 2.44
        }],
        SpotPrice : '20',
        TargetCapacity : 5,
        TerminateInstancesWithExpiration : 'false',
        ValidFrom : 'start date',
        ValidUntil : 'end date'
      },
      Region: 'us-east-1'
    },
    RequestId: 'abc',
    RequestType: 'CREATE'
  }, {
    done: (err, body) => {
      assert.ifError(err, 'should not error');
      assert.equals(JSON.parse(body).Status, 'SUCCESS', 'status is success');
      requestSpotFleet.restore();
      assert.end();
    }
  })
});
