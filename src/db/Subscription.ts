export type SubscriptionEventCallback = (event: unknown) => void

export default class Subscription {
    private _accountId: string
    private _subscriberAccountId: string
    private _eventCallback: SubscriptionEventCallback | undefined
    private _eventCount: number
    private _lastEventTimestamp: number

    constructor(accountId: string, subscriberAccountId: string, eventCallback: SubscriptionEventCallback) {
        this._accountId = accountId
        this._subscriberAccountId = subscriberAccountId
        this._eventCallback = eventCallback
        this._eventCount = 0
        this._lastEventTimestamp = 0
    }

    onEvent(event: unknown) {
        if (this._eventCallback) {
            this._eventCount += 1
            this._lastEventTimestamp = new Date().getTime()
            this._eventCallback(event)
        }
    }

    dispose() {
        this._eventCallback = undefined
    }
}