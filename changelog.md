### 1.4.0

Added `s3-notification-topic-config` resource. Also added a `moreResources` function to `/lib/build.js` for resources that require additional resources.

### 1.3.0

Added `default-vpc` resource

### 1.2.4

Rewrote parts of `/lib/build.js` so that references to SpotFleet specific properties were not evaluated for non-spotfleets

### 1.2.4
Adjusted Custom Resource names from 'Custom::MagicCfnResource' to Custom::CustomResourceName, IE a SpotFleet will be Custom::SpotFleet

### 1.2.3
Fixed cloudfriend being a dev dependency

### 1.2.2

Pointed role resources in spotfleet build at LauncSpecifications.IamInstanceProfile.Arn instead of passing a custom parameter.

### 1.2.1

Updated role resources in spotfleet build [function](https://github.com/mapbox/magic-cfn-resources/pull/14).
