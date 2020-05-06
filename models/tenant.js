var logger = require('../logger.js')

class Tenant {
    constructor(tenantProfileJson,sub) {
        if(tenantProfileJson){
            try {
                this.tenant = tenantProfileJson.okta_org_name
                logger.verbose("Tenant: "+this.tenant)
                this.expires = new Date(new Date().getTime() + process.env.UDP_CACHE_DURATION*60000);
                logger.verbose("Expires: "+this.expires)
                this.authorizationURL = tenantProfileJson.okta_org_name+ '/v1/authorize',
                logger.verbose("AuthzUrl: "+this.authorizationURL)
                this.tokenURL= tenantProfileJson.okta_org_name+'/v1/token',
                logger.verbose("TokenUrl: "+this.tokenURL)
                this.userInfoURL= tenantProfileJson.okta_org_name+'/v1/userinfo',
                logger.verbose("UserInfoUrl: "+this.userInfoURL)
                this.clientID= tenantProfileJson.client_id
                logger.verbose("ClientID: "+this.clientID)
                this.clientSecret =  tenantProfileJson.client_secret
                if(this.clientSecret != null){
                    logger.verbose("ClientSecret: --present--")
                }
                else{
                    logger.warn("ClientSecret: --absent--")
                }
                this.callbackURL = tenantProfileJson.redirect_uri+'/authorization-code/'+sub
                logger.verbose("CallbackURL: "+this.callbackURL)
            }
            catch(error) {
                logger.error(error);
            }
        }
        else {
            try {
                this.tenant = process.env.TENANT
                this.expires = null
                this.issuer = process.env.ISSUER

                //TODO use the .well-known instead
                var oktaPath = this.issuer
                if(!oktaPath.includes("/oauth2/")){
                    oktaPath = this.tenant + "/oauth2"
                }
                this.authorizationURL = oktaPath + '/v1/authorize'
                this.tokenURL = oktaPath + '/v1/token',
                this.userInfoURL = oktaPath + '/v1/userinfo',
                this.clientID = process.env.CLIENT_ID,
                this.clientSecret = process.env.CLIENT_SECRET,
                this.callbackURL = process.env.REDIRECT_URI+'/authorization-code/'+sub
            }
            catch(error) {
                logger.error(error);
            }
        }
    }

    isExpired(){
        logger.verbose("Checking if tenant data is expired.")
        if(this.expires === null){
            logger.verbose("Tenant data set to never expire.")
            return false
        }
        logger.verbose("Expiry timestamp "+this.expires)
        return new Date() > this.expires
    }
}

module.exports = Tenant