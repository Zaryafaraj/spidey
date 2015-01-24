var express = require('express');
var router = express.Router();
var crawler = require('../crawler/aptCrawler')
var apartmentsModel = require('../model/apartments')

var allCities = ['seattle', 'redmond', 'bellevue', 'kirkland', 'tacoma', 'olympia'];

router.get('/', function(req, res){
    res.send('My spidey senses tell me its' + new Date().toString());
});

router.get('/healthCheck', function(req, res){
    res.status(200).send();
});

router.get('/version', function(req, res){
    var GIT_VERSION = '__GIT_VERSION__';
    req.log.info('version');
    res.send(GIT_VERSION);
});

router.get('/cities', function (req, res) {
    res.send(allCities);
});

router.post('/crawl/:cityName', function (req, res) {

    var cityName = req.params.cityName.toLowerCase();

    if (allCities.indexOf(cityName) === -1) {
        res.status(404).send('data not available for city of ' + cityName);
    } else {
        crawler.crawlCity(cityName, req.log);
        res.send('Crawling Started');
    }
});

router.get('/cities', function (req, res) {
    res.json(allCities);
})

router.get('/cities/:cityName', function (req, res) {

    var cityName = req.params.cityName.toLowerCase();

    if (allCities.indexOf(cityName) === -1) {
        res.status(404).send('data not available for city of ' + cityName);
    } else {

        apartmentsModel.getAllApartments(cityName, function(err, result) {
            if (err) {
                if (err.NoItem) {
                    res.status(404).send('No apartments for' + cityName);
                } else {
                    res.status(500).send();
                }
            }
            res.status(200).json(result);
        });
    }
});

router.get('/apartments/:apartmentId', function (req, res) {
    var apartmentId = req.params.apartmentId.toLowerCase();
    apartmentsModel.getApartment(apartmentId, function(err, result) {
        if (err) {
            if (err.NoItem) {
                res.status(404).send('No apartments for id ' + apartmentId);
            } else {
                res.status(500).send();
            }
        }
        res.status(200).json(result);
    });
});

module.exports = router;
