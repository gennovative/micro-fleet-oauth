import jwt = require('jsonwebtoken')
import * as passport from 'passport'
import * as passportJwt from 'passport-jwt'
import { decorators as d, Types as cmT, IConfigurationProvider,
    constants, IServiceAddOn} from '@micro-fleet/common'
import { ExpressServerAddOn, Types as wT } from '@micro-fleet/web'


const ExtractJwt = passportJwt.ExtractJwt
const JwtStrategy = passportJwt.Strategy
const { Auth: A } = constants

export type AuthResult = {
    payload: any,
    info: any,
    status: any
}

@d.injectable()
export class AuthAddOn implements IServiceAddOn {

    public readonly name: string = 'AuthAddOn'

    constructor(
        @d.inject(wT.WEBSERVER_ADDON) private _serverAddOn: ExpressServerAddOn,
        @d.inject(cmT.CONFIG_PROVIDER) private _configProvider: IConfigurationProvider,
    ) {
    }


    //#region Init

    /**
     * @memberOf IServiceAddOn.init
     */
    public init(): Promise<void> {
        this._serverAddOn.express.use(passport.initialize())

        const opts: passportJwt.StrategyOptions = {
            algorithms: ['HS256'],
            secretOrKey: this._configProvider.get(A.AUTH_KEY_VERIFY).value as string,
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            issuer: this._configProvider.get(A.AUTH_ISSUER).value as string,
        }
        this.initToken(opts)
        return Promise.resolve()
    }

    private initToken(opts: passportJwt.StrategyOptions): void {
        // `payload` is decrypted from Access token from header.
        const strategy = new JwtStrategy(opts, (payload, done) => {
            // TODO: 1. Validate payload object
            // Optional: Log timestamp for statistics purpose
            done(null, payload)
        })
        passport.use('jwt', strategy)
    }

    //#endregion Init


    public authenticate(request: any, response: any, next: Function): Promise<AuthResult> {
        return new Promise<any>((resolve, reject) => {
            passport.authenticate('jwt', (error, payload, info, status) => {
                if (error) {
                    return reject(error)
                }
                resolve({ payload, info, status })
            })(request, response, next)
        })
    }

    public createToken(payload: any, isRefresh: Boolean): Promise<string> {
        const refreshExpr = this._configProvider.get(A.AUTH_EXPIRE_REFRESH).tryGetValue('30d') as number | string
        const accessExpr = this._configProvider.get(A.AUTH_EXPIRE_ACCESS).tryGetValue(60 * 30) as number | string
        return new Promise<any>((resolve, reject) => {
            jwt.sign(
                // Data
                payload,
                // Secret
                this._configProvider.get(A.AUTH_KEY_VERIFY).value as string,
                // Config
                {
                    expiresIn: isRefresh ? refreshExpr : accessExpr,
                    issuer: this._configProvider.get(A.AUTH_ISSUER).value as string,
                },
                // Callback
                (err, token) => {
                    if (token) {
                        resolve(token)
                    }
                    reject('Failed to create auth token')
                })
        })
    }



    /**
     * @memberOf IServiceAddOn.deadLetter
     */
    public deadLetter(): Promise<void> {
        return Promise.resolve()
    }

    /**
     * @memberOf IServiceAddOn.dispose
     */
    public dispose(): Promise<void> {
        return Promise.resolve()
    }
}
