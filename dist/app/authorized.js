"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web_1 = require("@micro-fleet/web");
const AuthorizeFilter_1 = require("./AuthorizeFilter");
/**
 * Marks a controller or action to require auth token to be accessible.
 */
function authorized() {
    return function (TargetClass, key) {
        TargetClass = web_1.addFilterToTarget(AuthorizeFilter_1.AuthorizeFilter, TargetClass, key, web_1.FilterPriority.HIGH);
        return TargetClass;
    };
}
exports.authorized = authorized;
//# sourceMappingURL=authorized.js.map