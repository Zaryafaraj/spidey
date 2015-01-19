/**
 *
 * Created by Fathalian on 1/18/15.
 */

var AWS = require('aws-sdk');
var async = require('async');

AWS.config.region = 'us-west-2'
var dynamo = new AWS.DynamoDB();

function saveAllApartmentsForCity(allApartments, cityName, callback) {
    var allApartmentStr = JSON.stringify(allApartments);
    var allApartmentsEntry = {
        city: {
            S: cityName
        },
        apartments: {
            S: allApartmentStr
        }
    };

    var params = {
        Item: allApartmentsEntry,
        TableName: 'zyp-all-apartments'
    };

    dynamo.putItem(params, callback);
}

//write items to dynamo 25 at a time
function batchSaveApartments(apartments, finalCallback) {

    var dynamoUpdateParams = [];
    var updates = [];

    for (var i = 0; i < apartments.length; i++) {

        var apartmentStr = JSON.stringify(apartments[i]);
        var newPut = {
            PutRequest: {
                Item: {
                    id: {
                        S: apartments[i].id
                    },
                    apartment: {
                        S: apartmentStr
                    }
                }
            }
        }

        updates.push(newPut);

        if (updates.length === 25) {
            var params = {
                RequestItems: {
                    //name of table
                    'zyp-apartments': updates
                }
            };

            dynamoUpdateParams.push(params);

            updates = [];
        }
    }

    if (updates.length !== 0) {
        var params = {
            RequestItems: {
                //name of table
                'zyp-apartments': updates
            }
        };

        dynamoUpdateParams.push(params);
    }

    var dynamoSave = function(param, callback) {
        dynamo.batchWriteItem(param, callback);
    };

    async.eachSeries(dynamoUpdateParams, dynamoSave, finalCallback);
}

module.exports = {
    saveAllApartmentsForCity : saveAllApartmentsForCity,
    batchSaveApartments: batchSaveApartments
}
