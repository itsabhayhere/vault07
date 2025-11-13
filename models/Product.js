const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    image: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    eCode: {
        type: String,
        required: true,
        unique: true,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId, // Reference to Category
        ref: "Category",
        required: true,
    }
}, { timestamps: true });

// Generate slug before saving
productSchema.pre("save", function(next){
    if (this.isModified('name')) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});

// ✅ Prevent OverwriteModelError
module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
