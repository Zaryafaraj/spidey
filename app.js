var express = require('express');
var bodyParser = require('body-parser');
var cuid = require('cuid');
var cors = require('cors');
var debug = require('debug')('spidey');
var http = require('http');
var routes = require('./routes/index');
var logger = require('./utils/logger').getNodeLogger();


var app = express();

app.use(setupDomain);
setupRequestLogging();
app.enable('trust proxy');
app.disable('x-powered-by');
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
//add a unique requestId to each request that comes in
app.use(function (req, res, next) {
    req.requestId = cuid();
    //add a logger to each request
    req.log = logger.child({requestId: req.requestId});
    next();
});

//=============================================
//         Routes
//=============================================
app.use('/', routes);

//=============================================
//          Error Handlers
//=============================================
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500).send({
            message: err.message,
            error: err.stack
        });
    });
}
app.use(function (err, req, res, next) {
    res.status(err.status || 500).send({
        message: err.message,
        error: {}
    });
});

//=============================================
//          Initiate Server
//=============================================
app.set('port', process.env.PORT_SPIDEY || 8001);

var server;
function startServer() {
    server = http.createServer(app).listen(app.get('port'), function () {
        debug('Express server listening on port ' + app.get('env') + ' mode on ' + app.get('port'));
    });
}

//this file is run directly;start a single app server
if (require.main === module) {
    startServer();
} else {
    //file was ran as a module for cluster initiation, give the cluster
    //the function to bring up a node server
    module.exports = startServer;
}

//=============================================
//          Helpers
//=============================================
function setupDomain(req, res, next) {
    //create a node domain to execute the request in
    var domain = require('domain').create();
    //when an uncaught error happens in the domain we try
    //to shut down the node worker gracefully.
    domain.on('error', function (err, berror, merror) {

        logger.error(err, 'FATAL DOMAIN ERROR CAUGHT') ;
        try {
            //failsafe shutdown in 5 seconds to give other requests time
            //to be served
            setTimeout(function () {
                logger.error('Failsafe Shutdown. Shutting down NOW');
                process.exit(1);
            }, 5000);

            //if we are worker, disconnect from the cluster and stop accepting new request
            var worker = require('cluster').worker;
            if (worker) worker.disconnect();
            server.close();

            try {
                //attempt to user Express error route
                next(err);
                logger.error(err, 'Managed to use express to handle the error.');
            } catch (err) {
                logger.error(err, 'Express error mechanism failed.');
                //fall back on node response and terminate response
                res.statusCode = 500;
                res.setHeader('content-type', 'text/plain');
                res.end('Server error');
            }
        } catch (err) {
            logger.error(err, 'Unable to send 500 response.');
        }
    });

    //add the request and response objects to the domain
    domain.add(req);
    domain.add(res);

    //executre the rest of the request chain in the domain
    domain.run(next);
}

function setupRequestLogging() {

    switch (app.get('env')) {
        case 'development':
            app.use(require('morgan')('dev'));
            break;
        case 'production':
            app.use(require('express-logger')({
                path: __dirname + '/log/requests.log'
            }));
            break;
    }
}
//production notes:
//export NODE_ENV=production
//mkdir ./log
//inject the certificates
//make sure you are running the server on 443 port for https
