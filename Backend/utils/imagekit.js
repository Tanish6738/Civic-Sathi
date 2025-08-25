const ImageKit = require('imagekit');
require('dotenv').config();

// Lazy singleton pattern so we only attempt to construct when all values present
let instance = null;

function getImageKit() {
  if (instance) return instance;
  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } = process.env;
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    // Return a proxy with an upload() that throws a clearer error later
    console.warn('[imagekit] Missing one or more ImageKit environment variables. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT.');
    return {
      upload() {
        throw new Error('ImageKit not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT in your environment.');
      },
      configured: false
    };
  }
  instance = new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT
  });
  instance.configured = true;
  return instance;
}

module.exports = getImageKit();

