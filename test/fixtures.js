/**
 * Created by Jade on 2014/03/11.
 */
module.exports = function() {
    return[
        {
            "request": {
                "method": "GET",
                "url": "http://wards.code4sa.org/",
                "params": [{"name":"address", "value": '21%20conduit%20street'}]
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
                "params": [{"name":"address", "value": 'bad%20input'}]
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