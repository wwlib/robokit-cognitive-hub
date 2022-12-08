import AbstractSkillSessionHandler, { SkillSessionHandlerCallbackType } from './AbstractSkillSessionHandler'

const timeToText = require('convert-time-to-text');

export default class ClockSkillSessionHandler extends AbstractSkillSessionHandler {

    constructor(callback: SkillSessionHandlerCallbackType, skillData: any) {
        super(callback, skillData)
    }

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

    onEvent(event: any) {
        let reply: any
        switch (event.event) {
            case 'asrEnded':
                reply = this.getTimeReply(event.data.text)
                if (reply) {
                    this._callback('reply', reply)
                }
                break;
        }
    }
}
