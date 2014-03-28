/**
 * Created by Jade on 2014/03/11.
 */
module.exports = function() {
    return[
        {
            "request": {
                "method": "GET",
                "url": "http://wards.code4sa.org/",
                "params": {
                    "address": 'bad input',
                    "database": "vd_2014"
                }
            },
            "response": {
                "code": 200,
                "data": {
                    "error": "address not found"
                }
            }
        },
        {
            "request": {
                "method": "GET",
                "url": "http://wards.code4sa.org/",
                "params": {
                    "address": 'main street',
                    "database": "vd_2014"
                }
            },
            "response": {
                "code": "200",
                "data": [
                    {
                        "province": "9",
                        "municipality": "9910",
                        "voting_station": "Paarl Boland College",
                        "coords": [
                            -33.725839,
                            18.9633809
                        ],
                        "address": "Main Street, Paarl, South Africa",
                        "voting_district": "98380042",
                        "ward": "10203019"
                    },
                    {
                        "province": "9",
                        "municipality": "9903",
                        "voting_station": "Recreation Hall",
                        "coords": [
                            -32.0929697,
                            18.3313228
                        ],
                        "address": "Main Street, Lambert's Bay 8130, South Africa",
                        "voting_district": "97680022",
                        "ward": "10102005"
                    },
                    {
                        "province": "4",
                        "municipality": "4426",
                        "voting_station": "Glencoe Town Hall",
                        "coords": [
                            -28.181081,
                            30.1673192
                        ],
                        "address": "Main Street, Glencoe, South Africa",
                        "voting_district": "43650019",
                        "ward": "52401002"
                    },
                    {
                        "province": "4",
                        "municipality": "4410",
                        "voting_station": "Roman Catholic Church",
                        "coords": [
                            -29.476725,
                            30.2084741
                        ],
                        "address": "Main Street, Howick, South Africa",
                        "voting_district": "43870114",
                        "ward": "52202005"
                    },
                    {
                        "province": "1",
                        "municipality": "1001",
                        "voting_station": "Ng Church Despatch South Hall",
                        "coords": [
                            -33.8027891,
                            25.4793096
                        ],
                        "address": "Main Street, Despatch 6220, South Africa",
                        "voting_district": "10080065",
                        "ward": "29300053"
                    },
                    {
                        "province": "1",
                        "municipality": "4034",
                        "voting_station": "Matatiele Town Hall",
                        "coords": [
                            -30.344456,
                            28.812005
                        ],
                        "address": "Main Street, Matatiele 4730, South Africa",
                        "voting_district": "43920019",
                        "ward": "24401019"
                    },
                    {
                        "province": "5",
                        "municipality": "5511",
                        "voting_station": "Licensing Office Witbank",
                        "coords": [
                            -25.8702116,
                            29.2090598
                        ],
                        "address": "Main Street, Emalahleni, South Africa",
                        "voting_district": "54650493",
                        "ward": "83102017"
                    },
                    {
                        "province": "9",
                        "municipality": "9906",
                        "voting_station": "Uniting Reformed Church Darling",
                        "coords": [
                            -33.3778176,
                            18.3843956
                        ],
                        "address": "Main Street, Darling 7345, South Africa",
                        "voting_district": "97610014",
                        "ward": "10105006"
                    }
                ]
            }
        },
        {
            "request": {
                "method": "GET",
                "url": "http://wards.code4sa.org/",
                "params": {
                    "address": "21 conduit street",
                    "database": "vd_2014"
                }
            },
            "response": {
                "code": "200",
                "data": [
                    {
                        "province": "3",
                        "municipality": "3003",
                        "voting_station": "River Walk Centre",
                        "coords": [
                            -26.02674,
                            27.97532
                        ],
                        "address": "21 Conduit Street, Randburg 2188, South Africa",
                        "voting_district": "32840591",
                        "ward": "79800096"
                    },
                    {
                        "province": "3",
                        "municipality": "3003",
                        "voting_station": "Temporary Voting Station (Open Park Cnr Westview Drive & Roux Avenue)",
                        "coords": [
                            -26.0701361,
                            27.9946541
                        ],
                        "address": "21 Conduit Street, Sandton 2191, South Africa",
                        "voting_district": "32840489",
                        "ward": "79800104"
                    },
                    {
                        "province": "3",
                        "municipality": "3003",
                        "voting_station": "Ferndale High School",
                        "coords": [
                            -26.0874853,
                            28.0094074
                        ],
                        "address": "21 Conduit Street, Randburg 2194, South Africa",
                        "voting_district": "32840445",
                        "ward": "21004003"
                    }
                ]
            }
        },
        {
            "request": {
                "method": "GET",
                "url": "https://maps.googleapis.com/maps/api/geocode/json",
                "params": {
                    "address": '21 conduit street south africa',
                    "sensor": "false"
                }
            },
            "response": {
                "code": "200",
                "data": {
                    "results" : [
                        {
                            "address_components" : [
                                {
                                    "long_name" : "21",
                                    "short_name" : "21",
                                    "types" : [ "street_number" ]
                                },
                                {
                                    "long_name" : "Conduit Street",
                                    "short_name" : "Conduit St",
                                    "types" : [ "route" ]
                                },
                                {
                                    "long_name" : "Johannesburg North",
                                    "short_name" : "Johannesburg North",
                                    "types" : [ "sublocality", "political" ]
                                },
                                {
                                    "long_name" : "Randburg",
                                    "short_name" : "Randburg",
                                    "types" : [ "locality", "political" ]
                                },
                                {
                                    "long_name" : "Johannesburg",
                                    "short_name" : "Johannesburg",
                                    "types" : [ "administrative_area_level_3", "political" ]
                                },
                                {
                                    "long_name" : "City of Johannesburg Metropolitan Municipality",
                                    "short_name" : "City of Johannesburg Metropolitan Municipality",
                                    "types" : [ "administrative_area_level_2", "political" ]
                                },
                                {
                                    "long_name" : "Gauteng",
                                    "short_name" : "GP",
                                    "types" : [ "administrative_area_level_1", "political" ]
                                },
                                {
                                    "long_name" : "South Africa",
                                    "short_name" : "ZA",
                                    "types" : [ "country", "political" ]
                                },
                                {
                                    "long_name" : "2188",
                                    "short_name" : "2188",
                                    "types" : [ "postal_code" ]
                                }
                            ],
                            "formatted_address" : "21 Conduit Street, Randburg 2188, South Africa",
                            "geometry" : {
                                "location" : {
                                    "lat" : -26.02674,
                                    "lng" : 27.97532
                                },
                                "location_type" : "ROOFTOP",
                                "viewport" : {
                                    "northeast" : {
                                        "lat" : -26.0253910197085,
                                        "lng" : 27.9766689802915
                                    },
                                    "southwest" : {
                                        "lat" : -26.0280889802915,
                                        "lng" : 27.9739710197085
                                    }
                                }
                            },
                            "types" : [ "street_address" ]
                        },
                        {
                            "address_components" : [
                                {
                                    "long_name" : "21",
                                    "short_name" : "21",
                                    "types" : [ "street_number" ]
                                },
                                {
                                    "long_name" : "Conduit Street",
                                    "short_name" : "Conduit St",
                                    "types" : [ "route" ]
                                },
                                {
                                    "long_name" : "Bryanston",
                                    "short_name" : "Bryanston",
                                    "types" : [ "sublocality", "political" ]
                                },
                                {
                                    "long_name" : "Sandton",
                                    "short_name" : "Sandton",
                                    "types" : [ "locality", "political" ]
                                },
                                {
                                    "long_name" : "Johannesburg",
                                    "short_name" : "Johannesburg",
                                    "types" : [ "administrative_area_level_3", "political" ]
                                },
                                {
                                    "long_name" : "City of Johannesburg Metropolitan Municipality",
                                    "short_name" : "City of Johannesburg Metropolitan Municipality",
                                    "types" : [ "administrative_area_level_2", "political" ]
                                },
                                {
                                    "long_name" : "Gauteng",
                                    "short_name" : "GP",
                                    "types" : [ "administrative_area_level_1", "political" ]
                                },
                                {
                                    "long_name" : "South Africa",
                                    "short_name" : "ZA",
                                    "types" : [ "country", "political" ]
                                },
                                {
                                    "long_name" : "2191",
                                    "short_name" : "2191",
                                    "types" : [ "postal_code" ]
                                }
                            ],
                            "formatted_address" : "21 Conduit Street, Sandton 2191, South Africa",
                            "geometry" : {
                                "bounds" : {
                                    "northeast" : {
                                        "lat" : -26.0701247,
                                        "lng" : 27.9946676
                                    },
                                    "southwest" : {
                                        "lat" : -26.0701361,
                                        "lng" : 27.9946541
                                    }
                                },
                                "location" : {
                                    "lat" : -26.0701361,
                                    "lng" : 27.9946541
                                },
                                "location_type" : "RANGE_INTERPOLATED",
                                "viewport" : {
                                    "northeast" : {
                                        "lat" : -26.06878141970849,
                                        "lng" : 27.9960098302915
                                    },
                                    "southwest" : {
                                        "lat" : -26.0714793802915,
                                        "lng" : 27.9933118697085
                                    }
                                }
                            },
                            "types" : [ "street_address" ]
                        }
                    ],
                    "status" : "OK"
                }
            }
        },
        {
            "request": {
                "method": "GET",
                "url": "https://maps.googleapis.com/maps/api/geocode/json",
                "params": {
                    "address": 'main street south africa',
                    "sensor": "false"
                }
            },
            "response": {
                "code": "200",
                "data": {
                    "results" : [
                        {
                            "formatted_address" : "Main Street, Johannesburg, South Africa",
                            "geometry" : {
                                "location" : {
                                    "lat" : -26.2052996,
                                    "lng" : 28.0550804
                                }
                            }
                        },{
                            "formatted_address" : "Main Street, Johannesburg 2192, South Africa",
                            "geometry" : {
                                "location" : {
                                    "lat" : -26.148775,
                                    "lng" : 28.090455
                                }
                            }
                        },{
                            "formatted_address" : "Main Street, Johannesburg South 2190, South Africa",
                            "geometry" : {
                                "location" : {
                                    "lat" : -26.2519144,
                                    "lng" : 28.0513759
                                }
                            }

                        },{
                            "formatted_address" : "Main Street, Soweto 1863, South Africa",
                            "geometry" : {
                                "location" : {
                                    "lat" : -26.2304574,
                                    "lng" : 27.8142978
                                }
                            }
                        },{
                            "formatted_address" : "Main Street, Soweto 1863, South Africa",
                            "geometry" : {
                                "location" : {
                                    "lat" : -26.2236002,
                                    "lng" : 27.8646498
                                }
                            }
                        }
                     ],
                    "status" : "OK"
                }
            }
        },
        {
            "request" :{
                "url": "https://godi.crowdmap.com/api",
                "method": "POST",
                "headers": {
                    "Content-Type": ["x-www-form-urlencoded"]
                },
                "body": [
                    "task=report",
                    "incident_title=test" ,
                    "incident_description=Party%20going%20door-to-door" ,
                    "incident_category=1",
                    "incident_date=03%2F16%2F2014" ,
                    "incident_hour=0" ,
                    "incident_minute=0" ,
                    "incident_ampm=am" ,
                    "latitude=-26.02674" ,
                    "longitude=27.97532" ,
                    "location_name=21%20Conduit%20Street%2C%20Randburg%202188%2C%20South%20Africa"
                ].join('&')
            },//https://godi.crowdmap.com/api?task=report&incident_title=test&incident_description=description&incident_date=01%2F01%2F2010&incident_hour=8&incident_minute=10&incident_ampm=am&incident_category=1&latitude=-26.0253910197085&longitude=27.9766689802915&location_name=ZeroPoint
            "response" : {
                "code": 200,
                "body": JSON.stringify({ //This is ACTUALLY what a successful response looks like
                    "payload": {
                        "domain": "https://godi.crowdmap.com/",
                        "success": "true"
                    },
                    "error": {
                        "code": "0",
                        "message": "No Error"
                    }
                })
            }
        }

    ];
};
