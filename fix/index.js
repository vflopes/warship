'use strict';
const fs = require('fs');
const path = require('path');
const ioredisPath = path.dirname(require.resolve('ioredis'));

try {
	const clusterIndexPath = path.join(ioredisPath, 'cluster/index.js');
	fs.unlinkSync(clusterIndexPath);
	fs.copyFileSync(path.join(__dirname, 'ioredis-cluster-index.js'), clusterIndexPath);
} catch (error) {}