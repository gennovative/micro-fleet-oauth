/// <reference path="./global.d.ts" />
declare module '@micro-fleet/oauth/dist/app/AuthAddOn' {
	import { IConfigurationProvider } from '@micro-fleet/common';
	import { ExpressServerAddOn } from '@micro-fleet/web';
	export type AuthResult = {
	    payload: any;
	    info: any;
	    status: any;
	};
	export class AuthAddOn implements IServiceAddOn {
	    	    	    readonly name: string;
	    constructor(_serverAddOn: ExpressServerAddOn, _configProvider: IConfigurationProvider);
	    /**
	     * @memberOf IServiceAddOn.init
	     */
	    init(): Promise<void>;
	    	    authenticate(request: any, response: any, next: Function): Promise<AuthResult>;
	    createToken(payload: any, isRefresh: Boolean): Promise<string>;
	    /**
	     * @memberOf IServiceAddOn.deadLetter
	     */
	    deadLetter(): Promise<void>;
	    /**
	     * @memberOf IServiceAddOn.dispose
	     */
	    dispose(): Promise<void>;
	}

}
declare module '@micro-fleet/oauth/dist/app/AuthConstant' {
	 enum TokenType {
	    ACCESS = "jwt-access",
	    REFRESH = "jwt-refresh"
	}
	export { TokenType };

}
declare module '@micro-fleet/oauth/dist/app/Types' {
	export class Types {
	    static readonly AUTH_ADDON = "oauth.AuthAddOn";
	}

}
declare module '@micro-fleet/oauth/dist/app/AuthorizeFilter' {
	import * as express from 'express';
	import { IActionFilter, ActionFilterBase } from '@micro-fleet/web';
	export class AuthorizeFilter extends ActionFilterBase implements IActionFilter {
	    	    execute(request: express.Request, response: express.Response, next: Function): Promise<any>;
	}

}
declare module '@micro-fleet/oauth/dist/app/MetaData' {
	export class MetaData {
	    static readonly AUTHORIZED_FILTER = "micro-fleet-oauth:authorizedFilter";
	}

}
declare module '@micro-fleet/oauth/dist/app/authorized' {
	export type AuthorizedDecorator = () => Function;
	/**
	 * Marks a controller or action to require auth token to be accessible.
	 */
	export function authorized(): Function;

}
declare module '@micro-fleet/oauth' {
	export * from '@micro-fleet/oauth/dist/app/AuthAddOn';
	export * from '@micro-fleet/oauth/dist/app/AuthConstant';
	export * from '@micro-fleet/oauth/dist/app/authorized';
	export * from '@micro-fleet/oauth/dist/app/AuthorizeFilter';
	export * from '@micro-fleet/oauth/dist/app/MetaData';
	export * from '@micro-fleet/oauth/dist/app/Types';

}
