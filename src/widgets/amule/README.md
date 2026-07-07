# aMule Widget

## aMule Widget Summary

The widget follows the standard homepage-dashboard pattern:

```
src/widgets/amule/
├── component.jsx    # React component (UI)
├── widget.js        # Widget configuration
└── proxy.js         # API proxy handler
```

This widget integrates with aMule, a multi-platform P2P client, using the
[amule-ec-node](https://github.com/got3nks/amule-ec-node) library to communicate
directly with aMule's External Connections (EC) protocol. It:

1. Establishes a TCP connection to aMule's EC port (default 4712)
2. Parses the `server` parameter (format: `hostname:port` or `ip:port`)
3. Authenticates using the EC password (hashing handled by the library)
4. Fetches statistics using EC protocol commands:
   - `getStats()` - Gets download/upload speeds
   - `getDownloadQueue()` - Gets the detailed download file list and status

## Configuration

Add the following configuration to your `services.yaml`:

```yaml
- aMule:
    icon: a-mule.png
    href: http://localhost:4711
    description: aMule P2P Client
    widget:
      type: amule
      server: localhost:4712
      password: your-ec-password
```

**Important:**
- The `server` should be in the format `hostname:port` or `ip:port` (default port: 4712)
- The `href` points to the web interface (port 4711) for clicking through
- The `password` is the EC password, not the web interface password
- Port can be omitted if using default: `server: localhost` (assumes 4712)

### 1. Install npm Dependencies (only if needed)

From the homepage project root:

```bash
npm install github:got3nks/amule-ec-node
```

Or if using pnpm:

```bash
pnpm add github:got3nks/amule-ec-node
```

### 2. Configure aMule

1. Open aMule
2. Go to **Preferences** → **Remote Controls**
3. Check **"Accept External Connections"**
4. Set **Port**: `4712` (default)
5. Set **Password**: Choose a secure password (this will be your EC password)
6. Click **OK** and restart aMule

### 3. Configure Homepage

Edit your `services.yaml`:

```yaml
- aMule:
    icon: a-mule.png
    href: http://localhost:4711
    description: aMule P2P Download Manager
    widget:
      type: amule
      server: localhost:4712
      password: your-ec-password
```

## Widget Fields

The widget displays the following information:

- **Download**: Current download speed (in bits/sec)
- **Upload**: Current upload speed (in bits/sec)
- **Downloading**: Number of files currently being downloaded
- **Queue**: Number of files queued

## Prerequisites

### 1. Install Required npm Packages

You need to install the `amule-ec-node` library:

```bash
npm install github:got3nks/amule-ec-node
```

Or with pnpm:

```bash
pnpm add github:got3nks/amule-ec-node
```

### 2. Enable aMule External Connections

1. Open aMule preferences
2. Go to "Remote Controls" section
3. Enable "Accept External Connections"
4. Set the port (default is 4712)
5. Set the EC password (this is what you'll use in the widget configuration)
6. Apply and restart aMule

### 3. Network Access

Make sure your Homepage instance can reach aMule's EC port:
- If running in Docker, ensure proper network configuration
- Check firewall rules if running on a different machine

## API Integration

This widget uses the `amule-ec-node` library which implements aMule's External Connections (EC) protocol. It:

1. Establishes a TCP connection to aMule's EC port (default 4712)
2. Authenticates using the EC password (hashing handled by the library)
3. Fetches statistics using EC protocol commands:
   - `getStats()` - Gets download/upload speeds
   - `getDownloadQueue()` - Gets the detailed download file list and status

A fresh connection is opened per request and closed afterwards to avoid leaking sockets.

## Technical Details

### Server Format

The `server` parameter accepts:
- Full format: `hostname:port` or `ip:port` (e.g., `192.168.1.100:4712`)
- Short format: `hostname` or `ip` (assumes default port 4712)

### Data Extraction

- **Download/Upload Speeds**: Retrieved from the `EC_TAG_STATS_DL_SPEED` and `EC_TAG_STATS_UL_SPEED` fields (bytes/s) returned by `getStats()`
- **File Counts**: Calculated from the download queue using `getDownloadQueue()`:
  - **Downloading**: Files with `speed > 0` (actively transferring)
  - **Queue**: Files with `speed === 0` (paused or waiting)

### Error Handling

- Missing password returns a 400 error
- Connection failures return a 500 error
- All errors are logged for debugging

## Troubleshooting

### "Failed to connect to aMule"
- Verify aMule is running and EC is enabled
- Check the port number (should be 4712 by default)
- Verify the password matches your EC password in aMule
- Check network connectivity and firewall rules

### "aMule password is required"
- Make sure you've added the `password` field to your widget configuration

### Incorrect File Counts
- The widget uses each download's `speed` to determine if a file is actively downloading
- Files with speed > 0 are counted as "downloading"
- Files with speed = 0 are counted as "queue" (paused/waiting)
- If counts seem wrong, check if files are actually transferring data in aMule

## aMule Integration Details

The widget uses the **amule-ec-node** library (https://github.com/got3nks/amule-ec-node) which:

- Connects directly to aMule's External Connections (EC) protocol via TCP
- Default EC port: 4712 (not the web interface port 4711)
- Authentication: EC password (salted/hashed by the library)
- Protocol: Custom binary protocol (not HTTP/REST)

## Related Resources

- [aMule Official Site](http://www.amule.org/)
- [amule-ec-node GitHub](https://github.com/got3nks/amule-ec-node)
- [Homepage Dashboard](https://gethomepage.dev/)
- [aMule EC Protocol](http://wiki.amule.org/wiki/External_Connections)
