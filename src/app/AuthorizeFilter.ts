import * as express from 'express'
import { decorators as d } from '@micro-fleet/common'
import { IActionFilter, ActionFilterBase } from '@micro-fleet/web'

import { AuthAddOn } from './AuthAddOn'
import { Types as T } from './Types'


export class AuthorizeFilter
    extends ActionFilterBase
    implements IActionFilter {

    @d.lazyInject(T.AUTH_ADDON) private _authAddon: AuthAddOn

    public async execute(request: express.Request, response: express.Response, next: Function): Promise<any> {
        try {
            const authResult = await this._authAddon.authenticate(request, response, next)
            if (!authResult.payload) {
                return response.status(401).send(authResult.info.message)
            }

            this.addReadonlyProp(request, 'user', authResult.payload)
            next()
        } catch (err) {
            console.error(err)
            response.sendStatus(401)
            // response status 401 Unthorized
        }
    }
}
