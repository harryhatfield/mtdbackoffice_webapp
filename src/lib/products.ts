export type ProductKey = "setup" | "sprint" | "care_99" | "care_299" | "care_599";
export type TaskOwner = "you" | "us";
export type TaskDef = { key: string; title: string; help: string; owner: TaskOwner; href?: string };

export const PRODUCTS: Record<ProductKey, { name: string; price: string; blurb: string; tasks: TaskDef[] }> = {
  setup: {
    name: "MTD & Admin Setup",
    price: "£495 one-off",
    blurb: "HMRC-recognised software, bank feeds, receipt capture and invoice reminders. Delivered within 10 working days.",
    tasks: [
      { key: "business", title: "Tell us about your business", help: "Trading name, type, year end and who your accountant is.", owner: "you", href: "/dashboard/business" },
      { key: "client_details", title: "Set up what your clients see", help: "Payment terms, bank details and how your reminders should sound.", owner: "you", href: "/dashboard/client-details" },
      { key: "documents", title: "Upload last year's records", help: "Bank statements, invoices and anything your accountant gave you.", owner: "you", href: "/dashboard/documents" },
      { key: "hmrc_authority", title: "Give us HMRC agent authority", help: "We'll send you the HMRC link to approve. It takes about two minutes.", owner: "you" },
      { key: "software", title: "Pick and set up your MTD software", help: "We choose HMRC-recognised software that suits you and set it up.", owner: "us" },
      { key: "bank_feed", title: "Connect your bank feed", help: "We guide you through the secure bank approval.", owner: "us" },
      { key: "receipts", title: "Switch on receipt capture", help: "Snap a photo, it files itself.", owner: "us" },
      { key: "reminders", title: "Turn on invoice reminders", help: "Using the details you gave us.", owner: "us" },
      { key: "handover", title: "Handover walkthrough", help: "A short guide so you know exactly what to do each quarter.", owner: "us" },
    ],
  },
  sprint: {
    name: "Automation Sprint",
    price: "£1,500 one-off",
    blurb: "Three automations plus an AI assistant trained on your documents. Two weeks.",
    tasks: [
      { key: "business", title: "Tell us about your business", help: "So we understand how your team works.", owner: "you", href: "/dashboard/business" },
      { key: "processes", title: "List the jobs you want to stop doing by hand", help: "Add at least three. Tell us what triggers them and how long they take.", owner: "you", href: "/dashboard/processes" },
      { key: "documents", title: "Upload documents for your AI assistant", help: "Price lists, FAQs, templates, past quotes. Whatever you'd want it to know.", owner: "you", href: "/dashboard/documents" },
      { key: "access", title: "Share access to the tools involved", help: "We'll message you the safest way to do this for each tool.", owner: "you" },
      { key: "plan", title: "Sprint plan agreed", help: "We pick the three automations with the biggest payoff.", owner: "us" },
      { key: "build", title: "Build the automations", help: "Built and tested on your real data.", owner: "us" },
      { key: "assistant", title: "Train your AI assistant", help: "On the documents you uploaded.", owner: "us" },
      { key: "handover", title: "Review and handover", help: "A walkthrough plus written notes.", owner: "us" },
    ],
  },
  care_99: { name: "Ongoing care", price: "£99 / month", blurb: "Quarterly MTD help and a named person to ask.", tasks: [] },
  care_299: { name: "Growth care", price: "£299 / month", blurb: "More support hours for busier teams.", tasks: [] },
  care_599: { name: "Pro care", price: "£599 / month", blurb: "Priority support and regular automation tweaks.", tasks: [] },
};

export const isProductKey = (k: string): k is ProductKey => k in PRODUCTS;
export const isCare = (k: string) => k.startsWith("care_");

export const BUSINESS_TYPES = [
  ["sole_trader", "Sole trader"], ["landlord", "Landlord"], ["partnership", "Partnership"], ["limited_company", "Limited company"],
] as const;
export const TURNOVER_BANDS = ["Under £30,000", "£30,000 – £50,000", "£50,000 – £90,000", "£90,000 – £250,000", "Over £250,000"];

/** What we charge at checkout (GBP, pence, ex-VAT). Care plans are monthly subscriptions. */
export const PRICING: Record<ProductKey, { pence: number; mode: "payment" | "subscription"; description: string }> = {
  setup: { pence: 49500, mode: "payment", description: "HMRC-recognised MTD software, bank feeds, receipt capture and invoice reminders. Delivered within 10 working days." },
  sprint: { pence: 150000, mode: "payment", description: "Three automations plus an AI assistant trained on your documents. Two weeks." },
  care_99: { pence: 9900, mode: "subscription", description: "Monthly checks, fixes and quarterly MTD reminders." },
  care_299: { pence: 29900, mode: "subscription", description: "Growth plan: more support hours for busier teams." },
  care_599: { pence: 59900, mode: "subscription", description: "Pro plan: priority support and regular automation tweaks." },
};
