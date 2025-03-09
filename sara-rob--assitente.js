const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox'] }
});

const saraData = {
    name: "Sara",
    agency: "Manso Serenatas",
    packages: {
        "Básico": { price: 10000, songs: 2 },
        "Intermediário": { price: 18000, songs: 3, extras: "buquê pequeno" },
        "Premium": { price: 35000, songs: 3, extras: "caixa explosiva + bolo" }
    },
    schedule: {},
    clients: {}
};

function loadData() {
    if (fs.existsSync('sara_data.json')) {
        const data = fs.readFileSync('sara_data.json');
        Object.assign(saraData, JSON.parse(data));
    }
}
function saveData() {
    fs.writeFileSync('sara_data.json', JSON.stringify(saraData, null, 2));
}

client.on('qr', (qr) => {
    console.log('Escaneie este QR com o WhatsApp:', qr);
});

client.on('ready', () => {
    console.log('Sara Mobile está pronta!');
    loadData();
});

client.on('message', async (message) => {
    const clientNumber = message.from;
    const clientText = message.body.toLowerCase();

    let clientName = saraData.clients[clientNumber]?.name;
    if (!clientName && clientText.includes("sou")) {
        clientName = clientText.split("sou")[1].trim().split(" ")[0].capitalize();
        saraData.clients[clientNumber] = { name: clientName };
        saveData();
    }

    if (!clientName) {
        await message.reply("Olá! Sou Sara, da Manso Serenatas. Como se chama?");
        return;
    }

    let response;
    if (clientText.includes("quanto") || clientText.includes("preço")) {
        response = `Olá, ${clientName}. Uma serenata é especial! Temos o Básico por 10.000 Kz, o Intermediário por 18.000 Kz com buquê, e o Premium por 35.000 Kz com extras. Qual te interessa?`;
    } else if (clientText.includes("marcar") || clientText.includes("sábado")) {
        const { date, time, location } = extractDetails(clientText);
        if (!date || !time || !location) {
            response = `Olá, ${clientName}. Me diga o dia, horário e local (ex.: sábado às 19h no Kilamba).`;
        } else if (!saraData.schedule[date]?.[time]) {
            saraData.schedule[date] = saraData.schedule[date] || {};
            saraData.schedule[date][time] = location;
            saveData();
            response = `Agendado, ${clientName}! Serenata para ${date} às ${time} em ${location}.`;
        } else {
            response = `Desculpe, ${clientName}, o horário ${time} em ${date} está ocupado.`;
        }
    } else {
        response = `Olá, ${clientName}. Como posso ajudar com a Manso Serenatas?`;
    }

    await message.reply(response);
    await client.sendMessage(clientNumber, "Salve meu número como ‘Manso Serenatas – Sara’.");
});

function extractDetails(text) {
    const date = text.includes("sábado") ? "2025-03-15" : null;
    const time = text.includes("19h") ? "19:00" : text.includes("17h") ? "17:00" : null;
    const location = text.includes("kilamba") ? "Kilamba" : null;
    return { date, time, location };
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

app.get('/status', (req, res) => {
    res.json({
        clients: Object.keys(saraData.clients).length,
        schedule: saraData.schedule,
        status: "Rodando"
    });
});

app.listen(PORT, () => {
    console.log(`Monitoramento em porta ${PORT}`);
});

client.initialize();
