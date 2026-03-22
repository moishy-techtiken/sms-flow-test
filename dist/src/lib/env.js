"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequiredEnv = getRequiredEnv;
exports.validateRuntimeEnv = validateRuntimeEnv;
const requiredEnvNames = [
    "DATABASE_URL",
    "SIGNALWIRE_SPACE_URL",
    "SIGNALWIRE_PROJECT_ID",
    "SIGNALWIRE_API_TOKEN",
    "SIGNALWIRE_SIGNING_KEY"
];
function getRequiredEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is not set.`);
    }
    return value;
}
function validateRuntimeEnv() {
    for (const name of requiredEnvNames) {
        getRequiredEnv(name);
    }
}
