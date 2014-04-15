di.pushmessage = function() {
    var _ = require('lodash');
    var vumigo = require('vumigo_v02');
    var utils = vumigo.utils;
    var Extendable = utils.Extendable;
    var get_push_message_copy = require('./pushmessage.copy');

    Date.prototype.addDays = function(days)
    {
        var dat = new Date(this.valueOf());
        dat.setDate(dat.getDate() + days);
        return dat;
    };

    var PushMessageApi = Extendable.extend(function(self, im, app, opts) {
        var push_messages = get_push_message_copy(app.$);

        self.new_week_day_code = ['T','Th','S'];

        self.rerandomize_week_day = function() {
            if (_.isUndefined(app.contact.extra.new_week_day)) {
                var index = app.random(0,2,false);
                app.contact.extra.new_week_day =  self.new_week_day_code[index];
            }
        };

        self.get_push_start_date = function() {
            //Date deployed - Based on Matthew's comment in push document
            var push_start_date = new Date(app.im.config.panel_push_start);

            //Get actual week start date
            var day_index = push_start_date.getDay();
            var new_week_day_index =  _.indexOf(app.week_day_code,app.contact.extra.new_week_day);
            var days_till_start = (day_index + 7 - new_week_day_index) % 7;
            var start_date = push_start_date.addDays(days_till_start);
            return start_date;
        };

        self.calculate_push_dates = function() {

            //Get start date of push messages for particular user.
            var start_date = self.get_push_start_date();

            //Stores differences since start date in config.
            var panel_differences = JSON.parse(app.im.config.panel_messages);
            var thermometer_differences = JSON.parse(app.im.config.thermometer_messages);

            //Map the day differences to actual dates
            self.panel_dates = _.map(panel_differences,function(diff) {
                return start_date.addDays(diff);
            });

            //Map the day differences to actual dates
            self.pre_thermometer_dates = _.map(thermometer_differences,function(diff) {
                return start_date.addDays(diff);
            });
        };

        self.should_push = function() {
            //If user is not part of monitoring group then return false
            if (!app.is(app.contact.extra.monitoring_group) || app.get_date() > app.im.config.push_end_date) {
                return false;
            }

            //Calculate the push dates
            self.calculate_push_dates();

            //If it is one of the push days;
            return self.is_push_day('panel',self.panel_dates,1)
                || self.is_push_day('panel',self.panel_dates,2)
                || self.is_push_day('pre_thermometer',self.thermometer_dates,1)
                || self.is_push_day('panel',self.panel_dates,3)
                || self.is_push_day('pre_thermometer',self.thermometer_dates,2);
        };

        self.get_push_msg = function() {
            //Calculate the push dates
            self.calculate_push_dates();

            //Return panel question msg
            for (var i=0; i < self.panel_dates.length; i++) {
                if (self.is_push_day('panel',self.panel_dates,i+1)) {
                    return self.get_panel_msg(i+1);
                }
            }

            //Return thermometer question msg
            for (i=0; i < self.pre_thermometer_dates.length; i++) {
                if (self.is_push_day('pre_thermometer',self.pre_thermometer_dates,i+1)) {
                    return self.get_thermometer_msg(i+1);
                }
            }
        };

        self.get_panel_msg = function(push_num) {
            //Which USSD incentive is used?
            var billing_code = app.im.config.billing_code;

            //Which message should be sent for this push group?
            var message_num = app.contact.extra['sms_' + push_num];
            var message = push_messages.panel_questions[message_num-1][billing_code];

            //Returns push message
            return {
               question: message,
               type: 'panel',
               push_num: push_num
            };
        };

        self.get_thermometer_msg = function(push_num) {
            //Which USSD incentive is used?
            var billing_code = app.im.config.billing_code;

            //Which message should be sent for this push group?
            var message_num = push_num-1;
            var message = push_messages.thermometer_questions[message_num][billing_code];

            //Returns push message
            return {
                question: message,
                type: 'preelection_thermometer',
                push_num: push_num
            };
        };

        self.is_push_day = function(type,dates,num) {
            return (
                _.isUndefined(app.contact['it_'+type+'_round_'+num])
                    && dates[num-1] >= app.get_date()
                );
        };

        self.get_push_field = function(type,num) {
            return [type,'round',num].join('_');
        };

        self.is_day_of_week = function(week_day) {
            var day_of_week = app.get_date().getDay();
            return (app.week_day_code[day_of_week] === week_day );
        };
    });
    return {
        PushMessageApi: PushMessageApi
    };
}();