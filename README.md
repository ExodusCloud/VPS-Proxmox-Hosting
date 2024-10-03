# VPS Proxmox Hosting
Build your own Proxmox VPS hosting based on LXC Container.
# Installation

Make sure you already have a Proxmox Server, after you installing the Proxmox into your server or VPS, run this command on your root Proxmox:

    $ sudo apt update -y; apt install -y wget nano nodejs npm; wget https://raw.githubusercontent.com/ExodusCloud/VPS-Proxmox-Hosting/refs/heads/main/server.js
After you run the command above, run this command:

    $ npm init -y; npm install express body-parser axios
When finished, run server.js:

    $ node server.js
The server will run on localhost:3000
Access the server on your browser: http://SERVER_IP:3000/
## Automatic permissions on LXC Container

This script functions to provide automatic permission to users registered in the PVE realm with PVEVMUser permission.
Run this script on your Proxmox root:

    $ sudo apt install jq -y; wget https://raw.githubusercontent.com/ExodusCloud/VPS-Proxmox-Hosting/refs/heads/main/script.sh; chmod +x script.sh
Run the script using screen or tmux:

    ./script.sh

## Pve account registration website

Its function is to create a pve account registration page website that runs with the nodejs webserver (server.js).

    $ wget https://raw.githubusercontent.com/ExodusCloud/VPS-Proxmox-Hosting/refs/heads/main/index.html

