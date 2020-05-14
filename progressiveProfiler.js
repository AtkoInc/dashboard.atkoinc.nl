const axios = require('axios')
var logger = require('./logger')
const ProfileField = require('./models/profileField')

class ProgressiveProfiler {
    constructor(tenantResolver) {
        this.tr = tenantResolver
        this.requiredFields = ["firstName","lastName","IdType","customerCode","mobilePhone","consent_tc","consent_contact","consent_share"];
    }

    ensureProfiled(){
        return async (req, res, next) => {
            logger.verbose("Progresive profiling for route " + req.route.path + " requested")
            try{
                if(req.userContext == null){
                    logger.debug("Attempt to progressively profile user without context.")
                    return next()
                }
                
                var promptFields = []
                var response = await axios.get(
                    this.tr.getRequestingTenant(req).tenant
                     + '/api/v1/users/' + req.userContext.userinfo.sub,
                    { headers:  { Authorization: "SSWS "+process.env.API_TOKEN } }
                )
                //TODO this assumes that the user is of the default user type
                //you can get the user type from the response object above
                var schema = await axios.get(
                    this.tr.getRequestingTenant(req).tenant 
                    + '/api/v1/meta/schemas/user/default',
                    { headers:  { Authorization: "SSWS "+process.env.API_TOKEN } }
                )
                for(var i=0; i< this.requiredFields.length; i++){
                    if(!response.data.profile.hasOwnProperty(this.requiredFields[i])
                    || response.data.profile[this.requiredFields[i]] === null
                    || response.data.profile[this.requiredFields[i]].length === 0
                    || response.data.profile[this.requiredFields[i]] === '-'){
                        logger.verbose("User has incomplete profile for field: " +
                        this.requiredFields[i])
                        promptFields.push(new ProfileField(this.requiredFields[i],schema.data))
                    }
                }
            }
            catch(err){
                logger.error(err)
            }
            if(promptFields.length > 0){
                logger.verbose("User profile has " + promptFields.length + " which must be completed.")
                req.session.prompts = promptFields
                req.session.route = req.route
                res.redirect('/profile')
            }else{
                logger.verbose("User profile is complete.")
                return next()
            }
        }
    }
}

module.exports = ProgressiveProfiler