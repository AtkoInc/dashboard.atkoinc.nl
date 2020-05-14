var logger = require('../logger.js')

class ProfileField {
    constructor(value,schema) {
        if(value === null || schema === null){
            throw new Error("Cannot create profile field with empty id or schema.")
        }
        var parent = null;
        if(schema.definitions.base.properties.hasOwnProperty(value)){
            parent = schema.definitions.base.properties
            logger.verbose("Property " + value + " is on the base schema.")
        }
        else if(schema.definitions.custom.properties.hasOwnProperty(value)){
            parent = schema.definitions.custom.properties
            logger.verbose("Property " + value + " is on the custom schema.")
        }
        else{
            throw new Error("Cannot find property " + value + " on schema.")
        }

        var fieldSchema = parent[value]
        this.id = value
        this.title = fieldSchema.title;
        this.description = fieldSchema.description
        this.type = fieldSchema.type
        if(this.type === "string"){
            this.minLength = fieldSchema.minLength
            this.maxLength = fieldSchema.maxLength
        }
        if(fieldSchema.hasOwnProperty("enum")){
            this.enum = true
            this.options = fieldSchema.oneOf
        }
    }
}

module.exports = ProfileField