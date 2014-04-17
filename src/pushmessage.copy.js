/**
 * Created by Jade on 2014/04/11.
 */
di.copies = {};

di.copies.pushmessage = function() {
    var vumigo = require('vumigo_v02');
    var $ = new vumigo.translate.LazyTranslator();
    return {
        panel_questions: [
            {
                end_user: $('panel_question_1_end_user'),
                incentive: $('panel_question_1_incentive'),
                reverse_billed: $('panel_question_1_reverse_billed')
            },
            {
                end_user: $('panel_question_2_end_user'),
                incentive: $('panel_question_2_incentive'),
                reverse_billed: $('panel_question_2_reverse_billed')
            },
            {
                end_user: $('panel_question_3_end_user'),
                incentive: $('panel_question_3_incentive'),
                reverse_billed: $('panel_question_3_reverse_billed')
            },
            {
                end_user: $('panel_question_4_end_user'),
                incentive: $('panel_question_4_incentive'),
                reverse_billed: $('panel_question_4_reverse_billed')
            },
            {
                end_user: $('panel_question_5_end_user'),
                incentive: $('panel_question_5_incentive'),
                reverse_billed: $('panel_question_5_reverse_billed')
            },
            {
                end_user: $('panel_question_6_end_user'),
                incentive: $('panel_question_6_incentive'),
                reverse_billed: $('panel_question_6_reverse_billed')
            }
        ],
        thermometer_questions: [
            {
                end_user: $('thermometer_question_1_end_user'),
                incentive: $('thermometer_question_1_incentive'),
                reverse_billed: $('thermometer_question_1_reverse_billed')
            },
            {
                end_user: $('thermometer_question_2_end_user'),
                incentive: $('thermometer_question_2_incentive'),
                reverse_billed: $('thermometer_question_2_reverse_billed')
            },
            {
                end_user: $('thermometer_question_3_end_user'),
                incentive: $('thermometer_question_3_incentive'),
                reverse_billed: $('thermometer_question_3_reverse_billed')
            },
            {
                end_user: $('thermometer_question_4_end_user'),
                incentive: $('thermometer_question_4_incentive'),
                reverse_billed: $('thermometer_question_4_reverse_billed')
            },
            {
                end_user: $('thermometer_question_5_end_user'),
                incentive: $('thermometer_question_5_incentive'),
                reverse_billed: $('thermometer_question_5_reverse_billed')
            }
        ]
    };
};