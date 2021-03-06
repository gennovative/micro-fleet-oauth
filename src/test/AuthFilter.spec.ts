import * as path from 'path'

import * as chai from 'chai'
import * as spies from 'chai-spies'
chai.use(spies)
const expect = chai.expect
import * as request from 'request-promise'
import { StatusCodeError } from 'request-promise/errors'
import jwt = require('jsonwebtoken')
import { decorators as d, DependencyContainer, serviceContext,
    IConfigurationProvider, Maybe, Types as CmT, constants, PrimitiveType } from '@micro-fleet/common'
import { ExpressServerAddOn, ControllerCreationStrategy,
    Types as wT } from '@micro-fleet/web'

import { AuthorizeFilter, AuthAddOn, Types as T } from '../app'

// We need `delay` in Bluebird Promise
import * as Bluebird from 'bluebird'

type SignFunction = (payload: any, secretOrPrivateKey: jwt.Secret, options: jwt.SignOptions) => Bluebird<string>
const jwtSignAsync: SignFunction = Bluebird.promisify(jwt.sign) as any

const { Auth: A } =  constants

const URL = 'http://localhost',
    AUTH_SECRET = 'abcABC123',
    AUTH_ISSUER = 'localhost',
    AUTH_EXPIRE = 3 // 3 secs

@d.injectable()
class MockConfigurationProvider implements IConfigurationProvider {
    public readonly name: string = 'MockConfigurationProvider'
    public readonly configFilePath: string = ''

    public enableRemote: boolean = false

    public get(key: string): Maybe<PrimitiveType | any[]> {
        switch (key) {
            case A.AUTH_KEY_VERIFY:
                return Maybe.Just(AUTH_SECRET)
            case A.AUTH_ISSUER:
                return Maybe.Just(AUTH_ISSUER)
        }
        return Maybe.Nothing()
    }

    public init = () => Promise.resolve()
    public deadLetter = () => Promise.resolve()
    public dispose = () => Promise.resolve()
    public onUpdate = (listener: (changedKeys: string[]) => void) => { /* Empty */ }
    public fetch = () => Promise.resolve(true)

}

describe('AuthFilter', function() {
    this.timeout(5000)
    // this.timeout(60000) // For debugging

    let server: ExpressServerAddOn
    let container: DependencyContainer

    beforeEach(() => {
        container = new DependencyContainer
        serviceContext.setDependencyContainer(container)
        container.bindConstant(CmT.DEPENDENCY_CONTAINER, container)
        container.bindConstructor(CmT.CONFIG_PROVIDER, MockConfigurationProvider).asSingleton()
        container.bindConstructor(T.AUTH_ADDON, AuthAddOn).asSingleton()
        container.bindConstructor(wT.WEBSERVER_ADDON, ExpressServerAddOn).asSingleton()

        server = container.resolve(wT.WEBSERVER_ADDON)
        server.controllerPath = path.join(process.cwd(), 'dist', 'test', 'shared', 'responding-controller')

    })

    afterEach(async () => {
        container.dispose()
        await server.dispose()
        container = server = null
    })

    describe('execute', () => {
        it('Should add decrypted value from auth token to request params', (done: Function) => {
            // Arrange
            const payload = {
                accountId: '123',
                username: 'testuser',
            }

            let authToken: string

            jwtSignAsync(payload, AUTH_SECRET,
                {
                    issuer: AUTH_ISSUER,
                })
                .then((token: string) => {
                    authToken = token
                    server.controllerPath = path.join(process.cwd(), 'dist', 'test', 'shared', 'passthrough-controller')
                    server.controllerCreation = ControllerCreationStrategy.SINGLETON
                    server.addGlobalFilter(AuthorizeFilter)
                    return server.init()
                })
                .then(() => {
                    const authAddon = container.resolve(T.AUTH_ADDON) as AuthAddOn
                    return authAddon.init()
                })
                .then(() => {
                    // Act
                    return request(URL, {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                        },
                    })
                })
                .then((res) => {
                    const controller: any = container.resolve('PassthroughController')
                    // Assert: req['user'].accountId == payload.accountId
                    // and req['user'].username == payload.username
                    expect(controller['spyFn']).to.be.called.with(payload.accountId, payload.username)
                })
                .catch((error: any) => {
                    console.error(error)
                    expect(false, 'Should never throw this kind of error!').to.be.true
                })
                .finally(() => done())
        })

        it('Should response with 401 status code if no Authorization header', (done: Function) => {
            // Arrange
            const spyMiddleware = chai.spy()

            server.addGlobalFilter(AuthorizeFilter)
            server.init()
            .then(() => {
                const authAddon = container.resolve(T.AUTH_ADDON) as AuthAddOn
                return authAddon.init()
            })
            .then(() => {
                server.express.use(spyMiddleware)
                // Act
                return request(URL)
            })
            .then(() => {
                expect(false, 'Should never come here!').to.be.true
            })
            .catch((error: any) => {
                if (error instanceof StatusCodeError) {
                    expect(spyMiddleware).not.to.be.called
                    expect(error.statusCode).to.equal(401)
                    expect(error.message).to.include('No auth token')
                } else {
                    console.error(error)
                    expect(false, 'Should never throw this kind of error!').to.be.true
                }
            })
            .finally(() => done())
        })

        it('Should response with 401 status code if auth token has expired', (done: Function) => {
            // Arrange
            const spyMiddleware = chai.spy()
            const payload = {
                accountId: '123',
                username: 'testuser',
            }

            let authToken: string

            jwtSignAsync(payload, AUTH_SECRET,
                {
                    expiresIn: 3,
                    issuer: AUTH_ISSUER,
                })
                .then((token: string) => {
                    authToken = token
                    server.addGlobalFilter(AuthorizeFilter)
                    return server.init()
                })
                .then(() => {
                    const authAddon = container.resolve(T.AUTH_ADDON) as AuthAddOn
                    return authAddon.init()
                })
                .delay(1000 * (AUTH_EXPIRE + 1))
                .then(() => {
                    server.express.use(spyMiddleware)
                    // Act
                    return request(URL, {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                        },
                    })
                })
                .then(() => {
                    expect(false, 'Should never come here!').to.be.true
                })
                .catch((error: any) => {
                    if (error instanceof StatusCodeError) {
                        expect(spyMiddleware).not.to.be.called
                        expect(error.statusCode).to.equal(401)
                        expect(error.message).to.include('jwt expired')
                    } else {
                        console.error(error)
                        expect(false, 'Should never throw this kind of error!').to.be.true
                    }
                })
                .finally(() => done())
        })

        it('Should response with 401 status code if auth token cannot be decrypted', (done: Function) => {
            // Arrange
            const spyMiddleware = chai.spy()
            const payload = {
                accountId: '123',
                username: 'testuser',
            }

            // Encrypt with different key, so that the AuthFilter cannot decrypt.
            const tamperSecret = AUTH_SECRET + 'abc'

            let authToken: string

            jwtSignAsync(payload, tamperSecret,
                {
                    issuer: AUTH_ISSUER,
                })
                .then((token: string) => {
                    authToken = token
                    server.addGlobalFilter(AuthorizeFilter)
                    return server.init()
                })
                .then(() => {
                    const authAddon = container.resolve(T.AUTH_ADDON) as AuthAddOn
                    return authAddon.init()
                })
                .then(() => {
                    server.express.use(spyMiddleware)
                    // Act
                    return request(URL, {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                        },
                    })
                })
                .then(() => {
                    expect(false, 'Should never come here!').to.be.true
                })
                .catch((error: any) => {
                    if (error instanceof StatusCodeError) {
                        expect(spyMiddleware).not.to.be.called
                        expect(error.statusCode).to.equal(401)
                        expect(error.message).to.include('invalid signature')
                    } else {
                        console.error(error)
                        expect(false, 'Should never throw this kind of error!').to.be.true
                    }
                })
                .finally(() => done())
        })

        it('Should response with 401 status code if unknown error occurs', (done: Function) => {
            // Arrange
            const spyMiddleware = chai.spy()
            const payload = {
                accountId: '123',
                username: 'testuser',
            }

            let authToken: string

            jwtSignAsync(payload, AUTH_SECRET,
                {
                    issuer: AUTH_ISSUER,
                })
                .then((token: string) => {
                    authToken = token
                    server.addGlobalFilter(AuthorizeFilter)
                    return server.init()
                })
                .then(() => {
                    const authAddon = container.resolve(T.AUTH_ADDON) as AuthAddOn
                    let authFilter: any
                    if (container.isBound(AuthorizeFilter.name)) {
                        authFilter = container.resolve(AuthorizeFilter.name)
                    } else {
                        authFilter = AuthorizeFilter['__instance']
                    }
                    authFilter['_authAddon']['authenticate'] = function() {
                        throw new Error('Intentionally thrown from Unit test')
                    }
                    return authAddon.init()
                })
                .then(() => {
                    server.express.use(spyMiddleware)
                    // Act
                    return request(URL, {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                        },
                    })
                })
                .then(() => {
                    expect(false, 'Should never come here!').to.be.true
                })
                .catch((error: any) => {
                    if (error instanceof StatusCodeError) {
                        expect(spyMiddleware).not.to.be.called
                        expect(error.statusCode).to.equal(401)
                        expect(error.message).to.include('Unauthorized')
                    } else {
                        console.error(error)
                        expect(false, 'Should never throw this kind of error!').to.be.true
                    }
                })
                .finally(() => {
                    // Clean up this singleton instance,
                    // forcing other tests to re-create it.
                    AuthorizeFilter['__instance'] = null
                    done()
                })
        })

    })
})
