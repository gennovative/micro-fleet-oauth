import { Newable } from '@micro-fleet/common'
import { addFilterToTarget, FilterPriority } from '@micro-fleet/web'

import { AuthorizeFilter } from './AuthorizeFilter'


export type AuthorizedDecorator = () => Function


/**
 * Marks a controller or action to require auth token to be accessible.
 */
export function authorized(): Function {
    return function (TargetClass: Newable, key: string): Function {
        TargetClass = addFilterToTarget<AuthorizeFilter>(AuthorizeFilter, TargetClass, key, FilterPriority.HIGH) as Newable
        return TargetClass
    }
}
