di.push_check_app_states = function() {
    var vumigo = require('vumigo_v02');
    var _ = require('lodash');
    var App = vumigo.App;
    var AppStates = vumigo.app.AppStates;

    var PushCheckAppStates = AppStates.extend(function(self,app,opts) {
        AppStates.call(self, app);

        self.super_create =  self.create;
        self.create = function(name,opts) {
            //Check if dummy message
            var msg = app.im.msg;
            if (_.isUndefined(msg.push_message_trigger)) {
                return self.super_create(name,opts);
            } else {
                self.pushmessage = new PushMessageApi();
                return self.pushmessage.send_push_message();
            }

        };
    });

    return {
        PushCheckAppStates: PushCheckAppStates
    };
}();