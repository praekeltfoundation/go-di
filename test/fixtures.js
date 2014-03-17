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
        }
    ];
};