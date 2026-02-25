
const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./models');
const routes = require('./routes');
const cors = require('cors');
const redis = require('./config/redis');
const app = express();


app.use(cors({
  origin: "*",
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

async function clearAllRedisCache() {
  try {
    const keys = await redis.keys("*");

    if (keys.length === 0) {
      return { success: true, message: "No keys to delete" };
    }

    await redis.del(keys);

    return { success: true, message: `${keys.length} keys cleared` };

  } catch (error) {
    console.error("Error clearing redis cache:", error);
    return { success: false, message: "Failed to clear redis cache" };
  }
}
// clearAllRedisCache()

app.get('/flush-all', async (req, res) => {
  try {
    await clearAllRedisCache(); // assuming this returns a promise
    return res.status(200).json({ success: true, message: 'All cache cleared' });
  } catch (error) {
    console.error('❌ Failed to flush cache:', error);
    return res.status(500).json({ success: false, message: 'Failed to clear cache', error: error.message });
  }
});

// routes
app.use('/api', routes);

app.get('/health', (req, res) => res.json({ ok: true }));

// sync DB
async function init() {
  await sequelize.sync();
  // await sequelize.sync({ alter: true });
  console.log('DB synced successfully');
}
init().catch(err => console.error('DB sync error', err));

module.exports = app;
