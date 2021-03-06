import { decorators as dec, Request, Response } from '@micro-fleet/web'


@dec.controller('/')
class SampleController {
    @dec.GET('/')
    public getSample(req: Request, res: Response): void {
        res.send('SampleController.getSample')
    }
}

module.exports = {
    SampleController,
}
