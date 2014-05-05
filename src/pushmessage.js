di.pushmessage = function() {
    var _ = require('lodash');
    var vumigo = require('vumigo_v02');
    var Q = require('q');
    var utils = vumigo.utils;
    var Extendable = utils.Extendable;
    var get_push_message_copy = di.copies.pushmessage;


    Date.prototype.addDays = function(days)
    {
        var dat = new Date(this.valueOf());
        dat.setDate(dat.getDate() + days);
        return dat;
    };

    var PushMessageApi = Extendable.extend(function(self, im, app, opts) {
        var push_messages = get_push_message_copy();
        self.new_week_day_code = ['T','Th','S'];

        app.on('setup', function() {
            return self.init();
        });

        self.rerandomize = function() {

            return app
                .get_group_config()
                .spread(function(ward_treatment, push_message_group) {
                    if (app.is(app.im.msg.inbound_push_trigger)) {
                        if (_.isUndefined(app.contact.extra.new_week_day)) {
                            var index = app.random(0,2,false);
                            app.contact.extra.new_week_day =  self.new_week_day_code[index];
                        }

                        if (_.isUndefined(app.contact.extra.ward)
                            || app.contact.extra.ward === "unknown") {

                            app.contact.extra.monitoring_group = 'true';
                            app.contact.extra.generated_group = 'true';
                            var push_group = app.random(1,30);
                            var per_sms_group = push_message_group[push_group];
                            app.contact.extra.push_group= push_group.toString();
                            app.contact.extra.sms_1= per_sms_group.sms_1;
                            app.contact.extra.sms_2= per_sms_group.sms_2;
                            app.contact.extra.sms_3= per_sms_group.sms_3;
                        }
                    }
                });
        };

        self.get_push_start_date = function() {
            //Date deployed - Based on Matthew's comment in push document
            var push_start_date = new Date(app.im.config.panel_push_start);

            //Get actual week start date
            var day_index = push_start_date.getDay();
            var new_week_day_index =  _.indexOf(app.week_day_code,app.contact.extra.new_week_day);
            var days_till_start = (new_week_day_index  + 7 - day_index) % 7;
            var start_date = push_start_date.addDays(days_till_start);
            return start_date;
        };

        self.calculate_push_dates = function() {

            //Get start date of push messages for particular user.
            var start_date = self.get_push_start_date();

            //Map the day differences to actual dates
            self.panel_dates = _.map(app.im.config.panel_messages,function(diff) {
                return start_date.addDays(diff);
            });

            //Map the day differences to actual dates
            self.pre_thermometer_dates = _.map(app.im.config.thermometer_messages,function(diff) {
                return start_date.addDays(diff);
            });
        };

        self.should_push = function() {

            //Check if delivery class is the same
            if (app.is_delivery_class("sms") || app.is_delivery_class("ussd")) {
                if (app.contact.extra.delivery_class !== 'ussd') {
                    return false;
                }
            } else if(app.contact.extra.delivery_class !== app.im.config.delivery_class) {
                return false;
            }

            //If the app can't push then return false
            if ( !app.is(app.im.config.can_push)) {
                return false;
            }

            if (app.is(app.contact.extra.monitoring_group)
                && app.get_date() <= new Date(app.im.config.push_end_date)) {
                //Phase 2
                return self.is_push_day('panel',self.panel_dates,1)
                    || self.is_push_day('panel',self.panel_dates,2)
                    || self.is_push_day('pre_thermometer',self.pre_thermometer_dates,1)
                    || self.is_push_day('panel',self.panel_dates,3)
                    || self.is_push_day('pre_thermometer',self.pre_thermometer_dates,2);
            } else {
                //Phase 3
                return self.is_voting_experience_quiz_day()
                || self.should_receive_group_c_quiz();
            }
        };

        self.should_receive_group_c_quiz = function() {
            return self.is_group_c_quiz_day() && self.in_group_c();
        };

        self.get_push_state = function() {
            if (self.is_voting_experience_quiz_day()) {
                return 'states:push:voting_turnout';
            } else if (self.should_receive_group_c_quiz()) {
                return 'states:push:group_c_turnout';
            } else {
                return 'states:push:start';
            }
        };

        self.in_group_c = function() {
            return app.contact.extra.c0 ==='yes'
                || app.contact.extra.c1 ==='yes'
                || app.contact.extra.c2 ==='yes' ;
        };

        self.is_voting_experience_quiz_day = function() {
            return self.is_push_day('voting_turnout', new Date(app.im.config.voting_turnout_push_day));
        };

        self.is_group_c_quiz_day = function() {
            return self.is_push_day('group_c', new Date(app.im.config.group_c_push_day));
        };

        self.get_push_msg = function() {

            //Return panel question msg
            for (var i=0; i < self.panel_dates.length; i++) {
                if (self.is_date(self.panel_dates[i])) {
                    return self.get_panel_msg(i+1);
                }
            }

            //Return thermometer question msg
            for (i=0; i < self.pre_thermometer_dates.length; i++) {
                if (self.is_date(self.pre_thermometer_dates[i])) {
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
                type: 'pre_thermometer',
                push_num: push_num
            };
        };

        self.is_date = function(date) {
            return date.getDate() === app.get_date().getDate()
            && date.getMonth() === app.get_date().getMonth()
            && date.getFullYear() === app.get_date().getFullYear();
        };

        self.is_push_day = function(type,dates,num) {
            if (_.isArray(dates)) {
                return (
                    _.isUndefined(app.contact.extra['it_'+type+'_round_'+num])
                        && self.is_date(dates[num-1])
                    );
            } else {
                return (
                    _.isUndefined(app.contact.extra['it_'+type+'_round_1'])
                        && self.is_date(dates)
                    );
            }
        };

        self.get_push_field = function(type,num) {
            return [type,'round',num].join('_');
        };

        self.is_day_of_week = function(week_day) {
            var day_of_week = app.get_date().getDay();
            return (app.week_day_code[day_of_week] === week_day );
        };

        self.set_language = function() {
            if (_.isNull(app.im.user.lang)) {
                app.contact.extra.lang = 'default_en';
                return app.im.user.set_lang('en');
            } else if (_.isUndefined(app.contact.extra.lang)) {
                app.contact.extra.lang = app.im.user.lang;
                return Q();
            }
        };

        self.init = function() {
            return self
                .rerandomize()
                .then(function() {
                    self.calculate_push_dates();
                    return self.set_language();
                })
                .then(function() {
                    return app.im.contacts.save(app.contact);
                });
        };
    });
    return {
        PushMessageApi: PushMessageApi
    };
}();