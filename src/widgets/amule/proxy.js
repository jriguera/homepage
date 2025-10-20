import getServiceWidget from "utils/config/service-helpers";
import createLogger from "utils/logger";

const logger = createLogger("amuleProxyHandler");

// Helper to create and connect aMule client
async function connectToAmule(widget) {
  try {
    // Use amule-ts.js which has proper CommonJS exports
    const { AMuleCli } = require("amule-js/amule-ts.js");
    const md5 = require("blueimp-md5");
    const { StringDecoder } = require("string_decoder");

    // Parse server to get host and port (format: "hostname:port" or "ip:port")
    const serverParts = widget.server.split(":");
    const host = serverParts[0];
    const port = serverParts.length > 1 ? parseInt(serverParts[1], 10) : 4712; // Default aMule EC port is 4712

    const aMule = new AMuleCli(host, port, widget.password, md5);

    // Set up UTF-8 decoder to properly handle special characters in file names
    aMule.setStringDecoder(new StringDecoder("utf8"));

    // Connect to aMule
    await aMule.connect();
    return aMule;
  } catch (error) {
    logger.error("Failed to connect to aMule: %s", error);
    throw error;
  }
}

export default async function amuleProxyHandler(req, res) {
  const { group, service, index } = req.query;

  if (!group || !service) {
    logger.debug("Invalid or missing service '%s' or group '%s'", service, group);
    return res.status(400).json({ error: "Invalid proxy service type" });
  }

  const widget = await getServiceWidget(group, service, index);
  if (!widget) {
    logger.debug("Invalid or missing widget for service '%s' in group '%s'", service, group);
    return res.status(400).json({ error: "Invalid proxy service type" });
  }

  if (!widget.server) {
    logger.error("aMule server is required");
    return res.status(400).json({ error: "aMule server is required in widget configuration (format: hostname:port)" });
  }

  if (!widget.password) {
    logger.error("aMule password is required");
    return res.status(400).json({ error: "aMule password is required in widget configuration" });
  }

  try {
    const aMule = await connectToAmule(widget);
    // Get statistics from aMule
    const stats = await aMule.getStatistiques();

    // Extract relevant data
    // Based on amule-js EC_TAG_MAPPING:
    // EC_TAG_STATS_DL_SPEED: 513
    // EC_TAG_STATS_UL_SPEED: 512
    const downloadSpeed = stats.stats_dl_speed || 0;
    const uploadSpeed = stats.stats_ul_speed || 0;

    // Get the list of downloading files
    // getDownloads() returns an array of files being downloaded
    const downloads = await aMule.getDownloads();

    // Count actively downloading files (those with download speed > 0)
    // and queued files (those waiting or paused)
    let downloading = 0;
    let queue = 0;
    if (downloads && Array.isArray(downloads)) {
      downloads.forEach((file) => {
        // Files with partfile_speed > 0 are actively downloading
        // Others are queued/paused
        if (file.partfile_speed && file.partfile_speed > 0) {
          downloading++;
        } else {
          queue++;
        }
      });
    }

    const response = {
      download_speed: downloadSpeed,
      upload_speed: uploadSpeed,
      downloading,
      queue,
    };

    return res.status(200).json(response);
  } catch (error) {
    logger.error("Error getting aMule data: %s", error);
    return res.status(500).json({ error: `Failed to get aMule data: ${error.message}` });
  }
}
