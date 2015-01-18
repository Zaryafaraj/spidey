var express = require('express');
var router = express.Router();
var crawler = require('../crawler/aptCrawler')

var allCities = ['seattle', 'redmond', 'bellevue', 'kirkland', 'everet', 'tacoma', 'olympia'];

router.get('/cities', function(req, res) {
    res.send(allCities);
});

router.post('/crawl/:cityName', function(req, res) {

    var cityName = req.params.cityName.toLowerCase();

    if (allCities.indexOf(cityName) === -1){
        res.status(404).send('data not available for city of ' + cityName);
    } else {
        crawler.crawlCity(cityName, req.log);
        res.send('Crawling Started');
    }

});

module.exports = router;
