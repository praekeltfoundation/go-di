/**
 * Created by Jade on 2014/03/11.
 */
module.exports = function() {
    return[
        {
            "request": {
                "method": "GET",
                "url": "http://wards.code4sa.org/",
                "params": [{"name":"address", "value": '21 conduit street'}]
            },
            "response": {
                "code": "200",
                "data": [
                    {
                        "province": "GT",
                        "wards_no": 94,
                        "coords": [
                            -26.02674,
                            27.97532
                        ],
                        "now31": "0:00:01.173270",
                        "now32": "0:00:00.041757",
                        "address": "21 Conduit Street, Randburg 2188, South Africa",
                        "ward": "79400094",
                        "municipality": "City of Johannesburg",
                        "now21": "0:00:01.131513"
                    },
                    {
                        "province": "GT",
                        "wards_no": 104,
                        "coords": [
                            -26.0701361,
                            27.9946541
                        ],
                        "now31": "0:00:01.177459",
                        "now32": "0:00:00.045946",
                        "address": "21 Conduit Street, Sandton 2191, South Africa",
                        "ward": "79400104",
                        "municipality": "City of Johannesburg",
                        "now21": "0:00:01.131513"
                    },
                    {
                        "province": "GT",
                        "wards_no": 104,
                        "coords": [
                            -26.0874853,
                            28.0094074
                        ],
                        "now31": "0:00:01.189634",
                        "now32": "0:00:00.058121",
                        "address": "21 Conduit Street, Randburg 2194, South Africa",
                        "ward": "79400104",
                        "municipality": "City of Johannesburg",
                        "now21": "0:00:01.131513"
                    }
                ]
            }
        },
        {
            "request": {
                "method": "GET",
                "url": "http://wards.code4sa.org/",
                "params": [{"name":"address", "value": 'bad input'}]
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
                "params": [{"name":"address", "value": 'main street'}]
            },
            "response": {
                "code": "200",
                "data": [
                    {
                        "province": "WC",
                        "wards_no": 19,
                        "coords": [
                            -33.725839,
                            18.9633809
                        ],
                        "now31": "0:00:01.140687",
                        "now32": "0:00:00.010717",
                        "address": "Main Street, Paarl, South Africa",
                        "ward": "10203019",
                        "municipality": "Drakenstein",
                        "now21": "0:00:01.129970"
                    },
                    {
                        "province": "WC",
                        "wards_no": 5,
                        "coords": [
                            -32.0929697,
                            18.3313228
                        ],
                        "now31": "0:00:01.161575",
                        "now32": "0:00:00.031605",
                        "address": "Main Street, Lambert's Bay 8130, South Africa",
                        "ward": "10102005",
                        "municipality": "Cederberg",
                        "now21": "0:00:01.129970"
                    },
                    {
                        "province": "KZ",
                        "wards_no": 1,
                        "coords": [
                            -28.181081,
                            30.1673192
                        ],
                        "now31": "0:00:01.259999",
                        "now32": "0:00:00.130029",
                        "address": "Main Street, Glencoe, South Africa",
                        "ward": "52401001",
                        "municipality": "Endumeni",
                        "now21": "0:00:01.129970"
                    },
                    {
                        "province": "KZ",
                        "wards_no": 9,
                        "coords": [
                            -29.476725,
                            30.2084741
                        ],
                        "now31": "0:00:01.339872",
                        "now32": "0:00:00.209902",
                        "address": "Main Street, Howick, South Africa",
                        "ward": "52202009",
                        "municipality": "uMngeni",
                        "now21": "0:00:01.129970"
                    },
                    {
                        "province": "EC",
                        "wards_no": 60,
                        "coords": [
                            -33.8027891,
                            25.4793096
                        ],
                        "now31": "0:00:01.363760",
                        "now32": "0:00:00.233790",
                        "address": "Main Street, Despatch 6220, South Africa",
                        "ward": "29500060",
                        "municipality": "Nelson Mandela Bay",
                        "now21": "0:00:01.129970"
                    },
                    {
                        "province": "EC",
                        "wards_no": 19,
                        "coords": [
                            -30.344456,
                            28.812005
                        ],
                        "now31": "0:00:01.429815",
                        "now32": "0:00:00.299845",
                        "address": "Main Street, Matatiele 4730, South Africa",
                        "ward": "24401019",
                        "municipality": "Matatiele",
                        "now21": "0:00:01.129970"
                    },
                    {
                        "province": "MP",
                        "wards_no": 17,
                        "coords": [
                            -25.8702116,
                            29.2090598
                        ],
                        "now31": "0:00:01.531155",
                        "now32": "0:00:00.401185",
                        "address": "Main Street, Emalahleni, South Africa",
                        "ward": "83102017",
                        "municipality": "Emalahleni",
                        "now21": "0:00:01.129970"
                    },
                    {
                        "province": "WC",
                        "wards_no": 4,
                        "coords": [
                            -33.3778176,
                            18.3843956
                        ],
                        "now31": "0:00:01.665489",
                        "now32": "0:00:00.535519",
                        "address": "Main Street, Darling 7345, South Africa",
                        "ward": "10105004",
                        "municipality": "Swartland",
                        "now21": "0:00:01.129970"
                    }
                ]
            }
        },
        {
            "request": {
                "method": "GET",
                "url": "https://maps.googleapis.com/maps/api/geocode/json",
                "params": [
                    {"name":"address", "value": '21 conduit street south africa'},
                    {"name":"sensor","value":"false"}
                ]
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
                "params": [
                    {"name":"address", "value": 'main street south africa'},
                    {"name":"sensor","value":"false"}
                ]
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
