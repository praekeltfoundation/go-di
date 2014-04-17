di.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var DiSmsApp = di.base.DiSmsApp;

    return {
        im: new InteractionMachine(api, new DiSmsApp())
    };
}();