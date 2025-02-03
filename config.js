// config.js - Pusat konfigurasi
module.exports = {
  domain: process.env.PTERO_DOMAIN || 'https://panel.example.com',
  plta: process.env.PLTA || 'ptla_xxxxxxxxxxxxxxxxxxxxxxxx',
  nestId: process.env.NEST_ID || '1',
  eggId: process.env.EGG_ID || '1',
  locationId: process.env.LOCATION_ID || '1',
  dockerImage: process.env.DOCKER_IMAGE || 'ghcr.io/parkervcp/yolks:nodejs_18'
};