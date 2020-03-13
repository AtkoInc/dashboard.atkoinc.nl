var logger = require('../logger.js')

class UserProfile {
    constructor(profileJson) {
        if(profileJson){
            try {
                this.userName = profileJson.profile.email
                this.firstName = profileJson.profile.firstName
                this.lastName = profileJson.profile.lastName
                this.name = profileJson.profile.firstName + " " + profileJson.profile.lastName
                this.phoneNumber = profileJson.profile.mobilePhone
                this.email = profileJson.profile.email
                this.crmStatus = profileJson.profile.crm_status

                this.lastLogin = profileJson.lastLogin
                this.lastUpdate = profileJson.lastUpdated
            }
            catch(error) {
                logger.error(error);
            }
        }
    }
}

module.exports = UserProfile