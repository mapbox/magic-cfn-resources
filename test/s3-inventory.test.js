'use strict';

const S3Inventory = require('../functions/s3-inventory');
const test = require('tape');
const AWS = require('@mapbox/mock-aws-sdk-js');

test('[s3-inventory] constructor', (assert) => {
  assert.throws(() => new S3Inventory(), /Missing Parameter/, 'throws with no bucket');
  assert.throws(() => new S3Inventory('bucket'), /Missing Parameter/, 'throws with no region');
  assert.throws(() => new S3Inventory('bucket', 'us-east-1'), /Missing Parameter/, 'throws with no id');
  assert.throws(() => new S3Inventory('bucket', 'us-east-1', 'id'), /Missing Parameter/, 'throws with no config');

  AWS.stub('S3', 'getObject');

  const newInv = new S3Inventory('bucket', 'us-east-1', 'id', {});
  const updateInv = new S3Inventory('bucket', 'us-east-1', 'id', {}, 'old');
  const updateSame = new S3Inventory('bucket', 'us-east-1', 'id', {}, 'id');

  assert.ok(AWS.S3.calledWith({ region: 'us-east-1' }), 'created s3 client in the right region');
  assert.deepEqual(newInv.params, {
    Bucket: 'bucket',
    Id: 'id',
    InventoryConfiguration: {}
  }, 'sets properties for create');

  assert.equal(updateInv.oldId, 'old', 'update sets oldId property when intention is to create a new inventory');
  assert.notOk(updateSame.oldId, 'no oldId set when updating an inventory in place');

  AWS.S3.restore();
  assert.end();
});

test('[s3-inventory] create', (assert) => {
  const put = AWS.stub('S3', 'putBucketInventoryConfiguration').yields();
  const newInv = new S3Inventory('bucket', 'us-east-1', 'id', {});

  newInv.create((err, id) => {
    assert.ifError(err, 'test failed');

    assert.equal(id, 'id', 'returns id');

    assert.ok(put.calledWith({
      Bucket: 'bucket', Id: 'id', InventoryConfiguration: {}
    }), 'called API with expected parameters');

    AWS.S3.restore();
    assert.end();
  });
});

test('[s3-inventory] update', (assert) => {
  const put = AWS.stub('S3', 'putBucketInventoryConfiguration').yields();
  const del = AWS.stub('S3', 'deleteBucketInventoryConfiguration').yields();
  const updateInv = new S3Inventory('bucket', 'us-east-1', 'id', {}, 'old');

  updateInv.update((err, id) => {
    assert.ifError(err, 'test failed');

    assert.equal(id, 'id', 'returns new id');

    assert.ok(put.calledWith({
      Bucket: 'bucket', Id: 'id', InventoryConfiguration: {}
    }), 'called put API with expected parameters');

    assert.ok(del.calledWith({
      Bucket: 'bucket', Id: 'old'
    }), 'called delete API with expected parameters');

    AWS.S3.restore();
    assert.end();
  });
});

test('[s3-inventory] delete', (assert) => {
  const del = AWS.stub('S3', 'deleteBucketInventoryConfiguration').yields();
  const delInv = new S3Inventory('bucket', 'us-east-1', 'id', {}, 'id');

  delInv.delete((err) => {
    assert.ifError(err, 'test failed');

    assert.ok(del.calledWith({
      Bucket: 'bucket', Id: 'id'
    }), 'called delete API with expected parameters');

    AWS.S3.restore();
    assert.end();
  });
});
