const fs = require("fs");
const path = require("path");

loadEnvFile();

const rawWalletDir = process.env.DB_WALLET_DIR || "./wallet";

const config = {
  dbMode: process.env.DB_MODE || "json",
  dbUser: process.env.DB_USER || "ADMIN",
  dbPassword: process.env.DB_PASSWORD || "",
  dbConnectionString: process.env.DB_CONNECTION_STRING || "projectdb_tp",
  dbWalletDir: path.isAbsolute(rawWalletDir)
    ? rawWalletDir
    : path.join(__dirname, rawWalletDir),
  dbWalletPassword: process.env.DB_WALLET_PASSWORD || "",
  port: Number(process.env.PORT || 4000),
};

module.exports = { config };

function loadEnvFile() {
  const envFilePath = path.join(__dirname, ".env");

  if (!fs.existsSync(envFilePath)) {
    return;
  }

  const fileContent = fs.readFileSync(envFilePath, "utf8");
  const lines = fileContent.split("\n");

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}
