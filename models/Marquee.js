const mongoose = require('mongoose');

const marqueeSchema = new mongoose.Schema({
    text :{
        type : String,
        required : true,
    },
    link :{
        type : String,
        required : true,
    },
    isActive :{
        type : Boolean,
        default : true,
    },

});

module.exports = mongoose.model('Marquee', marqueeSchema);
