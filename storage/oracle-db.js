const oracledb = require("oracledb");
const fs = require("fs");
const path = require("path");
const { config } = require("../config");

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
  try {
    oracledb.fetchAsString = [oracledb.CLOB];
    
    const resolvedConnectString = resolveConnectString(
      config.dbConnectionString,
      config.dbWalletDir
    );

    await oracledb.createPool({
      user: config.dbUser,
      password: config.dbPassword,
      connectString: resolvedConnectString,
      walletLocation: config.dbWalletDir,
      walletPassword: config.dbWalletPassword,
      poolMin: 2,
      poolMax: 4,
      poolIncrement: 1
    });
    console.log("OracleDB Connection Pool initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize OracleDB Connection Pool:", err);
    process.exit(1);
  }
}

async function getConnection() {
  return oracledb.getConnection();
}

module.exports = {
  initOraclePool,
  getConnection
};
