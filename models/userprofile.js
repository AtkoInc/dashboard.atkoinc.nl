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
                this.title = profileJson.profile.title
                this.account_type = profileJson.profile.account_type
                if (profileJson.profile.mfa_preferred) {
                    this.mfaPreferred = profileJson.profile.mfa_preferred    
                } else {
                    this.mfaPreferred = 'false'
                }
                this.lastLogin = profileJson.lastLogin
                this.lastUpdate = profileJson.lastUpdated
//                this.mail_service = profileJson.mail_service
//                this.mail_newsletter = profileJson.mail_newsletter
//                this.mail_daydeals = profileJson.mail_daydeals
            }
            catch(error) {
                logger.error(error);
            }
        }
    }
}

module.exports = UserProfile