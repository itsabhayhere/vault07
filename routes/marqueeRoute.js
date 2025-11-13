const express = require("express");
const router = express.Router();

const {createMarquee,updateMarquee,deleteMarquee,getMarqueePage} = require('../controllers/adminController/marqueeController')

//route get marquee page
router.get('/', getMarqueePage);
//route create marquee
router.post('/create', createMarquee);
//route update marquee
router.put('/update/:id', updateMarquee);
//route delete marquee
router.delete('/delete/:id', deleteMarquee);

module.exports = router;