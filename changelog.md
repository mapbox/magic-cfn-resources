### 2.1.0

Adds a list of VPC route tables as a DefaultVpc property.

### 2.0.0

Update to Node 14.x

### 1.9.0

Update to Node 10.x

### 1.8.0

Adds availability-zone-indexed arrays as DefaultVpc properties. See https://github.com/mapbox/magic-cfn-resources/pull/33 for details.

### 1.7.0

DefaultVPC function now exposes information about private subnets.

### 1.6.2

Cloudformation service suffix fixes for China accounts.

### 1.6.1

Note: Please update directly to 1.6.2.
Dynamic url suffixes in CFN for China accounts.

### 1.6.0

Added `S3Inventory` magic resource.

### 1.5.4

Fixed the readme to show that you can add `PrefixFilter` and `SuffixFilter` to your s3NotificationTopicConfig.

### 1.5.3

ES6 changes.

### 1.5.2

Stop exporting non-public subnets in default-vpc `PublicSubnets`.

### 1.5.1

Make the cfn china-safe.

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
