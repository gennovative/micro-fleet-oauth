import { decorators as dec, Request, Response } from '@micro-fleet/web'

import { authorized } from '../../app'

@dec.controller('/')
class AuthorizedActionController {
    @dec.GET('/')
    @authorized()
    public getRestricted(req: Request, res: Response): void {
        res.send('AuthorizedController.getRestricted')
    }

    @dec.DELETE('/')
    public deleteAtWill(req: Request, res: Response): void {
        res.send('AuthorizedController.deleteAtWill')
    }
}

module.exports = {
    AuthorizedActionController,
}
