const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { sendWhatsAppMessage } = require('./whatsappBot');
const app = express();
const port = 3000;

const PROXMOX_URL = 'https://YOUR_PROXMOX_URL:8006/api2/json';
const USERNAME = 'root@pam'; // Update to match your Proxmox user
const PASSWORD = 'PROXMOX_PASSWORD'; // Update to your Proxmox password

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

        // Buat pesan yang ingin ditampilkan di web
        const message = `Hai ${username}, Berikut adalah informasi akun VPS Proxmox anda:\n\n` +
                        `Akses login proxmox:\n` +
                        `Host: https://pve-exoduscloud.redirectme.net:44016\n` +
                        `Username: ${username}\n` +
                        `Password: ${password}\n` +
                        `Realm: Proxmox VE authentication server\n\n` +
                        `Akses VPS di Proxmox:\n` +
                        `Username: root\n` +
                        `Password: ${password}\n\n` +
                        `Note:\n` +
                        `VPS tidak memiliki IP Public Static, jika anda ingin membuat VPS anda online, silahkan melakukan port forwarding / tunneling.`;

        // Kirim pesan ke klien
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
            email: `${username}@yourdomain.local`,
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
        ostemplate: 'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst', // make sure you have a image
        cores: 1,
        memory: 1024,
        net0: 'name=eth0,bridge=vmbr0,ip=dhcp',
        storage: 'local',
        password: password,
    };

    await axios.post(`${PROXMOX_URL}/nodes/www/lxc`, containerData, {
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
