const { onRequest } = require("firebase-functions/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();

const db = admin.firestore();

const TEXTS = {
  startCheck: {
    nl: "Vergeten in te tikken vandaag?",
    en: "Did you forget to clock in today?",
    fr: "Avez-vous oublié de pointer aujourd'hui ?",
    de: "Hast du heute vergessen einzuchecken?",
    pl: "Zapomniałeś dzisiaj się zalogować?",
    es: "¿Olvidaste fichar hoy?",
    hu: "Elfelejtettél ma bejelentkezni?",
    it: "Hai dimenticato di timbrare oggi?"
  },
  forgotCheckout: {
    nl: "Vergeten uit te tikken?",
    en: "Did you forget to clock out?",
    fr: "Avez-vous oublié de pointer en sortant ?",
    de: "Hast du vergessen auszuchecken?",
    pl: "Zapomniałeś się wylogować?",
    es: "¿Olvidaste fichar la salida?",
    hu: "Elfelejtettél kijelentkezni?",
    it: "Hai dimenticato di timbrare l'uscita?"
  },
  noLogs: {
    nl: "Geen logs vandaag. Vergeten te tikken?",
    en: "No logs today. Did you forget to clock in?",
    fr: "Aucun log aujourd'hui. Avez-vous oublié de pointer ?",
    de: "Keine Einträge heute. Hast du vergessen einzuchecken?",
    pl: "Brak wpisów dzisiaj. Zapomniałeś się zalogować?",
    es: "No hay registros hoy. ¿Olvidaste fichar?",
    hu: "Ma nincs napló. Elfelejtettél bejelentkezni?",
    it: "Nessun registro oggi. Hai dimenticato di timbrare?"
  },
  title: {
    nl: "Shift-Tap herinnering",
    en: "Shift-Tap reminder",
    fr: "Rappel Shift-Tap",
    de: "Shift-Tap Erinnerung",
    pl: "Przypomnienie Shift-Tap",
    es: "Recordatorio Shift-Tap",
    hu: "Shift-Tap emlékeztető",
    it: "Promemoria Shift-Tap"
  }
};

function pickLang(userData) {
  const lang = (userData?.settings?.language || userData?.language || "en").toLowerCase();
  return TEXTS.title[lang] ? lang : "en";
}

async function sendPushToUser(userId, kind) {
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) return;

  const userData = userSnap.data() || {};
  const token = userData?.messaging?.token;
  const notifEnabled = userData?.notificationSettings?.enabled;

  if (!token || notifEnabled !== true) return;

  const lang = pickLang(userData);
  const title = TEXTS.title[lang];
  const body = TEXTS[kind][lang];

  await admin.messaging().send({
    token,
    notification: {
      title,
      body
    },
    webpush: {
      notification: {
        title,
        body,
        icon: "/ST-logo.png"
      }
    }
  });

  console.log(`Push gestuurd naar user ${userId}: ${kind} (${lang})`);
}

exports.helloWorld = onRequest((request, response) => {
  response.send("Shift-Tap Functions werken!");
});

exports.shiftTapMorningCheck = onSchedule(
  { schedule: "0 8 * * *", timeZone: "Europe/Brussels" },
  async () => {
    console.log("Shift-Tap 08:00 check gestart");

    const usersSnap = await db.collection("users").get();
    for (const doc of usersSnap.docs) {
      await sendPushToUser(doc.id, "startCheck");
    }
  }
);

exports.shiftTapAfternoonCheck = onSchedule(
  { schedule: "30 16 * * *", timeZone: "Europe/Brussels" },
  async () => {
    console.log("Shift-Tap 16:30 check gestart");

    const usersSnap = await db.collection("users").get();
    for (const doc of usersSnap.docs) {
      await sendPushToUser(doc.id, "forgotCheckout");
    }
  }
);

exports.shiftTapEveningCheck = onSchedule(
  { schedule: "0 19 * * *", timeZone: "Europe/Brussels" },
  async () => {
    console.log("Shift-Tap 19:00 check gestart");

    const usersSnap = await db.collection("users").get();
    for (const doc of usersSnap.docs) {
      await sendPushToUser(doc.id, "noLogs");
    }
  }
);