di.push_message = function() {
    var _ = require('lodash');
    var vumigo = require('vumigo_v02');
    var utils = vumigo.utils;
    var Extendable = utils.Extendable;
    var get_push_message_copy = require('./pushmessage.copy');
    var FreeText = vumigo.states.FreeText;

    Date.prototype.addDays = function(days)
    {
        var dat = new Date(this.valueOf());
        dat.setDate(dat.getDate() + days);
        return dat;
    };

    var PushMessageApi = Extendable.extend(function(self, im, app, opts) {
        var $ = app.$;
        var contact = app.contact;
        var push_messages = get_push_message_copy();

        self.send_push_message = function() {
            return self.send_panel_questions();
        };

        self.send_panel_questions = function() {
            //Stores differences since start date in config, since spec is set up that way.
            var start_date = Date.parse(app.im.config.panel_push_start);
            var panel_days_diff = self.im.config.panel_messages;

            //Map the day differences to actual dates
            self.panel_question_dates = _(panel_days_diff).map(function(diff) {
                return start_date.addDays(diff);
            });

            //if the contact is in the monitoring group and is it the day of the week then
            if (app.is(app.contact.monitoring_group) && self.is_day_of_week(app.contact.week_day)) {
                //Which push message num is to be sent
                var push_num = self.get_push_num();

                //Which USSD incentive is used?
                var billing_code = app.im.config.billing_code;

                //Which message should be sent for this push group?
                var message_num = app.contact.extra['sms_' + push_num];
                var message = push_messages.panel_questions[message_num][billing_code];

                //Send user to the question state
                //This uses app.states.create
                //Thus wont work
                return app.states.create('states:push:question',{
                    creator_opts: {
                       question: message,
                       type: 'panel',
                       push_num: push_num
                    }
                });
            }
        };

        self.send_preelection_thermometer_questions = function() {
            var start_date = Date.parse(app.im.config.panel_push_start);
            var thermometer_days_diff = self.im.config.thermometer_messages;

            //Map the day differences to actual dates
            self.thermometer_dates = _(thermometer_days_diff).map(function(diff) {
                return start_date.addDays(diff);
            });


            //if the contact is in the monitoring group and is it the day of the week then
            if (app.is(app.contact.monitoring_group) && self.is_day_of_week(app.contact.week_day)) {
                //Which push message num is to be sent
                var push_num = self.get_push_num();

                //Which USSD incentive is used?
                var billing_code = app.im.config.billing_code;

                //Which message should be sent for this push group?
                var message_num = app.contact.extra['sms_' + push_num];
                var message = push_messages.panel_questions[message_num][billing_code];

                //Send the message
                return app.states.create('states:push:panel:question',{

                });
            }
        };

        app.states.add('states:push:question',function(name,opts) {
            var question = opts.question;
            var type = opts.type;
            var push_num = opts.push_num;

            return new FreeText(name, {
                question: question,
                next: function(content) {
                    //Handle reply
                    var contact_field = [
                        'push',
                        type,
                        push_num
                    ].join('_');
                    app.contact.extra[contact_field] = content;
                    app.contact.extra['it_'+contact_field] = app.get_date_string();
                    return app.im.contacts
                        .save(self.contact)
                        .then(function() {
                            return 'states:push:panel:end';
                        });
                }
            });
        });

        app.states.add('states:push:panel:end',function(name,opts) {
            //Redirect to old state.
            return app.states.create('states:end');
        });

        self.is_push_time = function(num) {
            if (num === 0) {
                return _.isUndefined(app.contact.it_push_round_1);
            } else  {
                return _.isUndefined(app.contact['it_push_round_'+(num+1)])
                    && self.panel_question_dates[num] > self.get_date();
            }
        };

        self.get_push_num = function() {
            //if the first push has not been sent
            for (var i=0; i < self.panel_question_dates.length; i++) {
                if (self.is_push_time(i)) {
                    app.contact['it_push_'+i] = self.get_date_string();
                    return i;
                }
            }
        };

        self.is_day_of_week = function(week_day) {
            var day_of_week = app.get_date().getDay();
            return (app.week_day_code[day_of_week] === week_day );
        };

        self.should_send_quiz_push = function(name) {
            return contact.is_registered()
            && _.isUndefined(contact.extra[name+'_complete']);
        };

        self.should_send_location_push = function() {
            return contact.is_registered()
                && _.isUndefined(contact.extra.ward)
                && (self.days_since(contact.extra.it_ward,7)
                || self.days_since(contact.extra.it_ward,14));
        };

        self.has_saved_location = function() {
            return !_.isUndefined(contact.extra.ward);
        };

        self.days_since = function(date,num_days) {
            var current_date = app.get_date();
            var days_diff = Math.floor(( Date.parse(current_date) - Date.parse(num_days) ) / 86400000);
            return days_diff == num_days;
        };

    });
    return {
        PushMessageApi: PushMessageApi
    };
}();