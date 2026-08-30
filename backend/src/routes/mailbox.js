import { Router } from "express";
import { query } from "../db.js";
import { adminRequired } from "../middleware/auth.js";
import {
  createLabel,
  getAttachment,
  getMessage,
  invalidateMailboxCache,
  isMailboxConfigured,
  listFolders,
  listMessages,
  mailboxConfig,
  moveMessage,
  refreshMailboxSettings,
  sendMailboxMessage,
  setFlags,
} from "../services/mailbox.js";

const router = Router();

function fail(res, err) {
  const status = /not found/i.test(err.message)
    ? 404
    : /required|invalid|login failed|Enter /i.test(err.message)
      ? 400
      : 500;
  res.status(status).json({ error: err.message || "Mailbox error." });
}

router.get("/config", adminRequired, async (_req, res) => {
  try {
    await refreshMailboxSettings();
  } catch {
    /* env fallback still works */
  }
  const cfg = mailboxConfig();
  const configured = isMailboxConfigured();
  res.json({
    configured,
    needsSetup: !configured,
    email: cfg.user,
    name: cfg.displayName,
    host: cfg.host,
    imapPort: cfg.imapPort,
    smtpPort: cfg.smtpPort,
  });
});

/** Save IMAP login from Admin → Mailbox (stored in DB settings; never returned publicly). */
router.put("/credentials", adminRequired, async (req, res) => {
  try {
    const user = String(req.body?.user || req.body?.imap_user || "")
      .trim()
      .toLowerCase();
    const pass = String(req.body?.pass || req.body?.imap_pass || "").trim();
    const host = String(
      req.body?.host || req.body?.imap_host || "palmpizzakitchen.com",
    ).trim();
    const name = String(
      req.body?.name || req.body?.mailbox_name || "Palm Pizza Kitchen",
    ).trim();
    const imapPort = String(req.body?.imapPort || req.body?.imap_port || "993");
    const smtpPort = String(
      req.body?.smtpPort || req.body?.mailbox_smtp_port || "465",
    );
    const imapIp = String(
      req.body?.imapIp || req.body?.imap_ip || "68.65.123.100",
    ).trim();

    if (!user || !user.includes("@")) {
      return res.status(400).json({ error: "Enter a valid mailbox email." });
    }
    if (!pass) {
      return res.status(400).json({ error: "Enter the mailbox password." });
    }

    const pairs = [
      ["imap_user", user],
      ["imap_pass", pass],
      ["imap_host", host || "palmpizzakitchen.com"],
      ["imap_ip", imapIp || "68.65.123.100"],
      ["imap_port", imapPort || "993"],
      ["imap_tls_name", host || "palmpizzakitchen.com"],
      ["mailbox_name", name || "Palm Pizza Kitchen"],
      ["mailbox_smtp_port", smtpPort || "465"],
    ];
    for (const [key, value] of pairs) {
      await query(
        `INSERT INTO settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, value],
      );
    }

    invalidateMailboxCache();
    await refreshMailboxSettings();

    if (!isMailboxConfigured()) {
      return res.json({
        ok: true,
        configured: false,
        error: "Saved, but mailbox is still not configured.",
      });
    }

    try {
      await listFolders();
      return res.json({ ok: true, configured: true, email: user });
    } catch (err) {
      return res.status(400).json({
        ok: false,
        configured: false,
        error:
          err instanceof Error
            ? err.message
            : "Saved, but login to the mailbox failed. Check the password.",
      });
    }
  } catch (err) {
    fail(res, err);
  }
});

router.get("/folders", adminRequired, async (_req, res) => {
  try {
    await refreshMailboxSettings();
    if (!isMailboxConfigured()) {
      return res.status(503).json({
        error:
          "Mailbox is not configured. Open Admin → Mailbox and save the info@ password, or set IMAP_PASS on the API server.",
        folders: [],
        labels: [],
      });
    }
    const data = await listFolders();
    res.json(data);
  } catch (err) {
    fail(res, err);
  }
});

router.post("/folders", adminRequired, async (req, res) => {
  try {
    const data = await createLabel(req.body?.name);
    res.status(201).json(data);
  } catch (err) {
    fail(res, err);
  }
});

router.get("/messages", adminRequired, async (req, res) => {
  try {
    const data = await listMessages({
      folder: String(req.query.folder || "INBOX"),
      q: String(req.query.q || ""),
      filter: String(req.query.filter || "all"),
      page: Number(req.query.page || 1),
      pageSize: Number(req.query.pageSize || 40),
    });
    res.json(data);
  } catch (err) {
    fail(res, err);
  }
});

router.get("/messages/:uid", adminRequired, async (req, res) => {
  try {
    const data = await getMessage(
      String(req.query.folder || "INBOX"),
      req.params.uid,
    );
    res.json({ message: data });
  } catch (err) {
    fail(res, err);
  }
});

router.get("/messages/:uid/attachments/:index", adminRequired, async (req, res) => {
  try {
    const att = await getAttachment(
      String(req.query.folder || "INBOX"),
      req.params.uid,
      req.params.index,
    );
    res.setHeader(
      "Content-Type",
      att.contentType || "application/octet-stream",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${String(att.filename).replace(/"/g, "")}"`,
    );
    res.send(att.content);
  } catch (err) {
    fail(res, err);
  }
});

router.post("/messages/:uid/flags", adminRequired, async (req, res) => {
  try {
    const data = await setFlags(
      String(req.body?.folder || req.query.folder || "INBOX"),
      req.params.uid,
      {
        seen: req.body?.seen,
        flagged: req.body?.flagged,
        deleted: req.body?.deleted,
      },
    );
    res.json(data);
  } catch (err) {
    fail(res, err);
  }
});

router.post("/messages/:uid/move", adminRequired, async (req, res) => {
  try {
    const to = String(req.body?.to || "").trim();
    if (!to) return res.status(400).json({ error: "Destination folder required." });
    const data = await moveMessage(
      String(req.body?.from || req.query.folder || "INBOX"),
      req.params.uid,
      to,
    );
    res.json(data);
  } catch (err) {
    fail(res, err);
  }
});

router.post("/send", adminRequired, async (req, res) => {
  try {
    const data = await sendMailboxMessage({
      to: req.body?.to,
      cc: req.body?.cc,
      subject: req.body?.subject,
      text: req.body?.text,
      html: req.body?.html,
      inReplyTo: req.body?.inReplyTo,
      references: req.body?.references,
      saveDraft: Boolean(req.body?.saveDraft),
    });
    res.status(201).json(data);
  } catch (err) {
    fail(res, err);
  }
});

export default router;
