import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";
import { canTransition } from "../transitions.js";

const router = Router();
router.use(requireAuth); // every inquiry route needs a valid session

const createSchema = z.object({
  customer_name: z.string().trim().min(1, "Customer name is required").max(150),
  contact: z.string().trim().min(3, "Contact is required").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(5000),
});

const statusSchema = z.object({
  status: z.enum(["New", "In Progress", "Resolved"]),
  expectedVersion: z.number().int().positive(),
  note: z.string().trim().max(1000).optional(),
});

// Ownership rule: admin sees all, staff sees only their own
function ownerClause(user, paramIndex) {
  return user.role === "admin" ? { sql: "", params: [] } : { sql: ` AND created_by = $${paramIndex}`, params: [user.id] };
}

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid inquiry id" });
    return null;
  }
  return id;
}

// Create (with simple duplicate policy)
router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", fields: parsed.error.flatten().fieldErrors });
  }
  const d = parsed.data;

  // Duplicate policy: same user, same contact + subject within 10 minutes
  const dup = await pool.query(
    `SELECT id FROM inquiries
     WHERE created_by = $1 AND LOWER(contact) = LOWER($2) AND LOWER(subject) = LOWER($3)
       AND created_at > NOW() - INTERVAL '10 minutes'
     LIMIT 1`,
    [req.user.id, d.contact, d.subject]
  );
  if (dup.rows[0]) {
    return res.status(409).json({ error: "A similar inquiry was just submitted", existingId: dup.rows[0].id });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO inquiries (customer_name, contact, subject, description, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [d.customer_name, d.contact, d.subject, d.description, req.user.id]
    );
    await client.query(
      `INSERT INTO inquiry_events (inquiry_id, actor_id, from_status, to_status, note)
       VALUES ($1, $2, NULL, 'New', 'Inquiry created')`,
      [rows[0].id, req.user.id]
    );
    await client.query("COMMIT");
    res.status(201).json({ inquiry: rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// List with filter (status) and search (q)
router.get("/", async (req, res) => {
  const params = [];
  let sql = "SELECT * FROM inquiries WHERE 1=1";

  const own = ownerClause(req.user, params.length + 1);
  sql += own.sql;
  params.push(...own.params);

  const { status, q } = req.query;
  if (status) {
    if (!["New", "In Progress", "Resolved"].includes(status)) {
      return res.status(400).json({ error: "Invalid status filter" });
    }
    params.push(status);
    sql += ` AND status = $${params.length}`;
  }
  if (q && String(q).trim()) {
    params.push(`%${String(q).trim()}%`);
    sql += ` AND (customer_name ILIKE $${params.length} OR subject ILIKE $${params.length} OR contact ILIKE $${params.length})`;
  }
  sql += " ORDER BY updated_at DESC";

  const { rows } = await pool.query(sql, params);
  res.json({ inquiries: rows });
});

// Get one (404 if missing OR not yours, so existence is not leaked)
router.get("/:id", async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  const own = ownerClause(req.user, 2);
  const { rows } = await pool.query(`SELECT * FROM inquiries WHERE id = $1${own.sql}`, [id, ...own.params]);
  if (!rows[0]) return res.status(404).json({ error: "Inquiry not found" });

  const events = await pool.query(
    `SELECT e.*, u.name AS actor_name FROM inquiry_events e
     JOIN users u ON u.id = e.actor_id
     WHERE e.inquiry_id = $1 ORDER BY e.created_at ASC`,
    [id]
  );
  res.json({ inquiry: rows[0], events: events.rows });
});

// Change status (transition rules + optimistic locking)
router.patch("/:id/status", async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", fields: parsed.error.flatten().fieldErrors });
  }
  const { status, expectedVersion, note } = parsed.data;

  const own = ownerClause(req.user, 2);
  const current = await pool.query(`SELECT * FROM inquiries WHERE id = $1${own.sql}`, [id, ...own.params]);
  const inquiry = current.rows[0];
  if (!inquiry) return res.status(404).json({ error: "Inquiry not found" });

  if (inquiry.version !== expectedVersion) {
    return res.status(409).json({
      error: "This inquiry was changed elsewhere. Reload to see the latest version.",
      code: "STALE_VERSION",
      current: inquiry,
    });
  }
  if (!canTransition(inquiry.status, status)) {
    return res.status(409).json({
      error: `Cannot change status from "${inquiry.status}" to "${status}"`,
      code: "INVALID_TRANSITION",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // WHERE version = $3 guards against a race between the check above and this update
    const upd = await client.query(
      `UPDATE inquiries SET status = $1, version = version + 1, updated_at = NOW()
       WHERE id = $2 AND version = $3 RETURNING *`,
      [status, id, expectedVersion]
    );
    if (!upd.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "This inquiry was changed elsewhere. Reload to see the latest version.", code: "STALE_VERSION" });
    }
    await client.query(
      `INSERT INTO inquiry_events (inquiry_id, actor_id, from_status, to_status, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, req.user.id, inquiry.status, status, note ?? null]
    );
    await client.query("COMMIT");
    res.json({ inquiry: upd.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

export default router;