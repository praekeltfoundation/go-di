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
        var contact = app.contact;
        var push_messages = get_push_message_copy(app.$);

        self.new_week_day_code = ['T','Th','S'];

        self.rerandomize_week_day = function() {
            if (_.isUndefined(app.contact.extra.new_week_day)) {
                var index = app.random(0,2,false);
                app.contact.extra.new_week_day =  self.new_week_day_code[index];
            }
            return app.im.contacts.save(app.contact);
        };

        self.get_push_start_date = function() {

            //Date deployed - Based on Matthew's comment in push document
            var push_start_date = new Date(app.im.config.panel_push_start);

            //Get actual week start date
            var day_index = push_start_date.getDay();
            var new_week_day_index =  _.indexOf(self.week_day_code,app.contact.extra.new_week_day);
            var days_till_start = (day_index + 7 - new_week_day_index) % 7;
            var start_date = push_start_date.addDays(days_till_start);
            return start_date;
        };

        self.should_send_push = function() {
            //If user is not part of monitoring group then return false
            if (!app.is(app.contact.extra.monitoring_group) || app.get_date() > app.im.config.push_end_date) {
                return false;
            }

            //Get start date of push messages for particular user.
            var start_date = self.get_push_start_date();

            //Stores differences since start date in config.
            var panel_differences = JSON.parse(app.im.config.panel_messages);
            var thermometer_differences = JSON.parse(app.im.config.thermometer_messages);

            //Map the day differences to actual dates
            var panel_dates = _.map(panel_differences,function(diff) {
                return start_date.addDays(diff);
            });

            //Map the day differences to actual dates
            var thermometer_dates = _.map(thermometer_differences,function(diff) {
                return start_date.addDays(diff);
            });

            self.panel_dates = panel_dates;
            self.pre_thermometer_dates = thermometer_dates;

            //If it is one of the push days;
            return self.is_push_day('panel',panel_dates,1)
                || self.is_push_day('panel',panel_dates,2)
                || self.is_push_day('pre_thermometer',thermometer_dates,1)
                || self.is_push_day('panel',panel_dates,3)
                || self.is_push_day('pre_thermometer',thermometer_dates,2);
        };

        self.get_push_message = function() {
            //Return panel question msg
            for (var i=0; i < self.panel_dates; i++) {
                if (self.is_push_day('panel',self.panel_dates,i+1)) {
                    return self.get_panel_msg(i+1);
                }
            };

            //Return thermometer question msg
            for (var i=0; i < self.pre_thermometer_dates; i++) {
                if (self.is_push_day('pre_thermometer',self.pre_thermometer_dates,i+1)) {
                    return self.get_thermometer_msg(i+1);
                }
            };

            return null;
        };

        //Gets msg for panel push
        self.get_panel_msg = function(push_num) {
            //Which USSD incentive is used?
            var billing_code = app.im.config.billing_code;

            //Which message should be sent for this push group?
            var message_num = app.contact.extra['sms_' + push_num];
            var message = push_messages.panel_questions[message_num][billing_code];

            //Returns correct state
            return {
                name: 'states:push:question',
                creator_opts: {
                   question: message,
                   type: 'panel',
                   push_num: push_num
                }
            };
        };

        //Gets msg for panel push
        self.get_thermometer_msg = function(push_num) {
            //Which USSD incentive is used?
            var billing_code = app.im.config.billing_code;

            //Which message should be sent for this push group?
            var message_num = push_num-1;
            var message = push_messages.thermometer_questions[message_num][billing_code];

            //Send the message
            return {
                name: 'states:push:question',
                creator_opts: {
                    question: message,
                    type: 'preelection_thermometer',
                    push_num: push_num
                }
            };
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

        self.is_push_day = function(type,dates,num) {
            return (
                _.isUndefined(app.contact['it_'+type+'_round_'+num])
                    && dates[num-1] >= self.get_date()
                );
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