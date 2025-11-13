const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
    name : {
        type : String,
        required : true,
        unique : true,
        trim : true
    },
    slug : {
        type : String,
        unique : true,
    },
    image :{
        type : String,
        required :false,
    }
});

// Pre-save middleware to generate slug from name
categorySchema.pre('save', function(next){
    if(this.isModified('name')){
        this.slug = slugify(this.name, {lower : true, strict : true});
    };
    next();
});

module.exports = mongoose.model('Category', categorySchema);