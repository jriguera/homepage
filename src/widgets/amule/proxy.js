import AmuleClient from "amule-ec-node";

import getServiceWidget from "utils/config/service-helpers";
import createLogger from "utils/logger";

const logger = createLogger("amuleProxyHandler");

// aMule EC tag names returned by AmuleClient.getStats() (speeds are in bytes/s)
const EC_TAG_STATS_DL_SPEED = "EC_TAG_STATS_DL_SPEED";
const EC_TAG_STATS_UL_SPEED = "EC_TAG_STATS_UL_SPEED";

// Helper to create and connect aMule client
async function connectToAmule(widget) {
  try {
    // Parse server to get host and port (format: "hostname:port" or "ip:port")
    const serverParts = widget.server.split(":");
    const host = serverParts[0];
    const port = serverParts.length > 1 ? parseInt(serverParts[1], 10) : 4712; // Default aMule EC port is 4712

    // amule-ec-node handles EC auth hashing and UTF-8 filename decoding internally
    const aMule = new AmuleClient(host, port, widget.password);

    // Connect and authenticate to aMule
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

  let aMule;
  try {
    aMule = await connectToAmule(widget);

    // Get statistics from aMule (download/upload speeds are reported in bytes/s)
    const stats = await aMule.getStats();
    const downloadSpeed = Number(stats?.[EC_TAG_STATS_DL_SPEED]) || 0;
    const uploadSpeed = Number(stats?.[EC_TAG_STATS_UL_SPEED]) || 0;

    // Get the full download queue (array of download objects)
    const downloads = await aMule.getDownloadQueue();

    // Count actively downloading files (those with download speed > 0)
    // and queued files (those waiting or paused)
    let downloading = 0;
    let queue = 0;
    if (Array.isArray(downloads)) {
      downloads.forEach((file) => {
        // Files with speed > 0 are actively downloading, others are queued/paused
        if (file.speed && file.speed > 0) {
          downloading += 1;
        } else {
          queue += 1;
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
  } finally {
    // Always close the connection to avoid leaking sockets
    if (aMule) {
      try {
        aMule.close();
      } catch (closeError) {
        logger.debug("Error closing aMule connection: %s", closeError);
      }
    }
  }
}
