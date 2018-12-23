'use strict';

var Payment = require('./transactions/payment');
var Refund = require('./transactions/refund');

var $ = require('raidencashcore-lib').util.preconditions;
var PrivateKey = require('raidencashcore-lib').PrivateKey;
var Script = require('raidencashcore-lib').Script;
var Address = require('raidencashcore-lib').Address;
var Networks = require('raidencashcore-lib').Networks;
var _ = require('raidencashcore-lib').deps._;

/**
 * @constructor
 */
function Provider(opts) {
  this.network = Networks.get(opts.network) || Networks.defaultNetwork;
  if (!opts.paymentAddress) {
    this.paymentKey = new PrivateKey();
    this.paymentAddress = this.paymentKey.toAddress(this.network);
  } else {
    this.paymentAddress = new Address(opts.paymentAddress);
  }

  this.currentAmount = opts.currentAmount || 0;
  this.key = opts.key || new PrivateKey();
}

Provider.prototype.getPublicKey = function getPublicKey() {
  return this.key.publicKey;
};

Provider.prototype.signRefund = function signRefund(receivedData) {
  var refund = new Refund(receivedData);
  refund.sign(this.key);
  this.refund = refund;
  return refund;
};

Provider.prototype.validPayment = function validPayment(receivedData) {
  var payment = new Payment(receivedData);
  var newAmount;
  var self = this;

  payment.sign(this.key);
  payment.outputs.map(function(output) {
    if (output.script.toAddress(self.network).toString() === self.paymentAddress.toString()) {
      newAmount = output.satoshis;
    }
  });
  $.checkState(!_.isUndefined(newAmount), 'No output found corresponding to paymentAddress');
  $.checkState(Script.Interpreter().verify(
    payment.inputs[0].script,
    payment.inputs[0].output.script,
    payment,
    0,
    Script.Interpreter.SCRIPT_VERIFY_P2SH
    |
    Script.Interpreter.SCRIPT_VERIFY_STRICTENC
    |
    Script.Interpreter.SCRIPT_VERIFY_MINIMALDATA
    |
    Script.Interpreter.SCRIPT_VERIFY_SIGPUSHONLY
  ), 'Script did not evaluate correctly (probably a bad signature received)');
  $.checkState(newAmount > this.currentAmount,
    'A payment for a greater amount was already received');
  this.paymentTx = payment;
  this.currentAmount = newAmount;
  return payment;
};

Provider.prototype.getPaymentTx = function getPaymentTx() {
  return this.paymentTx.build();
};

module.exports = Provider;
