const Marquee = require("../../models/Marquee");
const { body, validationResult } = require('express-validator');


// get maruqee page
async function getMarqueePage(req, res) {
    try {
      const marquees = await Marquee.find();
  
      res.render("admin/marquee/marqueeList", {
        title: "Manage Marquee",
        user: req.user,
        marquees,
        message: null, // prevents ReferenceError
        error: null,
        layout: "admin/adminLayout",
      });
    } catch (error) {
      console.error("Error fetching marquees:", error);
      res.status(500).send("Server Error");
    }
  }
  
// --- Create Marquee ---
async function createMarquee(req, res) {
    try {
        // Run validations
        await body('text').notEmpty().withMessage('Text is required').run(req);
        await body('link').isURL().withMessage('Valid URL is required').run(req);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Extract fields
        const { text, link } = req.body;
        let { isActive } = req.body;

        // Normalize isActive to boolean
        if (isActive !== undefined) {
            isActive = isActive === 'true' || isActive === true;
        } else {
            isActive = false; // default value
        }

        // Create new marquee
        const newMarquee = new Marquee({ text, link, isActive });
        await newMarquee.save();

        res.status(201).redirect('/admin/marquee');
    } catch (error) {
        console.error('Error creating marquee:', error);
        res.status(500).json({ message: 'Server Error' });
    }
}

// --- Update Marquee ---
async function updateMarquee(req, res) {
    try {
        const id = req.params.id.trim(); // ✅ trim whitespace

        // Run validations only if fields are provided
        if (req.body.text !== undefined) {
            await body('text').notEmpty().withMessage('Text is required').run(req);
        }
        if (req.body.link !== undefined) {
            await body('link').isURL().withMessage('Valid URL is required').run(req);
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Build update object dynamically
        const updateFields = {};
        if (req.body.text !== undefined) updateFields.text = req.body.text;
        if (req.body.link !== undefined) updateFields.link = req.body.link;
        if (req.body.isActive !== undefined) {
            updateFields.isActive = req.body.isActive === 'true' || req.body.isActive === true;
        }

        const updatedMarquee = await Marquee.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updatedMarquee) {
            return res.status(404).json({ message: 'Marquee not found' });
        }

        res.status(200).redirect('/admin/marquee');
    } catch (error) {
        console.error('Error updating marquee:', error);
        res.status(500).json({ message: 'Server Error' });
    }
}

//delete marquee
async function deleteMarquee(req, res) {
    try {
        const id = req.params.id.trim(); // ✅ trim whitespace

        const deletedMarquee = await Marquee.findByIdAndDelete(id);

        if (!deletedMarquee) {
            return res.status(404).json({ message: 'Marquee not found' });
        }

        res.status(200).redirect('/admin/marquee');
    } catch (error) {
        console.error('Error deleting marquee:', error);
        res.status(500).json({ message: 'Server Error' });
    }
}

module.exports = {
    createMarquee,
    updateMarquee,
    deleteMarquee,
    getMarqueePage,
};
