import { decorators as dec, Request, Response } from '@micro-fleet/web'

import { authorized } from '../../app'

@dec.controller('/')
@authorized()
class AuthorizedController {
    @dec.GET('/')
    public getRestricted(req: Request, res: Response): void {
        res.send('AuthorizedController.getRestricted')
    }
}

module.exports = {
    AuthorizedController,
}
