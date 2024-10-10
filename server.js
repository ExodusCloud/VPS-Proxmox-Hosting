const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs'); // Import the fs module
const { sendWhatsAppMessage } = require('./whatsappBot');
const app = express();
const port = 3000;

const PROXMOX_URL = 'https://IP_PROXMOX:8006/api2/json';
const USERNAME = 'root@pam'; // Update to match your Proxmox user
const PASSWORD = 'PASSWORD'; // Update to your Proxmox password

let csrfToken;
let ticket;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/register', async (req, res) => {
    const { username, password, whatsapp } = req.body;

    try {
        await authenticate();
        await createProxmoxAccount(username, password);
        await createContainer(username, password);

        // Save WhatsApp number along with the username to whatsapp.txt
        const whatsappEntry = `${whatsapp}(${username})\n`;
        fs.appendFile('whatsapp.txt', whatsappEntry, (err) => {
            if (err) {
                console.error('Error writing to whatsapp.txt:', err);
            } else {
                console.log(`WhatsApp entry ${whatsappEntry.trim()} saved.`);
            }
        });

        // Create message to display on the web
        const message = `Hai ${username}, Berikut adalah informasi akun VPS Proxmox anda:\n\n` +
                        `Akses login proxmox:\n` +
                        `Host: https://IP_PROXMOX:8006/\n` +
                        `Username: ${username}\n` +
                        `Password: ${password}\n` +
                        `Realm: Proxmox VE authentication server\n` +
                        `Jika VPS tidak dinyalakan setelah akun dibuat dalam waktu 1 jam maka VPS anda kami suspend\n\n` +
                        `Akses VPS di Proxmox:\n` +
                        `Username: root\n` +
                        `Password: ${password}\n\n` +
                        `Note:\n` +
                        `VPS tidak memiliki IP Public Static, jika anda ingin membuat VPS anda online, silahkan melakukan port forwarding / tunneling.`;

        // Send response to client
        res.send(`
            <html>
                <body>
                    <h1>Pendaftaran Berhasil</h1>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error dalam proses pendaftaran:', error);
        res.status(500).send('Terjadi kesalahan, silakan coba lagi.');
    }
});

// Function to authenticate and retrieve CSRF token and ticket
async function authenticate() {
    const response = await axios.post(`${PROXMOX_URL}/access/ticket`, {
        username: USERNAME,
        password: PASSWORD,
    }, {
        httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false
        })
    });

    ticket = response.data.data.ticket;
    csrfToken = response.data.data.CSRFPreventionToken;
    console.log(`Authenticated: ticket=${ticket}, csrfToken=${csrfToken}`);
}

// Function to create user in Proxmox
async function createProxmoxAccount(username, password) {
    try {
        const response = await axios.post(`${PROXMOX_URL}/access/users`, {
            userid: `${username}@pve`,
            password: password,
            email: `${username}@exoduscloud.local`,
        }, {
            headers: {
                'CSRFPreventionToken': csrfToken,
                'Cookie': `PVEAuthCookie=${ticket}`,
            },
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: false
            })
        });

        console.log(`Akun ${username} berhasil dibuat.`);
    } catch (error) {
        console.error('Error saat membuat akun Proxmox:', error.response.data);
        throw error; // Rethrow the error for handling in the calling function
    }
}

// Function to create a new container in Proxmox
async function createContainer(username, password) {
    const containerData = {
        vmid: Date.now() % 10000,
        hostname: username,
        ostemplate: 'local:vztmpl/YOUR_LXC_IMAGE',
        cores: 1,
        memory: 1024,
        net0: 'name=eth0,bridge=vmbr0,ip=dhcp',
        storage: 'local',
        password: password,
    };

    await axios.post(`${PROXMOX_URL}/nodes/YOUR_PROXMOX_NODE/lxc`, containerData, {
        headers: {
            'CSRFPreventionToken': csrfToken,
            'Cookie': `PVEAuthCookie=${ticket}`,
        },
        httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false
        })
    });

    console.log(`Container untuk ${username} berhasil dibuat.`);
}

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
