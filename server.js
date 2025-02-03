// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Folder untuk file HTML/CSS/JS

// Import settings
const {
  domain,
  plta: apikey,
  nestid,
  egg,
  loc
} = require('./settings');

// Halaman utama (form input)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint untuk membuat server
app.post('/create-server', async (req, res) => {
  const { serverName, ramSelect } = req.body;

  // Validasi input
  if (!serverName || !ramSelect) {
    return res.status(400).send('Nama server dan paket RAM harus diisi!');
  }

  // Konfigurasi RAM, CPU, dan Disk
  let ram, disknya, cpu;
  switch (ramSelect) {
    case "1gb": ram = "1000"; disknya = "1000"; cpu = "40"; break;
    case "2gb": ram = "2000"; disknya = "1000"; cpu = "60"; break;
    case "3gb": ram = "3000"; disknya = "2000"; cpu = "80"; break;
    case "4gb": ram = "4000"; disknya = "2000"; cpu = "100"; break;
    case "5gb": ram = "5000"; disknya = "3000"; cpu = "120"; break;
    case "6gb": ram = "6000"; disknya = "3000"; cpu = "140"; break;
    case "7gb": ram = "7000"; disknya = "4000"; cpu = "160"; break;
    case "8gb": ram = "8000"; disknya = "4000"; cpu = "180"; break;
    case "9gb": ram = "9000"; disknya = "5000"; cpu = "200"; break;
    case "unlimited": ram = "0"; disknya = "0"; cpu = "0"; break;
    default: return res.status(400).send('Pilihan RAM tidak valid!');
  }

  try {
    // Generate username & password
    const username = serverName.toLowerCase().replace(/\s/g, '');
    const email = `${username}@gmail.com`;
    const name = `${serverName} Server`;
    const password = username + crypto.randomBytes(2).toString('hex');

    // 1. Buat User di Pterodactyl
    const userResponse = await fetch(`${domain}/api/application/users`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apikey}`
      },
      body: JSON.stringify({
        email,
        username,
        first_name: name,
        last_name: 'Server',
        language: 'en',
        password
      })
    });

    const userData = await userResponse.json();
    if (userData.errors) {
      return res.status(500).send(`Error: ${userData.errors[0].detail}`);
    }

    // 2. Buat Server di Pterodactyl
    const serverResponse = await fetch(`${domain}/api/application/servers`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apikey}`
      },
      body: JSON.stringify({
        name: name,
        description: `Dibuat pada: ${new Date().toLocaleString()}`,
        user: userData.attributes.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: "npm start",
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start"
        },
        limits: {
          memory: ram,
          swap: 0,
          disk: disknya,
          io: 500,
          cpu: cpu
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 5
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: []
        }
      })
    });

    const serverData = await serverResponse.json();
    if (serverData.errors) {
      return res.status(500).send(`Error: ${serverData.errors[0].detail}`);
    }

    // 3. Simpan data ke file JSON
    const serverDetails = {
      id: serverData.attributes.id,
      name: name,
      username: username,
      password: password,
      ram: ram === "0" ? "Unlimited" : `${parseInt(ram) / 1000}GB`,
      cpu: cpu === "0" ? "Unlimited" : `${cpu}%`,
      login_link: domain,
      created_at: new Date().toISOString()
    };

    fs.writeFileSync(
      `./servers/${username}.json`,
      JSON.stringify(serverDetails, null, 2)
    );

    // 4. Tampilkan hasil ke user
    res.send(`
      <h1>Server Created! 🎉</h1>
      <div style="border:1px solid #ccc; padding:20px; margin:20px;">
        <p><strong>Server Name:</strong> ${serverDetails.name}</p>
        <p><strong>Username:</strong> ${serverDetails.username}</p>
        <p><strong>Password:</strong> ${serverDetails.password}</p>
        <p><strong>RAM:</strong> ${serverDetails.ram}</p>
        <p><strong>CPU:</strong> ${serverDetails.cpu}</p>
        <p><strong>Login URL:</strong> <a href="${domain}" target="_blank">${domain}</a></p>
      </div>
      <p>⚠️ Simpan informasi ini dengan baik!</p>
    `);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Terjadi kesalahan saat membuat server!');
  }
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});