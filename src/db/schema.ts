import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  passwordHash: text("password_hash"),
  role: text("role", { enum: ["customer", "admin"] }).notNull().default("customer"),
  createdAt: createdAt(),
});

export const sessions = pgTable("sessions", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

// One-time links: "setup" (activate account / set first password) and "reset"
export const authTokens = pgTable("auth_tokens", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["setup", "reset"] }).notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const loginAttempts = pgTable("login_attempts", {
  id: id(),
  key: text("key").notNull(),
  createdAt: createdAt(),
}, (t) => [index("login_attempts_key_idx").on(t.key, t.createdAt)]);

// A purchase is keyed by email so it can exist before the customer has an account.
export const purchases = pgTable("purchases", {
  id: id(),
  email: text("email").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  productKey: text("product_key").notNull(),
  source: text("source", { enum: ["manual", "stripe"] }).notNull().default("manual"),
  externalRef: text("external_ref"),
  createdAt: createdAt(),
}, (t) => [index("purchases_email_idx").on(t.email), uniqueIndex("purchases_ext_idx").on(t.externalRef, t.productKey)]);

export const businesses = pgTable("businesses", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  tradingName: text("trading_name").default(""),
  businessType: text("business_type").default(""),      // sole_trader | landlord | partnership | limited_company
  legalName: text("legal_name").default(""),
  companyNumber: text("company_number").default(""),
  vatNumber: text("vat_number").default(""),
  utrEnc: text("utr_enc"),                               // encrypted
  niEnc: text("ni_enc"),                                 // encrypted
  yearEnd: text("year_end").default(""),                 // e.g. "05-04"
  turnoverBand: text("turnover_band").default(""),
  addressLine1: text("address_line1").default(""),
  addressLine2: text("address_line2").default(""),
  city: text("city").default(""),
  postcode: text("postcode").default(""),
  phone: text("phone").default(""),
  website: text("website").default(""),
  teamSize: integer("team_size"),
  currentSoftware: text("current_software").default(""),
  bankProvider: text("bank_provider").default(""),
  accountantName: text("accountant_name").default(""),
  accountantEmail: text("accountant_email").default(""),
  notes: text("notes").default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Details that appear on documents/messages sent to the customer's own clients.
export const clientDetails = pgTable("client_details", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").default(""),
  replyToEmail: text("reply_to_email").default(""),
  contactPhone: text("contact_phone").default(""),
  invoicePrefix: text("invoice_prefix").default("INV-"),
  paymentTermsDays: integer("payment_terms_days").default(14),
  accountName: text("account_name").default(""),
  sortCode: text("sort_code").default(""),
  accountNumber: text("account_number").default(""),
  paymentLink: text("payment_link").default(""),
  reminderTone: text("reminder_tone").default("friendly"), // friendly | neutral | firm
  reminderDays: jsonb("reminder_days").$type<number[]>().default([3, 7, 14]),
  signature: text("signature").default(""),
  lateFeeNote: text("late_fee_note").default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productKey: text("product_key").notNull(),
  taskKey: text("task_key").notNull(),
  status: text("status", { enum: ["todo", "in_progress", "done", "blocked"] }).notNull().default("todo"),
  note: text("note").default(""),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("tasks_user_task_idx").on(t.userId, t.productKey, t.taskKey)]);

export const processes = pgTable("processes", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  trigger: text("trigger").default(""),
  steps: text("steps").default(""),
  tools: text("tools").default(""),
  timesPerWeek: integer("times_per_week").default(1),
  minutesEach: integer("minutes_each").default(10),
  priority: integer("priority").default(2), // 1 = top
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  category: text("category").notNull().default("other"),
  storageKey: text("storage_key").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const tickets = pgTable("tickets", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
});

export const ticketMessages = pgTable("ticket_messages", {
  id: id(),
  ticketId: uuid("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  fromStaff: boolean("from_staff").notNull().default(false),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

export const auditLog = pgTable("audit_log", {
  id: id(),
  userId: uuid("user_id"),     // whose data
  actorId: uuid("actor_id"),   // who did it
  action: text("action").notNull(),
  createdAt: createdAt(),
});
