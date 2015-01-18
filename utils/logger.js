/**
 * Created by Fathalian on 12/21/14.
 */
var bunyan = require('bunyan');
var cluster = require('cluster');

var localLoggers = {};



var clusterLogger = bunyan.createLogger({
    name: 'spideyCluster',
    streams : [{
        path : './log/cluster.log'
    }]
});

module.exports = {
    getNodeLogger : function() {

        //if we are creating a worker, we need a specific log file
        //so that we don't create concurrency issues
        if(cluster.isWorker) {
            if (localLoggers[cluster.worker.id]) {
                return localLoggers[cluster.worker.id];
            } else {
                var newLogger = bunyan.createLogger({
                    name: 'MultiWorker',
                    streams : [{
                        type: 'rotating-file',
                        path : './log/app' + cluster.worker.id + '.log',
                        period: '1d',   // daily rotation
                        count: 3        // keep 3 back copies
                    }]
                });
                localLoggers[cluster.worker.id] = newLogger;
                return newLogger;
            }
        } else {
            return bunyan.createLogger({
                name: 'SingleWorker',
                streams : [{
                    type: 'rotating-file',
                    path : './log/app.log',
                    period: '1d',   // daily rotation
                    count: 3        // keep 3 back copies
                }]
            });
        }
    },
    getClusterLogger : function() { return clusterLogger}
}


