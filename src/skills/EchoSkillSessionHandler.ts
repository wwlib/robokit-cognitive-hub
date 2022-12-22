import AbstractSkillSessionHandler, { SkillSessionHandlerCallbackType } from './AbstractSkillSessionHandler'

export default class EchoSkillSessionHandler extends AbstractSkillSessionHandler {

    constructor(callback: SkillSessionHandlerCallbackType, skillData: any, deviceAccountId: string, devicePassword: string) {
        super(callback, skillData, deviceAccountId, devicePassword)
    }

    onEvent(event: any) {
        switch (event.event) {
            case 'asrEnd':
                this._callback('reply', {
                    source: 'RCH:EchoSkillSessionHandler',
                    event: 'reply',
                    skillId: this._skillId,
                    skillPriority: this._skillPriority,
                    data: { reply: `you said, ${event.data.text}` }
                })
                break;
            case 'nluEnd':
                console.log(`EchoSkillSessionHandler: onNluEnd:`, event)
                break;
        }
    }
}
