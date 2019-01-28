var AWS = require('aws-sdk');
var utils = require('../lib/utils');
var Response = require('../lib/response');

module.exports = function(event, context) {
  if (!utils.validCloudFormationEvent(event))
    return context.done(null, 'ERROR: Invalid CloudFormation event');
  var response = new Response(event, context);

  var requestType = event.RequestType.toLowerCase();
  if (requestType === 'delete') return response.send();

  var ec2 = new AWS.EC2();
  var info = {};

  ec2.describeVpcs({
    Filters: [{ Name: 'isDefault', Values: ['true'] }]
  }).promise().then((data) => {
    info.VpcId = data.Vpcs[0].VpcId;
    return Promise.all([
      ec2.describeSubnets({ Filters: [{ Name: 'vpc-id', Values: [info.VpcId] }] }).promise(),
      ec2.describeRouteTables({ Filters: [{ Name: 'vpc-id', Values: [info.VpcId] }] }).promise()
    ]);
  }).then((results) => {
    var publicSubnets = results[0].Subnets.filter((subnet) => subnet.MapPublicIpOnLaunch);
    var privateSubnets = results[0].Subnets.filter((subnet) => !subnet.MapPublicIpOnLaunch);

    info.AvailabilityZones = publicSubnets.map((subnet) => subnet.AvailabilityZone);
    info.AvailabilityZoneCount = publicSubnets.length;
    info.PrivateSubnetAvailabilityZones = privateSubnets.map((subnet) => subnet.AvailabilityZone);
    info.PrivateSubnetAvailabilityZoneCount = privateSubnets.length;
    info.PublicSubnets = publicSubnets.map((subnet) => subnet.SubnetId);
    info.PrivateSubnets = privateSubnets.map((subnet) => subnet.SubnetId);
    info.RouteTable = results[1].RouteTables[0].RouteTableId;
    response.setId(info.VpcId);
    response.send(null, info);
  }).catch((err) => response.send(err));
};
