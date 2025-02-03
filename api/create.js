const { default: fetch } = require('node-fetch');
const crypto = require('crypto');
const config = require('../config');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { serverName, ramSelect } = JSON.parse(req.body);
    
    // Validasi input
    if (!serverName || !ramSelect) {
      throw new Error('Nama server dan paket RAM harus diisi!');
    }

    // Konfigurasi resource
    const resourceConfig = {
      '1gb': { ram: 1000, disk: 1000, cpu: 40 },
      '2gb': { ram: 2000, disk: 1000, cpu: 60 },
      '3gb': { ram: 3000, disk: 2000, cpu: 80 },
      '4gb': { ram: 4000, disk: 2000, cpu: 100 },
      '5gb': { ram: 5000, disk: 3000, cpu: 120 },
      '6gb': { ram: 6000, disk: 3000, cpu: 140 },
      '7gb': { ram: 7000, disk: 4000, cpu: 160 },
      '8gb': { ram: 8000, disk: 4000, cpu: 180 },
      '9gb': { ram: 9000, disk: 5000, cpu: 200 },
      'unlimited': { ram: 0, disk: 0, cpu: 0 }
    };

    const resources = resourceConfig[ramSelect];
    if (!resources) throw new Error('Paket RAM tidak valid!');

    // Generate credentials
    const username = serverName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const password = username + crypto.randomBytes(2).toString('hex');

    // 1. Create User
    const userResponse = await fetch(`${config.domain}/api/application/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.plta}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: `${username}@ptero-panel.com`,
        username,
        first_name: serverName,
        last_name: "Server",
        password,
        language: "en"
      })
    });

    const userData = await userResponse.json();
    if (userData.errors) throw new Error(userData.errors[0].detail);

    // 2. Create Server
    const serverResponse = await fetch(`${config.domain}/api/application/servers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.plta}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `${serverName} Server`,
        user: userData.attributes.id,
        egg: parseInt(config.eggId),
        docker_image: config.dockerImage,
        startup: "npm start",
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start"
        },
        limits: {
          memory: resources.ram,
          swap: 0,
          disk: resources.disk,
          io: 500,
          cpu: resources.cpu
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 5
        },
        deploy: {
          locations: [parseInt(config.locationId)],
          dedicated_ip: false,
          port_range: []
        }
      })
    });

    const serverData = await serverResponse.json();
    if (serverData.errors) throw new Error(serverData.errors[0].detail);

    // 3. Response ke client
    res.json({
      success: true,
      data: {
        server_id: serverData.attributes.id,
        username,
        password,
        login_url: config.domain,
        resources: {
          ram: resources.ram === 0 ? 'Unlimited' : `${resources.ram}MB`,
          cpu: resources.cpu === 0 ? 'Unlimited' : `${resources.cpu}%`,
          disk: resources.disk === 0 ? 'Unlimited' : `${resources.disk}MB`
        },
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
