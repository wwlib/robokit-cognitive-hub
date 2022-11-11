import AbstractSkillSessionHandler, { SkillSessionHandlerCallbackType } from './AbstractSkillSessionHandler'

export default class CloudSkillSessionHandler extends AbstractSkillSessionHandler {

    constructor(callback: SkillSessionHandlerCallbackType, skillData: any) {
        super(callback, skillData)
    }

    onEvent(event: any) {
        switch (event.event) {
            case 'asrEnded':
                break;
        }
    }
}
