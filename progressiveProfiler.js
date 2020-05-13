const axios = require('axios')
var logger = require('./logger')

class ProgressiveProfiler {
    constructor(tenantResolver) {
        this.tr = tenantResolver
        this.requiredFields = ["firstName","lastName","IdType","IdNumber","customerCode","mobilePhone"];
    }

    ensureProfiled(){
        return async (req, res, next) => {
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
                for(var i=0; i< this.requiredFields.length; i++){
                    if(!response.data.profile.hasOwnProperty(this.requiredFields[i])
                    || response.data.profile[this.requiredFields[i]].length === 0){
                        logger.verbose("User has incomplete profile for field: " +
                        this.requiredFields[i])
                        promptFields.push(this.requiredFields[i])
                    }
                }
            }
            catch(err){
                logger.error(err)
            }
            if(promptFields.length > 0){
                req.session.prompts = promptFields
                req.session.route = req.route
                res.redirect('/profile')
            }else{
                console.log("profile complete")
                return next()
            }
        }
    }
}

module.exports = ProgressiveProfiler