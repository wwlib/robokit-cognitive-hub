/**
 * EchoSkillSessionHandler is a trivial example implementation of AbstractSkillSessionHandler.
 * It echos the teck of any message it receives. i.e. "you said, <ORIGINAL_TEXT>"
 *
 * @module
 */

 import { AbstractSkillSessionHandler, SkillSessionHandlerCallbackType } from './AbstractSkillSessionHandler'

export class EchoSkillSessionHandler extends AbstractSkillSessionHandler {

    constructor(callback: SkillSessionHandlerCallbackType, skillData: any, deviceAccountId: string, devicePassword: string) {
        super(callback, skillData, deviceAccountId, devicePassword)
    }

    /** onEvent A rudimentary skill example that generates an appropriate response. Should also respond to NLU events rather than ASR events. */
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
