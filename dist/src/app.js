"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const messages_1 = __importDefault(require("./routes/messages"));
const app = (0, express_1.default)();
app.set("trust proxy", true);
app.use(express_1.default.urlencoded({ extended: false }));
app.use(express_1.default.json());
app.get("/health", (_req, res) => {
    return res.json({ ok: true });
});
app.use("/api/messages", messages_1.default);
exports.default = app;
