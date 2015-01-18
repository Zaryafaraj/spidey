var cluster = require('cluster');
var debug = require('debug')('spidey');
var logger = require('./../utils/logger').getClusterLogger();

function startWorker() {
    var worker = cluster.fork();
    debug('CLUSTER: Worker %d started', worker.id)
    logger.info('Worker %d started', worker.id);
}

if (cluster.isMaster) {

    //because of a bug in webstorm which adds the same debug port for
    //each child process, we remove the debug-brk args if it exists and
    //add random ports manually
    var hasDebugParam = process.execArgv.some(function(element) {
        return element.indexOf('debug-brk') !== -1;
        });
    cluster.setupMaster({
        execArgv: process.execArgv.filter(function(s) { return s !== '--debug-brk' })
    });

    //for each cpu create a new process
    require('os').cpus().forEach(function (value, i) {

        if (hasDebugParam) {
            cluster.settings.execArgv.push('--debug-brk=' + (5859 + i));
        }

        startWorker();
        if (hasDebugParam) {
            cluster.settings.execArgv.pop();
        }
    });

    // log any workers that disconnect; if a worker disconnects, it
    // should then exit, so we'll wait for the exit event to spawn
    // a new worker to replace it
    cluster.on('disconnect', function (worker) {
        debug('CLUSTER: Worker %d disconnected from the cluster.',
            worker.id);
        logger.warn('Worker %d disconnected from cluster', worker.id);
    });

    // when a worker dies (exits), create a worker to replace it
    cluster.on('exit', function(worker, code, signal){
        debug('CLUSTER: Worker %d died with exit code %d (%s)',
        worker.id, code, signal);
        logger.warn('Worker %d died withexit code %d (%s)',
            worker.id, code, signal);
        startWorker();
    });
} else {
    //if you are merely a slave just create your own process
    require('./../app')();
}
