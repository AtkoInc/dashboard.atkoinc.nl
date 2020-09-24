var logger = require('../logger.js')

class Tenant {
    constructor(tenantProfileJson,sub) {
        if(tenantProfileJson){
            try {
                this.tenant = tenantProfileJson.okta_org_name
                logger.verbose("Tenant: "+this.tenant)
                this.expires = new Date(new Date().getTime() + process.env.UDP_CACHE_DURATION*60000);
                logger.verbose("Expires: "+this.expires)
                this.authorizationURL = tenantProfileJson.okta_org_name+ '/oauth2/v1/authorize',
                logger.verbose("AuthzUrl: "+this.authorizationURL)
                this.tokenURL= tenantProfileJson.okta_org_name+'/oauth2/v1/token',
                logger.verbose("TokenUrl: "+this.tokenURL)
                this.userInfoURL= tenantProfileJson.okta_org_name+'/oauth2/v1/userinfo',
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
                this.delegationServiceUrl = tenantProfileJson.delegation_service_url
                this.delegationServiceSecret = tenantProfileJson.delgation_service_secret
            }
            catch(error) {
                logger.error(error);
            }
        }
        else {
            try {
                this.tenant = process.env.TENANT
                this.expires = null
                this.issuer = process.env.TENANT
                this.authorizationURL = process.env.TENANT+ '/oauth2/v1/authorize'
                this.tokenURL = process.env.TENANT+'/oauth2/v1/token',
                this.userInfoURL = process.env.TENANT+'/oauth2/v1/userinfo',
                this.clientID = process.env.CLIENT_ID,
                this.clientSecret = process.env.CLIENT_SECRET,
                this.callbackURL = process.env.REDIRECT_URI+'/authorization-code/'+sub
                this.delegationServiceUrl = process.env.DELEGATION_SERVICE_URL
                this.delegationServiceSecret = process.env.DELEGATION_SERVICE_SECRET
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