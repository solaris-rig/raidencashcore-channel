'use strict';

var spec = {
  name: 'Channel',
  message: 'Internal Error on bitcore-channels Module {0}',
};

module.exports = require('raidencashcore-lib').errors.extend(spec);
