const oracledb = require("oracledb");
const fs = require("fs");
const path = require("path");
const { config } = require("../config");

// Single persistent connection - absolute minimum memory footprint
let _connection = null;
let _connectionPromise = null;
let _connectConfig = null;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveConnectString(connectString, walletDir) {
  if (!connectString) {
    throw new Error("Oracle connect string is missing");
  }

  const trimmedConnectString = connectString.trim();

  if (
    trimmedConnectString.startsWith("(") ||
    trimmedConnectString.includes("://")
  ) {
    return trimmedConnectString;
  }

  const tnsNamesPath = path.join(walletDir, "tnsnames.ora");

  if (!fs.existsSync(tnsNamesPath)) {
    throw new Error(`Could not find tnsnames.ora in wallet folder: ${walletDir}`);
  }

  const tnsNamesContent = fs.readFileSync(tnsNamesPath, "utf8");
  const pattern = new RegExp(
    `^\\s*${escapeRegExp(trimmedConnectString)}\\s*=\\s*(\\(description=.*\\))\\s*$`,
    "im"
  );
  const match = tnsNamesContent.match(pattern);

  if (!match) {
    throw new Error(
      `Could not find connect string alias "${trimmedConnectString}" in tnsnames.ora`
    );
  }

  return match[1].trim();
}

async function initOraclePool() {
  oracledb.fetchAsString = [oracledb.CLOB];

  const resolvedConnectString = resolveConnectString(
    config.dbConnectionString,
    config.dbWalletDir
  );

  _connectConfig = {
    user: config.dbUser,
    password: config.dbPassword,
    connectString: resolvedConnectString,
    walletLocation: config.dbWalletDir,
    walletPassword: config.dbWalletPassword,
  };

  // Open the first connection eagerly so startup failures are caught
  await _getOrCreateConnection();
  console.log("OracleDB single persistent connection established.");
}

async function _getOrCreateConnection() {
  // If we already have a healthy connection, return it
  if (_connection) {
    try {
      // Ping to verify the connection is still alive
      await _connection.ping();
      return _connection;
    } catch (err) {
      // Connection is dead, clear it and create a new one
      console.warn("Oracle connection lost, reconnecting...", err.message);
      _connection = null;
    }
  }

  // Prevent multiple concurrent reconnections
  if (_connectionPromise) {
    return _connectionPromise;
  }

  _connectionPromise = oracledb.getConnection(_connectConfig)
    .then(conn => {
      _connection = conn;
      _connectionPromise = null;
      return conn;
    })
    .catch(err => {
      _connectionPromise = null;
      throw err;
    });

  return _connectionPromise;
}

async function getConnection() {
  // Return a wrapper that has the same interface as a pooled connection
  // but does NOT close the underlying connection when .close() is called
  const realConn = await _getOrCreateConnection();
  
  return {
    execute: (...args) => realConn.execute(...args),
    ping: () => realConn.ping(),
    // close() is a no-op - we keep the connection alive
    close: async () => { /* no-op: single persistent connection */ },
  };
}

module.exports = {
  initOraclePool,
  getConnection
};
