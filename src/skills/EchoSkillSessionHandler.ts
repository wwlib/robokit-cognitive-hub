import AbstractSkillSessionHandler, { SkillSessionHandlerCallbackType } from './AbstractSkillSessionHandler'

export default class EchoSkillSessionHandler extends AbstractSkillSessionHandler {

    constructor(callback: SkillSessionHandlerCallbackType, skillData: any) {
        super(callback, skillData)
    }

    onEvent(event: any) {
        switch (event.event) {
            case 'asrEnded':
                this._callback('reply', {
                    event: 'reply',
                    skillId: this._skillId,
                    skillPriority: this._skillPriority,
                    text: `you said, ${event.data.text}`
                })
                break;
        }
    }
}
