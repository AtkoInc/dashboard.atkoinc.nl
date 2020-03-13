const axios = require('axios')
const Tenant = require('./models/tenant')
var passport = require('passport');
var OidcStrategy = require('passport-openidconnect').Strategy;
var logger = require('./logger')

const defaultTenantSub = "default";

class TenantResolver {
    constructor() {
        this.tenants = new Map([]);
        this.tenants.set(defaultTenantSub,new Tenant(null,defaultTenantSub))
        this.registerTenantRoutes(this.tenants.get(defaultTenantSub),defaultTenantSub)
    }

    ensureAuthenticated(){
        return async (req, res, next) => {
            let sub = req.headers.host.substr(0,req.headers.host.indexOf("."+process.env.BASE_HOST))
            if(sub == ""){
                logger.info("Using default sub.")
                sub = defaultTenantSub
            }

            logger.verbose("Request for subdomain "+sub+" received.")
            var tenant = this.tenants.get(sub)

            if(tenant == null || tenant.isExpired()){
                try{
                    logger.info("Consulting UDP for tenant info of "+sub)
                    var response = await axios.get(process.env.UDP_URI+"/api/configs/"+sub+"/"+process.env.UDP_APP_NAME,{
                        headers:{
                            Authorization: 'Bearer '+ process.env.UDP_ACCESS_TOKEN
                        }
                    })
                    response.data.redirect_uri = response.data.redirect_uri.replace('/authorization-code/callback', '')
                    this.tenants.set(sub,new Tenant(response.data,sub));
                    logger.info("Tenant " + sub + " stored");
                    tenant = this.tenants.get(sub)
                    this.registerTenantRoutes(tenant,sub)
                }
                catch(error){
                    logger.error(error)
                    return res.status(500).json({
                        Error: "Failed to retrieve tenant configuration from UDP for "+sub
                      });
                }
            }

            if(tenant == null){
                return res.status(500).json({
                    Error: "Unable to determine tenant configuration for "+sub
                  });
            }

            if (req.isAuthenticated() && req.userContext != null) {
                return next();
              }
            res.redirect("/login/"+sub)
        }
    }

    getRequestingTenant(req){
        logger.verbose("Resolving tenant from request")
        let sub = req.headers.host.substr(0,req.headers.host.indexOf("."+process.env.BASE_HOST))
        if(sub == ""){
            logger.verbose("Subdomain was empty using default tenant.")
            sub = defaultTenantSub
        }
        logger.verbose("Looking for tenant "+sub)
        return this.tenants.get(sub)
    }

    registerTenantRoutes(tenant,sub){
        passport.use(sub, new OidcStrategy({
            issuer: tenant.tenant,
            authorizationURL: tenant.authorizationURL,
            tokenURL: tenant.tokenURL,
            userInfoURL: tenant.userInfoURL,
            clientID: tenant.clientID,
            clientSecret: tenant.clientSecret,
            callbackURL: tenant.callbackURL,
            scope: process.env.SCOPES
          },(issuer, sub, profile, accessToken, refreshToken,extraParams, done) => {
            var user = {
                'userinfo': {
                    'sub'  : sub,
                    'name' : profile.name.givenName + ' ' + profile.name.familyName
                },
                'id'   : profile.id,
                'tokens': {
                    'access_token':accessToken,
                    'id_token': extraParams.id_token
                } 
            }
            return done(null, user);
          }));

        app.use("/login/"+sub,passport.authenticate(sub))
        logger.verbose("added route /login/"+sub)
        app.use('/authorization-code/'+sub,passport.authenticate(sub, { successRedirect: '/', failureRedirect: '/error' }));
        logger.verbose("added route /authorization-code/"+sub)
    }
}

module.exports = TenantResolver
