require('dotenv').config();

const http = require('http');
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
    REST,
    Routes,
    Partials,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits,
    ChannelType,
} = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const fs = require('fs'); 

// —————————— CLIENT INITIALIZATION (Hata Düzeltmesi: client tanımlandı) ——————————
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel, Partials.Message] 
});

// —————————— CONFIGURATION ——————————

// —————————— DOSYA & VERİTABANI KONFİGÜRASYONU ——————————
const EFSANE_DATA_FILE = 'efsane_data.json';

// Ana Efsane Listesi
const EFSANE_LIST_CHANNEL_ID = '1446488214641574018'; 
const EFSANE_ONAY_CHANNEL_ID = '1444574724876402740'; 

// Yeni Efsanevi Dünya Listesi
const EFSANEVI_DUNYA_CHANNEL_ID = '1446488308778532955'; 
const EFSANEVI_DUNYA_ONAY_CHANNEL_ID = '1444574724876402740'; // Aynı kanal

// Yeni Efsane Başvuru Kanalı (Sadece bu kanalda /efsane-basvuru çalışacak ve mesajlar kısıtlanacak)
const EFSANE_BASVURU_CHANNEL_ID = '1434552801475825675';

// —————————— YARDIMCI VERİ YÖNETİMİ FONKSİYONLARI ——————————

// Başlangıçta alınmış Efsane isimleri, sahibi ve tarih
// Map<EfsaneAdi, { userId: string, claimDate: number }>
let CLAIMED_EFSANE_NAMES = new Map(); 

// Kullanıcıların bekleyen başvuruları
// Map<UserId, { efsaneAdi: string, messageId: string, isEfsaneviDunya: boolean }>
let PENDING_APPLICATIONS = new Map();

/**
 * Kayıtlı Efsane sahipliği verilerini dosyadan yükler.
 */
function loadEfsaneData() {
    try {
        if (fs.existsSync(EFSANE_DATA_FILE)) {
            const data = fs.readFileSync(EFSANE_DATA_FILE, 'utf8');
            const parsedData = JSON.parse(data);
            
            // Yeni yapıyı yükle
            CLAIMED_EFSANE_NAMES = new Map(Object.entries(parsedData.claimedEfsaneNames || {}));
            PENDING_APPLICATIONS = new Map(Object.entries(parsedData.pendingApplications || {}));
            
            console.log(`✅ ${CLAIMED_EFSANE_NAMES.size} adet Efsane sahipliği verisi yüklendi.`);
            console.log(`✅ ${PENDING_APPLICATIONS.size} adet bekleyen başvuru verisi yüklendi.`);
        } else {
            saveEfsaneData();
        }
    } catch (error) {
        console.error('❌ Efsane verisi yüklenirken hata oluştu:', error);
    }
}

/**
 * Efsane sahipliği verilerini dosyaya kaydeder.
 */
function saveEfsaneData() {
    try {
        const dataToSave = {
            claimedEfsaneNames: Object.fromEntries(CLAIMED_EFSANE_NAMES),
            pendingApplications: Object.fromEntries(PENDING_APPLICATIONS)
        };
        fs.writeFileSync(EFSANE_DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ Efsane verisi kaydedilirken hata oluştu:', error);
    }
}

/**
 * Belirtilen efsane adına sahiplik atar ve atama tarihini kaydeder.
 */
function claimEfsane(efsaneAdi, userId) {
    // claimDate: atama tarihi (Unix Timestamp ms) - 2 günlük süre burada başlar
    CLAIMED_EFSANE_NAMES.set(efsaneAdi, { userId: userId, claimDate: Date.now() });
    saveEfsaneData();
    console.log(`✅ ${efsaneAdi} efsanesi <@${userId}> kullanıcısına atandı. (Tarih Kaydedildi)`);
}

/**
 * Belirtilen efsanenin sahipliğini kaldırır.
 */
function unclaimEfsane(efsaneAdi) {
    CLAIMED_EFSANE_NAMES.delete(efsaneAdi);
    saveEfsaneData();
    console.log(`✅ ${efsaneAdi} efsanesinin sahipliği kaldırıldı.`);
}

/**
 * Tüm Efsane sahipliklerini ve bekleyen başvuruları sıfırlar.
 * listType: 'codeman', 'efsanevi_dunya', or 'all' - (Sadece log amaçlı kullanılır)
 */
function resetAllEfsaneData(listType) {
    // Tüm sahiplikleri ve bekleyen başvuruları sıfırla
    CLAIMED_EFSANE_NAMES.clear();
    PENDING_APPLICATIONS.clear();
    saveEfsaneData();
    console.log(`✅ ${listType.toUpperCase()} için tüm Efsane sahiplikleri ve bekleyen başvurular SIFIRLANDI.`);
}


// —————————— EFSANE GRUPLARI VE SABİTLERİ ——————————

// Ana Efsane Listesi
const EFSANE_GROUPS = [
    // HEROBRINE COUNCIL GRUBU
    { title: '**`———— Herobrine Council - Sahip ————`**', names: [
        { key: 'GreatMaster', emoji: '<:greatmaster:1424455575160230029>' },
        { key: 'Ares', emoji: '<:ares:1444585247596482560>' },
        { key: 'Brianna', emoji: '<:brianna:1424473083191886035>' },
        { key: 'Raxxan', emoji: '<:raxxan:1446196102528372877>' },
        { key: 'Miskel', emoji: '<:miskel:1424473493407531169>' },
        { key: 'El!Harkos', emoji: '<:harkos:1424473385899003954>' }, 
        { key: 'Kajaros', emoji: '<:kajaros:1446197226534600735>' },
        { key: 'Okazor', emoji: '<:Okazor:1446239149513248858>' }, 
    ]},
    // AİLE ÜYELERİ GRUBU
    { title: '**`———— Aile Üyeleri ————`**', names: [ 
        { key: 'Code-Man', emoji: '<:codeman:1444585245650190446>' },
        { key: 'HHHH', emoji: '<:HHHH:1424472850940694751>' },
        { key: 'IceMan', emoji: '<:iceman:1424473345990070292>' }, 
        { key: 'TRMC', emoji: '<:trmc:1424473703504154705>' },
        { key: 'Bella', emoji: '<:bella:1446198040561062120>' },
        { key: 'Eyeless_Jack', emoji: '<:cEyelessJack:1446198569819308206>' },
        { key: '̶L̶a̶d̶y̶', emoji: '<:lady:1424473453699924121>' }, 
        { key: '0032', emoji: '<:0032:1424472799313006612>' },
        { key: 'RedcatKK', emoji: '<:redcatkk:1446198877387493387>' },
        { key: 'Binny', emoji: '<:binny:1424473045124251678>' },
        { key: 'Whiterex', emoji: '<:Whiterex:1446199170707755149>' },
        { key: 'Ball-Man', emoji: '<:ballman:1424472989860368586>' },
        { key: 'Collar', emoji: '<:collar:1446199538598543382>' },
        { key: '$07', emoji: '<:07:1424472825170890864>' },
    ]},
    // ÇİRKİNLER GRUBU
    { title: '**`———— Çirkinler ————`**', names: [ 
        { key: 'Ice-Man', emoji: '<:iceman:1424473345990070292>' }, 
        { key: 'Hoodie', emoji: '<:hoodie:1446199936797376830>' }, 
        { key: 'ImmortallSurgentNecromancer', emoji: '<:necromencer:1446200227542335589>' },
        { key: 'Shadow Ancient', emoji: '<:ShadowAncient:1446200461425250315>' }, 
        { key: 'Fanoth', emoji: '<:fanoth:1424473229267046634>' }, 
    ]},
    // KURBANLAR GRUBU
    { title: '**`———— Kurbanlar ————`**', names: [ 
        { key: 'Fallen', emoji: '<:Fallen:1424473252717133854>' }, 
        { key: 'Enigma', emoji: '<:enigma:1424473202691801120>' }, 
        { key: 'Bloodsky.avi', emoji: '<:bloodskyavi:1424473062987792414>' }, 
    ]},
    // LOST GUYS GRUBU
    { title: '**`———— Lost Guys ————`**', names: [ 
        { key: 'JK', emoji: '<:jk:1446200909335105707>' }, 
        { key: 'Dwayne', emoji: '<:Dwayne:1446200936589561876>' }, 
        { key: 'Clay', emoji: '<:clay:1446231058415751401>' },
        { key: 'Jack', emoji: '<:jack:1446210793669529640>' },
        { key: 'Pam', emoji: '<:pam:1367254101095874561>' },
        { key: 'David', emoji: '<:david:1367254035282923590>' },
    ]},
    // EJDER BROTHERS GRUBU
    { title: '**`———— Ejder Brothers ————`**', names: [ 
        { key: 'Драконо рошан / Powah', emoji: '<:powah:1424473574839685300>' }, 
        { key: 'Драконо повла / Povla', emoji: '<:povla:1424473586328015078>' }, 
    ]},
    // TFT BROTHERS GRUBU
    { title: '**`———— TFT Brothers ————`**', names: [ 
        { key: 'Voidlar', emoji: '<:Voidlar:1444715531570647080>' }, 
        { key: 'Divior', emoji: '<:divior:1424473164049551540>' }, 
        { key: 'Bhior', emoji: '<:bhior:1424473013922959512>' }, 
    ]},
    // ROZENBERG FAMILY GRUBU
    { title: '**`———— Rozenberg Family ————`**', names: [ 
        { key: 'Samantha', emoji: '<:samantha:1446195786143764587>' }, 
        { key: 'Kassandra', emoji: '<:kassandra:1424473429007929455>' }, 
    ]},
    // BASH2313 TEAM GRUBU
    { title: '**`———— Bash2313 Team ————`**', names: [ 
        { key: 'Bash2313', emoji: '<:bash:1424472967714443365>' }, 
        { key: 'INSANE', emoji: '<:insane:1424473401556340746>' }, 
        { key: 'Billy', emoji: '<:billy:1424473031438241955>' }, 
    ]},
    // EXTRA GRUBU
    { title: '**`———— EXTRA ————`**', names: [ 
        { key: 'Marcus', emoji: '<:marcus:1424473475086811188>' }, 
        { key: 'Entity 303', emoji: '<:303:1424455598325633125>' }, 
        { key: 'Watchman / Bekçi', emoji: '<:watchman:1446230946969030737>' }, 
        { key: 'Dr.Reeder', emoji: '<:drreeder:1446196165136617534>' }, 
        { key: 'Dr.Famous', emoji: '<:drfamous:1446196163589181550>' }, 
        { key: 'Dr.Pearson', emoji: '<:drpearson:1446231114430808074>' }, 
    ]},
    // YIKIM TEAM GRUBU
    { title: '**`———— Yıkım Team (1.Sezon) ————`**', names: [ 
        { key: 'Narzoqh', emoji: '<:Narzoqh:1446231305766305969>', extra: ' - **`SAHİP`**' },
        { key: 'GlitchBrine', emoji: '<:glitchbrine:1446231363287253162>' },
        { key: 'EntityZero', emoji: '<:EntityZero:1446231387211563008>' },
        { key: 'Error422', emoji: '<:EntityZero:1446231387211563008>' }, 
        { key: 'Vlrr', emoji: '<:Vllr:1446231469134446694>' },
        { key: 'EnderBrine', emoji: '<:EnderBrine:1446218936436658349>' },
        { key: 'Brine', emoji: '<:brine:1446218934218129470>' },
        { key: 'GreenSteve', emoji: '<:GreenSteve:1446218932053610496>' },
    ]},
];

// Yeni Efsanevi Dünya Listesi
const EFSANEVI_DUNYA_GROUPS = [
    { title: '`———— BoraLo Köyü————`', names: [
        { key: 'BoraLo', emoji: '<:BoraLo:1424455645272473763>' },
        { key: 'CatalinaLo', emoji: '<:catalina:1446195945506082876>' },
        { key: 'BarsLo', emoji: '<:barslo:1446195947792105652>' },
        { key: 'Coco', emoji: '<:coco:1446195949289345146>' },
        { key: 'Zoco', emoji: '<:zoco:1446195952863019201>' },
        { key: 'Buğra', emoji: '<:bugra:1446195954364715273>' },
        { key: 'Bobby1545', emoji: '<:bobby1545:1424455631871672491>' },
        { key: 'Kevin1545', emoji: '<:kevin:1446195846554193940>' },
        { key: 'Cevdet', emoji: '<:cevdet:1446195950845690049>' },
    ]},
    { title: '`———— 1545+ ————`', names: [
        { key: 'Zoggy1545', emoji: '<:zoggy1545:1446195958911340666>' },
        { key: 'Mikula1545', emoji: '<:mikula:1446196169855209583>' },
        { key: 'Earl1545', emoji: '<:earl:1446195844910153728>' },
        { key: 'Dave1545', emoji: '<:dave:1446195848202555576>' },
        { key: 'Chris1545', emoji: '<:chris:1446195849620099204>' },
        { key: 'Blank1545', emoji: '<:blank:1446196168253247719>' },
        { key: 'Wynne1545', emoji: '<:wynne:1446195774898831547>' },
        { key: 'Anna1545', emoji: '<:anna:1446195777079611476>' },
    ]},
    { title: '`———— Düşmanlar ————`', names: [
        { key: 'Turkish Minecraft Legends', emoji: '<:trmc:1424473703504154705>' },
        { key: 'Zeku', emoji: '<:zeku:1446195781114794185>' },
        { key: 'Murdoch', emoji: '<:murdoch:1446195782666420225>' },
    ]},
    { title: '`———— & ————`', names: [
        { key: 'Kassandra', emoji: '<:kassandra:1424473429007929455>' },
        { key: 'Samantha', emoji: '<:samantha:1446195786143764587>' },
        { key: 'DistortedAlex', emoji: '<:distortedalex:1446195695135621253>' }, 
    ]}, 
    { title: '`———— Yabanci Efsaneler ————`', names: [
        { key: 'El-Lick', emoji: '<:ellick:1446195696536391691>' },
        { key: 'El-Dra', emoji: '<:Eldra:1446195698365104251>' },
    ]},
    { title: '`———— Resist The Force ————`', names: [
        { key: 'Rapporteur', emoji: '<:Rapporteur:1446195700529631332>' },
        { key: 'pds1dsa', emoji: '<:pds:1446195702144434266>' },
        { key: 'pds2dsa', emoji: '<:pds:1446195702144434266>' },
        { key: 'cds2dsa', emoji: '<:pds:1446195702144434266>' },
        { key: '?pds?1dsa', emoji: '<:pds:1446195702144434266>' },
        { key: '?3pds?1dsa', emoji: '<:pds:1446195702144434266>' },
    ]},
];

// —————————— LİSTE İÇERİĞİ OLUŞTURMA FONKSİYONLARI ——————————

function generateListContent(groups) {
    let content = '';
    for (const group of groups) {
        content += `\n${group.title}\n\n`;
        for (const efsane of group.names) {
            const claimData = CLAIMED_EFSANE_NAMES.get(efsane.key);
            // Başvuran kişi sadece bu efsaneye başvurmuşsa
            const pendingApp = Array.from(PENDING_APPLICATIONS.values()).find(app => app.efsaneAdi.toLowerCase() === efsane.key.toLowerCase());

            let status = '';
            if (claimData) {
                // Sahipliğin süresi: 48 saat (2 gün)
                const claimDate = new Date(claimData.claimDate);
                const expiryDate = new Date(claimDate.getTime() + 48 * 60 * 60 * 1000);
                const remainingTimeMs = expiryDate.getTime() - Date.now();
                const remainingHours = Math.ceil(remainingTimeMs / (1000 * 60 * 60));

                status = `${efsane.key} » <@${claimData.userId}>`
                
            } else if (pendingApp) {
                status = `**${efsane.key}** **» N/A**`;
            } else {
                status = `**${efsane.key}** **» N/A**`;
            }

            content += `${efsane.emoji} ${status}${efsane.extra || ''}\n`;
        }
    }
    return content;
}

function generateEfsaneListContent() { 
    return generateListContent(EFSANE_GROUPS);
}
function generateEfsaneviDunyaListContent() {
    return generateListContent(EFSANEVI_DUNYA_GROUPS);
}


// —————————— LİSTE GÜNCELLEME FONKSİYONLARI ——————————

/**
 * Verilen listeyi ve başlığı kullanarak Discord kanalındaki mesajı günceller.
 */
async function updateListMessage(client, channelId, generateContentFunc, header) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return console.error(`❌ HATA (Kanalı Bul): Kanal ID ${channelId} bulunamadı veya erişilemedi.`);

    const listContentBody = generateContentFunc(); 
    
    // Kurallar her iki liste için de aynı varsayımıyla eklenir
    const RULE_BLOCK = `\n# <:emoji_12:1395844039164821646> **Kurallar**\n<:alt:1395843867063877693> **2 Günde Bir Efsane Değiştirebilirsiniz.**\n<:alt:1395843867063877693> **Torpil Yoktur. Herkes Form Atmak Zorundadır.**\n<:alt:1395843867063877693> **Maximium Mazaret Günü 3'dür Önemliyse 5 Olabilir.**\n<:alt:1395843867063877693> **Soy Ağacı Her Gün Sonu Düzenlenmelidir.**\n`;

    const fullContent = header + listContentBody + RULE_BLOCK;

    try {
        // --- 1. Adım: Tüm eski bot mesajlarını temizle (Yenileme Sistemi) ---
        const messages = await channel.messages.fetch({ limit: 100 });
        const botMessages = messages.filter(m => m.author.id === client.user.id);
        
        if (botMessages.size > 0) {
            await channel.bulkDelete(botMessages, true).catch(err => {
                console.error("❌ Eski mesajları silerken hata oluştu (bulkDelete):", err.message);
                // Eğer bulkDelete başarısız olursa tek tek silmeyi dene
                for (const message of botMessages.values()) {
                    message.delete().catch(() => {});
                }
            });
            console.log(`✅ ${header} kanalından ${botMessages.size} eski mesaj silindi.`);
        }

        // Discord'un mesaj limitini (2000 karakter) kontrol etme
        const MAX_CHARS = 1950; 
        const parts = [];
        let currentPart = '';
        const lines = fullContent.split('\n');

        for (const line of lines) {
            if (currentPart.length + line.length + 1 > MAX_CHARS && currentPart.length > 0) {
                parts.push(currentPart.trim());
                currentPart = '';
            }
            currentPart += line + '\n';
        }
        if (currentPart.length > 0) {
            parts.push(currentPart.trim());
        }
        if (parts.length === 0) {
             parts.push(header + RULE_BLOCK + 'Liste içeriği boş.');
        }

        // --- 3. Adım: Yeni mesajları sırayla gönder ---
        for (let i = 0; i < parts.length; i++) {
            await channel.send(parts[i]);
            console.log(`✅ ${header} güncellendi (Parça ${i + 1}/${parts.length})`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Rate-limit'i önlemek için kısa bir bekleme
        }
    } catch (error) {
        console.error(`❌ ${header} güncellenirken genel bir hata oluştu:`, error.message);
    }
}

async function updateEfsaneListMessage(client) {
    const header = `# <:Codeman:1445949073940156559> **| Code-Man RP Soy Ağacı ve Efsane Listesi**`;
    await updateListMessage(client, EFSANE_LIST_CHANNEL_ID, generateEfsaneListContent, header);
}

async function updateEfsaneviDunyaListMessage(client) {
    const header = `# <:boralo:1446308753241673849> | BoraLo Efsanevi Dünya Soy Ağacı `;
    await updateListMessage(client, EFSANEVI_DUNYA_CHANNEL_ID, generateEfsaneviDunyaListContent, header);
}

/**
 * Her iki listeyi de günceller.
 */
function updateAllLists(client) {
    console.log('🔄 Tüm Efsane Listeleri güncelleniyor...');
    updateEfsaneListMessage(client);
    updateEfsaneviDunyaListMessage(client);
}


// —————————— BAŞVURU ONAY FONKSİYONU ——————————

/**
 * Başvuru formunu onay kanalına gönderir.
 */
async function sendApplicationToApprovalChannel(client, channelId, data) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
        console.error(`❌ Onay kanalı (${channelId}) bulunamadı veya erişilemedi.`);
        return null;
    }

    const embed = new EmbedBuilder()
        .setColor('Orange')
        .setTitle('⚠️ Yeni Efsane Başvurusu Bekleniyor')
        .setDescription(`**Başvuran Kullanıcı:** <@${data.userId}>`)
        .addFields(
            { name: 'Efsane Adı:', value: data.efsaneAdi, inline: true },
            { name: 'Soy Ağacı:', value: data.soyAgaciDurumu, inline: true },
            { name: 'Boost Durumu:', value: data.boostDurumu, inline: true },
            { name: 'Bulunduğu Evren:', value: data.evren, inline: false },
            { name: 'Güçler / Özellikler', value: data.guculer, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Pearl Studios Efsane Basvuru' });

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`approve_${data.userId}`)
                .setLabel('✅ Onayla')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`reject_${data.userId}`)
                .setLabel('❌ Reddet')
                .setStyle(ButtonStyle.Danger),
        );

    try {
        const message = await channel.send({ embeds: [embed], components: [buttons] });
        console.log(`✅ Yeni Efsane başvurusu ${data.efsaneAdi} onay kanalına gönderildi.`);
        return message;
    } catch (error) {
        console.error('Başvuru onay kanalına gönderilemedi:', error);
        return null;
    }
}


// —————————— SLASH KOMUT TANIMLARI ——————————
const commands = [
    new SlashCommandBuilder()
        .setName('efsane-basvuru')
        .setDescription('Yeni bir Efsane/Karakter başvurusu yapar.'),

    new SlashCommandBuilder()
        .setName('efsane-birak')
        .setDescription('Sahip olduğunuz Efsane/Karakteri bırakır.'),

    // GÜNCEL: /soysifirla komutu (İstenilen seçenekler eklendi)
    new SlashCommandBuilder()
        .setName('soysifirla')
        .setDescription('[ADMİN] Efsane sahipliklerini ve bekleyen başvuruları sıfırlar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Sadece Admin
        .addStringOption(option =>
            option.setName('liste')
                .setDescription('Sıfırlanacak Efsane listesi türü. TÜM sahiplikleri sıfırlar.')
                .setRequired(true)
                .addChoices(
                    { name: 'Code-Man RP Soy Ağacı (Codeman)', value: 'codeman' },
                    { name: 'Efsanevi Dünya Listesi (Efsanevi_Dunya)', value: 'efsanevi_dunya' },
                    { name: 'TÜM LİSTELER (Hepsini sıfırlar)', value: 'all' }
                )),
                
    // YENİ: /yenile komutu (İstenilen gibi her iki listeyi de yenileyecek)
    new SlashCommandBuilder()
        .setName('yenile')
        .setDescription('[ADMİN] Her iki Efsane listesini de manuel olarak günceller.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

// —————————— SLASH KOMUT KAYIT FONKSİYONU ——————————

/**
 * Slash komutlarını Discord API'ye kaydeder.
 */
async function registerSlashCommands(token, clientId) {
    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log('(/) Uygulama (/) komutları yenileniyor...');
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );
        console.log('✅ Uygulama (/) komutları başarıyla yüklendi.');
    } catch (error) {
        console.error('❌ Uygulama komutları yüklenirken hata oluştu:', error);
    }
}


// —————————— READY EVENT ——————————

client.on('ready', () => {
    console.log(`🤖 Bot ${client.user.tag} olarak giriş yaptı!`);
    loadEfsaneData(); // Verileri yükle
    
    // Slash komutlarını bot giriş yaptıktan sonra ve client.user.id ile kaydet
    registerSlashCommands(process.env.DISCORD_TOKEN, client.user.id);
    
    // Bot başladıktan sonra her iki listeyi de otomatik olarak günceller
    updateAllLists(client);
    
    // Güncelleme zamanlayıcısını başlat (Örneğin: Her 5 dakikada bir)
    setInterval(() => updateAllLists(client), 5 * 60 * 1000); // 5 dakika
});

// —————————— INTERACTION (SLASH COMMANDS & BUTTONS) ——————————

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const { commandName } = interaction;
        const channelId = interaction.channelId;

        // GÜNCEL: /soysifirla komutunun işlenmesi
        if (commandName === 'soysifirla') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Bu komutu kullanmak için Yöneticilik yetkisine sahip olmalısınız.', ephemeral: true });
            }

            const listType = interaction.options.getString('liste');
            
            if (listType === 'codeman' || listType === 'efsanevi_dunya' || listType === 'all') {
                const resetMessage = listType === 'all'
                    ? '⚠️ **TÜM LİSTELER** için Efsane sahiplikleri ve bekleyen başvurular kalıcı olarak SIFIRLANDI.'
                    : `⚠️ **${listType === 'codeman' ? 'Code-Man RP Soy Ağacı (Codeman)' : 'Efsanevi Dünya Listesi'}** için Efsane sahiplikleri ve bekleyen başvurular kalıcı olarak SIFIRLANDI.`;

                resetAllEfsaneData(listType);
                await interaction.reply({ content: resetMessage + '\nListeler otomatik olarak güncelleniyor...', ephemeral: false });
                updateAllLists(client);
            } else {
                await interaction.reply({ content: '❌ Geçersiz liste türü seçeneği.', ephemeral: true });
            }
            return; // İşlem tamamlandı
        } 
        
        // GÜNCEL: /yenile komutunun işlenmesi (Her iki soy ağacını da yenileme)
        if (commandName === 'yenile') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Bu komutu kullanmak için Yöneticilik yetkisine sahip olmalısınız.', ephemeral: true });
            }
            
            // updateAllLists zaten hem Efsane hem de Efsanevi Dünya listelerini güncelliyor
            await interaction.reply({ content: '✅ Her iki Efsane listesi de manuel olarak güncelleniyor...', ephemeral: true });
            updateAllLists(client);
            return; // İşlem tamamlandı
        }

        // GÜNCEL: /efsane-basvuru komutu için kanal kısıtlamaları
        if (commandName === 'efsane-basvuru') {
            const RESTRICTED_CHANNELS = [EFSANE_LIST_CHANNEL_ID, EFSANEVI_DUNYA_CHANNEL_ID];
            const ALLOWED_CHANNEL = EFSANE_BASVURU_CHANNEL_ID;

            // Kural: Yasaklı Kanallarda (Listelerin bulunduğu kanallar) komutu engelle/sil
            if (RESTRICTED_CHANNELS.includes(channelId)) {
                // Komut otomatik silinir, kullanıcıya geçici bildirim gider
                await interaction.reply({ content: '❌ Bu kanalda `/efsane-basvuru` komutu kullanılamaz. Komut otomatik olarak silinmiştir.', ephemeral: true });
                return; 
            }

            // Kural: Sadece Belirlenen Kanalda (1434552801475825675) çalışsın
            if (channelId !== ALLOWED_CHANNEL) {
                return interaction.reply({ content: `❌ \`${commandName}\` komutu sadece <#${ALLOWED_CHANNEL}> kanalında kullanılabilir.`, ephemeral: true });
            }

            const userId = interaction.user.id;
            // KURAL 1: Zaten atanmış bir efsanesi varsa engelle (Onaylanmış karakter)
            const userIsClaimed = Array.from(CLAIMED_EFSANE_NAMES.values()).some(data => data.userId === userId);
            // KURAL 2: Bekleyen bir başvurusu varsa engelle (Onaylanana veya Reddedilene kadar)
            const userIsPending = PENDING_APPLICATIONS.has(userId);

            if (userIsClaimed) {
                return interaction.reply({ content: '❌ Zaten bir Efsane/Karaktere sahipsiniz. Yeni bir başvuru yapabilmek için mevcut karakterinizi `/efsane-birak` komutu ile bırakmalısınız.', ephemeral: true });
            }
            if (userIsPending) {
                return interaction.reply({ content: '❌ Bekleyen bir başvurunuz zaten mevcut. Yeni bir başvuru yapmadan önce mevcut başvurunuzun onaylanmasını/reddedilmesini beklemelisiniz.', ephemeral: true });
            }

            // Başvuru modalını göster (YENİ YAPILANDIRMA)
            const modal = new ModalBuilder()
                .setCustomId(`efsane_form_${userId}`) // Kullanıcı ID'si ile CustomID
                .setTitle(`Efsane Başvuru Formu`);

            // Input Alanları
            const efsaneAdiInput = new TextInputBuilder()
                .setCustomId('efsane_adi')
                .setLabel("Efsane Adı (Örn: Code-Man)")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(2)
                .setMaxLength(30);

            const boostDurumu = new TextInputBuilder()
                .setCustomId('boost_durumu')
                .setLabel("Boost Durumu (Örn: Server Booster / Yok)")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(3);

            const soyAgaciDurumu = new TextInputBuilder()
                .setCustomId('soy_agaci')
                .setLabel("Hangi Soy Ağacı (Codeman/Efsanevi Dünya)?")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(3);
                
            const evren = new TextInputBuilder()
                .setCustomId('evren')
                .setLabel("Bulunduğu Evren (Örn: Pearl Studios Evreni)")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(3);

            const guculer = new TextInputBuilder()
                .setCustomId('guculer')
                .setLabel("Güçler / Özellikler (Kısa Açıklama)")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMinLength(10);

            const row1 = new ActionRowBuilder().addComponents(efsaneAdiInput);
            const row2 = new ActionRowBuilder().addComponents(boostDurumu);
            const row3 = new ActionRowBuilder().addComponents(soyAgaciDurumu);
            const row4 = new ActionRowBuilder().addComponents(evren);
            const row5 = new ActionRowBuilder().addComponents(guculer);

            modal.addComponents(row1, row2, row3, row4, row5);

            await interaction.showModal(modal);
        } else if (commandName === 'efsane-birak') {
            const userId = interaction.user.id;
            // 1. Kullanıcının sahip olduğu efsaneyi bul
            const claimedEntry = Array.from(CLAIMED_EFSANE_NAMES.entries()).find(([key, data]) => data.userId === userId);

            if (!claimedEntry) {
                return interaction.reply({ content: '❌ Şu anda sahip olduğunuz bir Efsane/Karakter bulunmamaktadır.', ephemeral: true });
            }

            const [efsaneAdi, data] = claimedEntry;
            const claimDate = data.claimDate;
            const COOLDOWN_MS = 48 * 60 * 60 * 1000; // 2 gün (48 saat)

            // 2. 2 günlük kuralı kontrol et
            if (Date.now() - claimDate < COOLDOWN_MS) {
                const remainingTimeMs = claimDate + COOLDOWN_MS - Date.now();
                const remainingHours = Math.ceil(remainingTimeMs / (1000 * 60 * 60));
                return interaction.reply({ content: `❌ **${efsaneAdi}** karakterini bırakmak için 2 günlük süreyi doldurmadınız. Karakteri bırakabilmeniz için yaklaşık **${remainingHours} saat** daha beklemeniz gerekmektedir.`, ephemeral: true });
            }

            // 3. Efsaneyi bırak ve listeleri güncelle
            unclaimEfsane(efsaneAdi);
            await interaction.reply({ content: `✅ **${efsaneAdi}** Efsane/Karakterini başarıyla bıraktınız. Artık yeni bir başvuru yapabilirsiniz. Listeler güncelleniyor...`, ephemeral: true });
            updateAllLists(client);
        }
    } else if (interaction.isModalSubmit()) {
        // Modal Gönderimi İşleme
        if (interaction.customId.startsWith('efsane_form_')) {
            const userId = interaction.customId.split('_')[2]; 

            // YENİ FORM ALANLARI
            const efsaneAdiInput = interaction.fields.getTextInputValue('efsane_adi').trim();
            const boostDurumu = interaction.fields.getTextInputValue('boost_durumu').trim();
            const soyAgaciDurumu = interaction.fields.getTextInputValue('soy_agaci').trim().toLowerCase();
            const evren = interaction.fields.getTextInputValue('evren');
            const guculer = interaction.fields.getTextInputValue('guculer');

            // Büyük/küçük harf kontrolü yap
            const isEfsaneviDunya = soyAgaciDurumu.includes('efsanevi dünya');

            const basvuruData = {
                userId: userId,
                efsaneAdi: efsaneAdiInput,
                boostDurumu: boostDurumu,
                soyAgaciDurumu: soyAgaciDurumu,
                evren: evren,
                guculer: guculer,
                isEfsaneviDunya: isEfsaneviDunya
            };

            await interaction.reply({ content: '✅ Başvurunuz başarıyla alındı ve onaylanmak üzere yetkili kanala gönderildi. Lütfen bekleyiniz.', ephemeral: true });

            // Onay kanalını belirle
            const onayChannelId = basvuruData.isEfsaneviDunya ? EFSANEVI_DUNYA_ONAY_CHANNEL_ID : EFSANE_ONAY_CHANNEL_ID;
            
            const message = await sendApplicationToApprovalChannel(client, onayChannelId, basvuruData);

            if (message) {
                // BAŞVURUYU BEKLEYENLER LİSTESİNE EKLE (Başvuru Kilidi)
                PENDING_APPLICATIONS.set(userId, { 
                    efsaneAdi: basvuruData.efsaneAdi, 
                    messageId: message.id, 
                    isEfsaneviDunya: basvuruData.isEfsaneviDunya 
                });
                saveEfsaneData();
            }
        }
    } else if (interaction.isButton()) {
        // Onay/Red Butonları
        if (interaction.customId.startsWith('approve_') || interaction.customId.startsWith('reject_')) {
            // YÖNETİCİ İZNİ KONTROLÜ
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Bu işlemi gerçekleştirmek için Yöneticilik yetkisine sahip olmalısınız.', ephemeral: true });
            }

            const isApprove = interaction.customId.startsWith('approve_');
            const userId = interaction.customId.split('_')[1]; 

            // PENDING_APPLICATIONS'ı güncellemek için kullanıcı ID'sinden veriyi çek
            const pendingApp = PENDING_APPLICATIONS.get(userId);
            
            // Efsane adını Embed'den al
            const efsaneAdiField = interaction.message.embeds[0].fields.find(f => f.name.startsWith('Efsane Adı:'));
            const efsaneAdi = efsaneAdiField ? efsaneAdiField.value.trim() : null;

            if (!efsaneAdi) {
                return interaction.reply({ content: '❌ Efsane adı embed mesajından alınamadı.', ephemeral: true });
            }

            // Başvuruyu bekleyenler listesinden kaldır
            PENDING_APPLICATIONS.delete(userId);
            saveEfsaneData();

            // Mesajın butonlarını ve rengini güncelle
            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
            const updatedComponents = []; // Butonları kaldır
            let replyContent = '';

            if (isApprove) {
                // Onaylandı: Sahipliği ata ve listeleri güncelle
                claimEfsane(efsaneAdi, userId);
                updatedEmbed.setColor('Green').setTitle('✅ Başvuru **ONAYLANDI**');
                replyContent = `✅ <@${userId}> kullanıcısının **${efsaneAdi}** Efsane başvurusu başarıyla onaylandı. Listeler güncelleniyor...`;
                updateAllLists(client);
            } else {
                // Reddedildi: Sadece mesajı güncelle
                updatedEmbed.setColor('Red').setTitle('❌ Başvuru **REDDEDİLDİ**');
                replyContent = `❌ <@${userId}> kullanıcısının **${efsaneAdi}** Efsane başvurusu reddedildi. Artık yeni bir başvuru yapabilir.`;
                // Reddedilen kullanıcının claim'i olmadığı için unclaim/update gerekmez.
            }
            
            // Sonuç mesajını düzenle
            await interaction.message.edit({ embeds: [updatedEmbed], components: updatedComponents });

            // Kullanıcıya genel kanaldan (veya ephemeral olarak) yanıt ver
            await interaction.reply({ content: replyContent, ephemeral: false }); 
        }
    }
});

// —————————— MESSAGE CREATE EVENT (Kanal Kısıtlamaları) ——————————

client.on('messageCreate', async message => {
    // Botun kendi mesajlarını ignore et
    if (message.author.bot) return;

    const RESTRICTED_CHANNELS = [EFSANE_LIST_CHANNEL_ID, EFSANEVI_DUNYA_CHANNEL_ID];

    const isBasvuruChannel = message.channelId === EFSANE_BASVURU_CHANNEL_ID;
    const isRestrictedChannel = RESTRICTED_CHANNELS.includes(message.channelId);
    
    // KURAL 2: Listelerin bulunduğu kanallarda (1434552782341279846, 1434552785868816485) her mesajı otomatik sil (Admin olsa dahi)
    if (isRestrictedChannel) {
        await message.delete().catch(err => console.error("Mesaj silinemedi (Yasaklı Liste Kanalı):", err.message));
        return;
    }

    // KURAL 3: Başvuru kanalında (1434552801475825675) sadece '/efsane-basvuru' komutuna izin ver veya adminlere serbestlik tanı
    if (isBasvuruChannel) {
        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
        if (!member) return; 

        const hasAdminPermission = member.permissions.has(PermissionFlagsBits.Administrator);
        const messageContent = message.content.trim();

        if (!hasAdminPermission) {
            // Admin olmayanlar için kontrol
            const isEfsaneBasvuruCommand = messageContent.startsWith('/efsane-basvuru'); // Slash komutu olduğunu varsayıyoruz
            const isOnlySlashCommand = messageContent.startsWith('/'); // Diğer komutları engellemek için

            if (isOnlySlashCommand && isEfsaneBasvuruCommand) {
                // Sadece /efsane-basvuru'ya izin veriyoruz, diğer slash komutları (eğer varsa) veya normal mesajları siliyoruz
                // Discord otomatik olarak slash komutunu sildiği için burada sadece tam eşleşmeyen komutları silmek mantıklı olabilir.
                // Ancak kullanıcı isteği net: sadece /efsane-basvuru yazabilir.
                return; // /efsane-basvuru slash komutu tetiklenmiştir, bir şey yapmaya gerek yok.
            } else {
                 // Farklı bir komut veya normal mesaj ise sil
                 await message.delete().catch(err => console.error("Mesaj silinemedi (Başvuru Kanalı - Admin olmayan):", err.message));
                 return;
            }
        }
    }
});


// —————————— BOT ÇÖKMESİNİ ENGELLEME VE HTTP SERVER ——————————

// Bot Çökmesini Engelleme ve HTTP Server Kodu 
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Pearl Studios Bot Aktif!');
});

server.listen(5000, '0.0.0.0', () => {
    console.log('Web server port 5000 üzerinde çalışıyor - Bot asla kapanmayacak!');
});

// Bot çökmesini engelle
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    // process.exit(1); // Gerekirse botu yeniden başlat
});

// —————————— BOT GİRİŞİ ——————————
client.login(process.env.DISCORD_TOKEN);