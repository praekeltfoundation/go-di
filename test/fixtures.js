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
                "data": {
                    "province": "GT",
                    "coords": [
                        "27.97532",
                        "-26.02674"
                    ],
                    "now31": "0:00:00.718923",
                    "now32": "0:00:00.015597",
                    "address": "21 conduit street, johannesburg north",
                    "ward": "79400094",
                    "ward_no": "94",
                    "municipality": "City of Johannesburg",
                    "now21": "0:00:00.703326"
                }
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
            "request" :{
                "url": "https://godi.crowdmap.com/api",
                "method": "POST",
                "headers": {
                    "Content-Type": ["x-www-form-urlencoded"]
                },
                "body": [
                    "task=report",
                    "incident_title=test" ,
                    "incident_description=description" ,
                    "incident_category=1",
                    "incident_date=03%2F16%2F2014" ,
                    "incident_hour=0" ,
                    "incident_minute=0" ,
                    "incident_ampm=am" ,
                    "latitude=-26.0701361" ,
                    "longitude=27.9946541" ,
                    "location_name=21%20Conduit%20Street%2C%20Sandton%202191%2C%20South%20Africa"
                ].join('&')
            },
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