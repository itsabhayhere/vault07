const Visitor = require("../models/Visitor");

async function trackVisitor(req, res, next) {
  try {
    // Get the real IP
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    // Remove IPv6 prefix for localhost, if needed
    if (ip === "::1" || ip === "127.0.0.1") {
      // For local dev, you can skip saving or set a dummy IP
      ip = "LOCALHOST";
    } else if (ip.includes(",")) {
      // In case x-forwarded-for returns multiple IPs
      ip = ip.split(",")[0].trim();
    }

    // Check if this IP already visited today
    const alreadyVisited = await Visitor.findOne({
      ip,
      visitedAt: { 
        $gte: new Date(new Date().setHours(0,0,0,0)) // today
      }
    });

    if (!alreadyVisited) {
      // Use a geolocation API
      let country = "Unknown";
      try {
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
        const geoData = await geoRes.json();
        country = geoData.country_name || "Unknown";
      } catch (err) {
        console.error("Geo lookup failed:", err.message);
      }

      await Visitor.create({ ip, country });
    }
  } catch (err) {
    console.error("Error tracking visitor:", err.message);
  } finally {
    next();
  }
}

module.exports = trackVisitor;
