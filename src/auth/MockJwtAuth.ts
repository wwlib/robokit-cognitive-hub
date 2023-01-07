/**
 * MockJwtAuth is a collection of functions for implementing temporary/development (mock) JWT auth & permissions.
 * Note: This is a mock implementation that should be replaced with an auth microservice.
 * At the very least, the keys should be changed.
 * 
 * @module
 */

const jwt = require('jsonwebtoken');

export interface AuthResult {
    access_token: string
    refresh_token: string
    account_id: string
}

export const ACCESS_TOKEN_NAME = 'access_token'
export const REFRESH_TOKEN_NAME = 'refresh_token'

// https://dev.to/franciscomendes10866/using-cookies-with-jwt-in-node-js-8fn
// https://indepth.dev/posts/1382/localstorage-vs-cookies
export class MockJwtAuth {

    static ACCESS_PRIVATE_KEY_MOCK: string = 'RANDOM_TOKEN_SECRET'
    static REFRESH_PRIVATE_KEY_MOCK: string = 'RANDOM_TOKEN_SECRET'
    static ACCESS_TOKEN_EXPIRES_IN: string = '1m'
    static REFRESH_TOKEN_EXPIRES_IN: string = '1d'

    /**
     * signIn is a mock signIn method using ACCESS_PRIVATE_KEY_MOCK to sign tokens.
     * @param accountId 
     * @param password 
     * @returns Returns a Promise<AuthResult>
     */
    static signIn = (accountId: string, password: string): Promise<AuthResult> => {
        return new Promise<any>((resolve, reject) => {
            const accessTokenPayload = MockJwtAuth.getAccessTokenPayload(accountId)
            const refreshTokenPayload = {
                accountId: 'TBD',
            }
            refreshTokenPayload.accountId = accountId
            jwt.sign(accessTokenPayload, MockJwtAuth.ACCESS_PRIVATE_KEY_MOCK, { algorithm: 'HS256', expiresIn: MockJwtAuth.ACCESS_TOKEN_EXPIRES_IN }, function (err: any, accessToken: string) {
                if (err) {
                    reject(err)
                } else {
                    jwt.sign(refreshTokenPayload, MockJwtAuth.REFRESH_PRIVATE_KEY_MOCK, { algorithm: 'HS256', expiresIn: MockJwtAuth.REFRESH_TOKEN_EXPIRES_IN }, function (err: any, refreshToken: string) {
                        if (err) {
                            reject(err)
                        } else {

                            resolve({ access_token: accessToken, refresh_token: refreshToken, account_id: accessTokenPayload.accountId })
                        }
                    })
                }
            })
        })
    }

    /**
     * refresh is a mock refresh method using ACCESS_PRIVATE_KEY_MOCK to sign tokens.
     * @param accountId 
     * @returns Returns a Promise<AuthResult>
     */
    static refresh = (accountId: string): Promise<AuthResult> => {
        return new Promise<any>((resolve, reject) => {
            const accessTokenPayload = MockJwtAuth.getAccessTokenPayload(accountId)
            jwt.sign(accessTokenPayload, MockJwtAuth.ACCESS_PRIVATE_KEY_MOCK, { algorithm: 'HS256', expiresIn: MockJwtAuth.ACCESS_TOKEN_EXPIRES_IN }, function (err: any, accessToken: string) {
                if (err) {
                    reject(err)
                } else {
                    resolve({ access_token: accessToken, account_id: accessTokenPayload.accountId })
                }
            })
        })
    }

    /**
     * getAccessTokenPayload i a mock method to generate access token payload with permissions.
     * @param accountId 
     * @returns Returns the token payload
     */
    static getAccessTokenPayload(accountId: string): any {
        return {
            accountId: accountId,
            auth: {
                permissions: [
                    {
                        scopes: [
                            "read",
                            "admin"
                        ],
                        resource: "example"
                    }
                ]
            }
        }
    }

    /**
     * decodeAccessToken is a mock method for decoding a JWT token.
     * @param token 
     * @param refreshToken 
     * @returns Returns the decoded token payload
     */
    static decodeAccessToken(token: string, refreshToken?: string): any {
        let payload = undefined
        try {
            payload = jwt.verify(token, MockJwtAuth.ACCESS_PRIVATE_KEY_MOCK)
        } catch (error: any) {
            console.log('JWTAuth: decodeAccessToken: handled error Ignoring:', error.message)
            console.log('JWTAuth: refreshToken:', refreshToken)
        }
        return payload
    }

    /**
     * decodeRefreshToken is a a mock method for decoding a JWT token.
     * It works with tokens signed using ACCESS_PRIVATE_KEY_MOCK.
     * @param token 
     * @returns 
     */
    static decodeRefreshToken(token: string): any {
        let payload = undefined
        try {
            payload = jwt.verify(token, MockJwtAuth.REFRESH_PRIVATE_KEY_MOCK)
        } catch (error: any) {
            console.log(`JWTAuth: decodeRefreshToken: handled error Ignoring:`, error.message)
        }
        return payload
    }
}
