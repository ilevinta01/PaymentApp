// Версия текста политики. При любом изменении текста ниже увеличьте версию —
// в базе сохраняется, какую именно версию принял родитель.
export const POLICY_VERSION = "2026-11-24";

export const CONSENT_ACCEPT = `consent:accept:${POLICY_VERSION}`;
export const CONSENT_DECLINE = "consent:decline";

export function policyTextRu(schoolName: string): string {
  return [
    "Политика конфиденциальности и согласие на обработку персональных данных",
    "",
    `Детский центр «${schoolName}» (далее — Центр) использует этого бота, чтобы присылать вам чеки об оплате, напоминания и уведомления о занятиях вашего ребёнка.`,
    "",
    "Какие данные мы обрабатываем:",
    "• данные ребёнка: ФИО, группа, сведения об оплатах и об индивидуальных занятиях (даты, преподаватель, стоимость), а также статус занятий (активен, перерыв, отпуск, пропуск по болезни);",
    "• ваши данные: ФИО, номер телефона и идентификатор вашего чата в Telegram.",
    "",
    "Зачем: учёт оплат, уведомления о занятиях и платежах, связь с вами. Мы не используем данные для рекламы и не передаём их посторонним лицам.",
    "",
    "Кому доступны: сотрудникам Центра и техническим сервисам, обеспечивающим работу системы (хостинг и база данных в ЕС и США, мессенджер Telegram).",
    "",
    "Срок хранения: пока ребёнок занимается в Центре, и далее в пределах сроков, установленных законом для финансовых документов; после этого данные удаляются или обезличиваются.",
    "",
    "Ваши права: узнать, какие данные о вас и ребёнке хранятся, исправить их, потребовать удаления, ограничить обработку, в любой момент отозвать согласие командой /revoke (после отзыва уведомления прекращаются), а также подать жалобу в Национальный центр по защите персональных данных (CNPDCP). По всем вопросам обращайтесь в администрацию Центра.",
    "",
    "Нажимая «Согласен», вы подтверждаете, что являетесь родителем или законным представителем ребёнка, прочитали этот текст и даёте согласие на обработку указанных данных, включая сведения о пропусках по болезни, на этих условиях.",
  ].join("\n");
}

export function policyTextRo(schoolName: string): string {
  return [
    "Politica de confidențialitate și acordul privind prelucrarea datelor cu caracter personal",
    "",
    `Centrul pentru copii «${schoolName}» (în continuare — Centrul) folosește acest bot pentru a vă trimite chitanțe de plată, memento-uri și notificări despre orele copilului dumneavoastră.`,
    "",
    "Ce date prelucrăm:",
    "• datele copilului: numele și prenumele, grupa, informații despre plăți și despre orele individuale (date, profesor, cost), precum și statutul frecventării (activ, pauză, concediu, absență din motive de boală);",
    "• datele dumneavoastră: numele și prenumele, numărul de telefon și identificatorul chatului dumneavoastră din Telegram.",
    "",
    "În ce scop: evidența plăților, notificări despre ore și plăți, comunicarea cu dumneavoastră. Nu folosim datele în scopuri publicitare și nu le transmitem unor terți.",
    "",
    "Cine are acces: angajații Centrului și serviciile tehnice care asigură funcționarea sistemului (găzduire și bază de date în UE și SUA, mesageria Telegram).",
    "",
    "Perioada de stocare: cât timp copilul frecventează Centrul și ulterior în limitele termenelor prevăzute de lege pentru documentele financiare; după aceasta datele se șterg sau se anonimizează.",
    "",
    "Drepturile dumneavoastră: să aflați ce date despre dumneavoastră și despre copil sunt stocate, să le rectificați, să cereți ștergerea, să restricționați prelucrarea, să retrageți oricând acordul prin comanda /revoke (după retragere notificările încetează), precum și să depuneți o plângere la Centrul Național pentru Protecția Datelor cu Caracter Personal (CNPDCP). Pentru orice întrebări adresați-vă administrației Centrului.",
    "",
    "Apăsând «De acord», confirmați că sunteți părintele sau reprezentantul legal al copilului, ați citit acest text și vă dați acordul pentru prelucrarea datelor indicate, inclusiv a informațiilor despre absențele din motive de boală, în aceste condiții.",
  ].join("\n");
}

export const CONSENT_PROMPT =
  "Для получения уведомлений необходимо ваше согласие с текстом выше.\nPentru a primi notificări este necesar acordul dumneavoastră cu textul de mai sus.";

export const BUTTONS = {
  accept: "✅ Согласен / De acord",
  decline: "❌ Не согласен / Nu sunt de acord",
};

export const MESSAGES = {
  accepted:
    "Спасибо! Согласие сохранено — теперь вы будете получать уведомления. Отозвать согласие можно в любой момент командой /revoke.\n\nMulțumim! Acordul a fost salvat — de acum veți primi notificări. Puteți retrage acordul oricând prin comanda /revoke.",
  declined:
    "Без согласия мы не можем присылать вам уведомления. Если передумаете — отправьте /start.\n\nFără acord nu vă putem trimite notificări. Dacă vă răzgândiți — trimiteți /start.",
  alreadyAccepted:
    "Вы уже дали согласие на уведомления. Отозвать его можно командой /revoke.\n\nAți dat deja acordul pentru notificări. Îl puteți retrage prin comanda /revoke.",
  revoked:
    "Согласие отозвано, уведомления отключены. Чтобы снова подключить их — отправьте /start.\n\nAcordul a fost retras, notificările au fost dezactivate. Pentru a le reactiva — trimiteți /start.",
};
