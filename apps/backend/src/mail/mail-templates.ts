function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function layout(title: string, paragraphs: string[], buttonText: string, link: string, footer: string) {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.5">${escapeHtml(p)}</p>`)
    .join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px">
<h2 style="margin:0 0 16px;color:#0f172a">${escapeHtml(title)}</h2>${body}
<p style="margin:20px 0"><a href="${link}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;display:inline-block">${escapeHtml(buttonText)}</a></p>
<p style="margin:0 0 6px;color:#64748b;font-size:13px">Если кнопка не работает, скопируйте ссылку в браузер:<br><span style="word-break:break-all">${escapeHtml(link)}</span></p>
<p style="margin:14px 0 0;color:#94a3b8;font-size:12px">${escapeHtml(footer)}</p></div>`;
}

export function inviteEmail(fullName: string, link: string) {
  const text =
    `Здравствуйте, ${fullName}!\n\nДля вас создан аккаунт в системе «Оплата». ` +
    `Откройте ссылку, чтобы подтвердить email и задать свой пароль (ссылка действует 7 дней):\n${link}\n\n` +
    `Если вы не ожидали это письмо, просто проигнорируйте его.`;
  const html = layout(
    "Добро пожаловать в «Оплата»",
    [`Здравствуйте, ${fullName}!`, "Для вас создан аккаунт. Подтвердите email и задайте свой пароль. Ссылка действует 7 дней."],
    "Подтвердить email и задать пароль",
    link,
    "Если вы не ожидали это письмо, просто проигнорируйте его.",
  );
  return { subject: "Приглашение в систему «Оплата»", text, html };
}

export function resetEmail(fullName: string, link: string, locked: boolean) {
  const lead = locked
    ? "Ваш аккаунт заблокирован после трёх неверных попыток ввода пароля. Чтобы разблокировать его, задайте новый пароль."
    : "Мы получили запрос на восстановление пароля. Задайте новый пароль по кнопке ниже.";
  const text =
    `Здравствуйте, ${fullName}!\n\n${lead}\nСсылка действует 1 час:\n${link}\n\n` +
    `Если это были не вы, проигнорируйте письмо — ваш пароль не изменится.`;
  const html = layout(
    locked ? "Аккаунт заблокирован" : "Восстановление пароля",
    [`Здравствуйте, ${fullName}!`, lead, "Ссылка действует 1 час."],
    "Задать новый пароль",
    link,
    "Если это были не вы, проигнорируйте письмо — ваш пароль не изменится.",
  );
  return { subject: locked ? "Аккаунт заблокирован — «Оплата»" : "Восстановление пароля — «Оплата»", text, html };
}
