var logger = require('../logger.js')

class AppLink {
    constructor(appListJson) {
        if(appListJson){

            try {
                this.linkUrl = appListJson.linkUrl
                this.label = appListJson.label
                this.logoUrl = appListJson.logoUrl
                this.id = appListJson.id
                this.appName = appListJson.appName
                this.sortOrder = appListJson.sortOrder
            }
            catch(error) {
                logger.error(error);
            }
        }
    }
}

module.exports = AppLink