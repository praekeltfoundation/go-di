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
        }
    ];
};