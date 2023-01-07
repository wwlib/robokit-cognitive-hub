/**
 * ClockSkillSessionHandler is a trivial example implementation of AbstractSkillSessionHandler.
 * It returns the server time in the form of a text reply (should really be the device's local time).
 *
 * @module
 */

import { AbstractSkillSessionHandler, SkillSessionHandlerCallbackType } from './AbstractSkillSessionHandler'

const timeToText = require('convert-time-to-text');

export class ClockSkillSessionHandler extends AbstractSkillSessionHandler {

    constructor(callback: SkillSessionHandlerCallbackType, skillData: any, deviceAccountId: string, devicePassword: string) {
        super(callback, skillData, deviceAccountId, devicePassword)
    }

    /** getTimeReply generates a text reply using `timeToText.convertTimeToText()` */
    getTimeReply(asrText: string): any {
        let reply: any = undefined
        if (asrText) {
            const date = new Date()
            const timeText = timeToText.convertTimeToText(date.getHours(), date.getMinutes())
            if (asrText.toLowerCase().indexOf('what time is it') >= 0) {

                reply = {
                    source: 'RCH:ClockSkillSessionHandler',
                    event: 'reply',
                    skillId: this._skillId,
                    skillPriority: this._skillPriority,
                    data: { reply: `the time is ${timeText}` }
                }
            }
        }
        return reply
    }

    /** onEvent A rudimentary skill example that generates an appropriate response. Should respond to NLU events rather than ASR events. */
    onEvent(event: any) {
        let reply: any
        switch (event.event) {
            case 'asrEnd':
                reply = this.getTimeReply(event.data.text)
                if (reply) {
                    this._callback('reply', reply)
                }
                break;
            case 'nluEnd':
                console.log(`ClockSkillSessionHandler: onNluEnd:`, event)
                // TODO: respond to NLU events rather than ASR events...
                break;
        }
    }
}
