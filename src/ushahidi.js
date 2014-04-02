di.ushahidi = function() {
    /**
     * Created by Jade on 2014/03/16.
     */
    var _ = require('lodash');
    var vumigo = require('vumigo_v02');
    var querystring = require("querystring");
    var HttpApi = vumigo.http.api.HttpApi;

    var UshahidiApi = HttpApi.extend(function(self, im, opts) {

        opts = _.defaults(opts || {}, {headers: {}});
        opts.headers['Content-Type'] = ['application/x-www-form-urlencoded'];

        var default_place = {
            geometry: {
                location: {
                    lat: 90,
                    lng: 0
                }
            },
            formatted_address:"unknown"
        };

        HttpApi.call(self, im, opts);

        self.decode_response_body = function(body) {
            return JSON.parse(body);
        };

        self.encode_request_data = function(data) {
            return querystring.encode(data);
        };

        self.get_formatted_date = function(date) {
            var month = date.getMonth() + 1;
            var day = date.getDate();
            var year =  date.getFullYear();
            return ([
                (month <10) ? "0" + month  : month ,
                (day < 10) ? "0" + day     : day,
                year
            ].join('/'));
        };

        self.post_report = function(url, opts) {
            var task = opts.task;
            var incident = opts.incident;
            var place = opts.place || default_place;
            var date = opts.date;
            return self.post(url, {
                "data": {
                    "task": task,
                    "incident_title": incident.title,
                    "incident_description": incident.description,
                    "incident_category": incident.category,
                    "incident_date":self.get_formatted_date(date),
                    "incident_hour": date.getHours() % 12,
                    "incident_minute": date.getMinutes(),
                    "incident_ampm": (date.getHours() < 12 ? 'am': 'pm'),
                    "latitude": place.geometry.location.lat ,
                    "longitude": place.geometry.location.lng ,
                    "location_name": place.formatted_address
                }
            });
        };

        self.ushahidi_get = function(url, opts) {
            return self.get(url,{
                "data": {
                    "task": opts.task
                }
            });
        };

        self.get_reports = function(url) {
            return self.ushahidi_get(url,"report");
        };

        self.get_categories = function(url) {
            return self.ushahidi_get(url,"categories");
        };
    });

    return {
        UshahidiApi: UshahidiApi
    };
}();
