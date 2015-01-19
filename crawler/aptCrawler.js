/**
 *
 * Created by Fathalian on 1/17/15.
 */

var request = require('request');
var cheerio = require('cheerio');
var cuid = require('cuid');
var apartmentsModel = require('../model/apartments');
var async = require('async');

var cities = {
    seattle: 'http://www.forrent.com/find/WA/metro-Seattle/Seattle/show-40',
    bellevue: 'http://www.forrent.com/find/WA/metro-Seattle/Bellevue/show-40',
    redmond: 'http://www.forrent.com/find/WA/metro-Seattle/Redmond/show-40',
    kirkland: 'http://www.forrent.com/find/WA/metro-Seattle/Kirkland/show-40',
    everett: 'http://www.forrent.com/find/WA/metro-North+Washington/Everett/show-40',
    tacoma: 'http://www.forrent.com/find/WA/metro-Tacoma/Tacoma/show-40',
    olympia: 'http://www.forrent.com/find/WA/metro-Tacoma/Olympia'
}

function crawlCity(cityName, logger) {

    function visitPage(pageUrl, callback) {
        request(pageUrl, function (err, response, html) {
            logger.info('got page ' + pageUrl);
            var $ = cheerio.load(html);
            var apartments = [];
            for (var i = 0; i <= 39; i++) {

                $('#searchMatch' + i + '-hcard').each(function (j, elem) {
                    var apartment = {};
                    var header = $('h2 .searchMatchTitle', this)[0];
                    apartment.link = $(header).attr('href');
                    apartment.title = $(header).text();


                    var latitude = $('.latitude', this);
                    if (latitude.length > 0) {
                        apartment.latitude = $(latitude[0]).text();
                    }
                    var longitude = $('.longitude', this);
                    if (longitude.length > 0) {
                        apartment.longitude = $(longitude[0]).text();
                    }
                    var street = $('.street-address', this);
                    if (street.length > 0) {
                        apartment.street = $(street[0]).text();
                    }

                    var city = $('.locality', this);
                    if (city.length > 0) {
                        apartment.city = $(city[0]).text();
                    }

                    var region = $('.region', this);
                    if (region.length > 0) {
                        apartment.region = $(region[0]).text();
                    }

                    var zipCode = $('.postal-code', this);
                    if (zipCode.length > 0) {
                        apartment.zipCode = $(zipCode[0]).text().trim();
                    }

                    var thumbnail = $('a img', this);
                    if (thumbnail.length > 0) {
                        apartment.thumbnail = $(thumbnail[0]).attr('src');
                    }

                    var sizeAndPrice = $('.matchContent div a', this);
                    if (sizeAndPrice.length > 0) {
                        var splitResults = $(sizeAndPrice[0]).text().trim().split('|');
                        apartment.floorplan = splitResults[0].trim();
                        apartment.price = splitResults[1].trim();
                    }

                    var contact = $('.phone a');
                    if (contact.length > 0) {
                        apartment.contact = $(contact[0]).text();
                    }

                    var features = [];
                    $('.features li', this).each(function () {
                        features.push($(this).text().trim());
                    });
                    apartment.features = features;
                    apartment.id = cuid();

                    apartments.push(apartment);

                });
            }
            logger.info('Extracted ' + apartments.length + ' apartments');


            callback(null, apartments);

        });
    };

    function visitApartmentPage(apartment, callback) {
        request(apartment.link, function (err, response, html) {
            logger.info('Got apartment page for apartment ' + apartment.id);
            var result = {
                id: apartment.id,
                city: apartment.city,
                contact: apartment.contact,
                features: apartment.features,
                latitude: apartment.latitude,
                longtitude: apartment.longtitude,
                url: apartment.link,
                price: apartment.price,
                region: apartment.region,
                street: apartment.street,
                thumbnail: apartment.thumbnail,
                title: apartment.title,
                zipcode: apartment.zipCode
            };

            if (!html) {
                callback(null, result);
                return;
            }

            try {
                var $ = cheerio.load(html);
            } catch(err) {
                logger.info('Failed to read HTML, moving on...');
                callback(null, result);
                return;
            }

            var images = [];
            $('img.wFull').each(function (j, elem) {
                var imgSrc = $(this).attr('src');
                images.push(imgSrc)
            });
            result.images = images;

            $('#proShortDesc p').each(function (i, elem) {
                result.description = $(this).text();
            });

            result.specialFeatures = [];
            $('#specialFeaturesContent li').each(function (i, elem) {
                var specialFeature = $(this).text();
                result.specialFeatures.push(specialFeature);
            });

            result.communityFeatures = [];
            $('#proFeaturesContent li').each(function (i, elem) {
                var communityFeature = $(this).text();
                result.communityFeatures.push(communityFeature);
            });

            result.amenities = [];
            $('#proAmenitiesContent li').each(function (i, elem) {
                var amenity = $(this).text();
                result.amenities.push(amenity);
            });

            $('#proAmenitiesContent li').each(function (i, elem) {
                var amenity = $(this).text();
                result.amenities.push(amenity);
            });

            result.detailedFloorplans = {};
            $('#proFloorplans div.sep').each(function (i, elem) {
                var floorplan = $('header h3', this).text();
                result.detailedFloorplans[floorplan] = {};
                $('tr', this).each(function () {
                    var planName = $('.fakeLink', this).text();
                    result.detailedFloorplans[floorplan][planName] = {};
                    var floorPrice = $('.floorPlansPriceCount', this).text();
                    result.detailedFloorplans[floorplan][planName].price = floorPrice;
                    $('.floorPlansBathCount', this).each(function (index, element) {
                        //they have a bug in which they use .floorPlansBathCount for both sqr
                        //and bath
                        if (index === 0) {
                            result.detailedFloorplans[floorplan][planName].baths = $(this).text();
                        } else if (index === 1) {
                            result.detailedFloorplans[floorplan][planName].sqr = $(this).text();
                        }
                    });

                });
            });
            callback(null, result);

        });
    }

    //function starts here
    logger.info('Crawling ' + cityName);
    var url = cities[cityName];
    logger.info('Getting The main page at ' + url);
    request(url, function (err, response, html) {

        if (err) {
            logger.error('failed to get main page at ' + url);
            callback(err)
        }

        var $ = cheerio.load(html);
        var links = [];
        $('.pagination .unitRt a.unit').each(function (i, elem) {

            var pageLink = $(this).attr('href');
            if (links.indexOf(pageLink) === -1) {
                links[i] = pageLink;
            }
        });

        async.concat(links, visitPage, function (err, results) {


            logger.info('*** -- Successfully got all apartments');
            logger.info('Recording apartment lists into dynamo');
            apartmentsModel.saveAllApartmentsForCity(results, cityName, function (err) {
                if (err) {
                    logger.error(err, 'Failed to Save All Apartments');
                } else {
                    logger.info('****** - Saved All apartments for ' + cityName);

                    logger.info('Now visiting individual apartments' + cityName);
                    async.map(results, visitApartmentPage, function (err, crawledApartments) {

                        logger.info('*** Finished Visiting individual apartments' + cityName);
                        logger.info('Now Saving individual apartments into dynamo for' + cityName);
                        if (err) {
                            //failed to visit apartment
                            logger.error(err, 'Failed To visit apartment page');
                        } else {
                            apartmentsModel.batchSaveApartments(crawledApartments,
                                function (err) {
                                    if (err) {
                                        logger.info(err, 'Failed To save individual apartments to dynamo');
                                    } else {
                                        logger.info('successfully saved all the individual apartments into dynamo');
                                        logger.info('Here is lots of bananas');
                                        var banana =String.fromCharCode(0xD83C,0xDF4C)
                                        for (var i = 0; i < 10; i++) {
                                            logger.info(banana);
                                        }

                                    }

                                })
                        }

                    });
                }
            });

        });

    });
}

module.exports = {
    crawlCity: crawlCity
}
