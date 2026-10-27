import { readDB, statusLabel } from "@/lib/store";
import { filterLeads } from "@/lib/leads";
import { can, getAdmin } from "@/lib/admin";

// CSV of customer details: editors and the super admin only.
export async function GET(req: Request) {
  if (!can(await getAdmin(), "editor")) return new Response("Editor access needed to export leads", { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const db = await readDB();
  const rows = filterLeads(db.leads, sp);
  const cols = ["ref", "createdAt", "status", "service", "name", "mobile", "whatsapp", "vehicle", "vehicleModel", "vehicleCount", "planPrice", "society", "towerFlat", "locality", "parkingType", "parkingSlot", "startDate", "preferredTime", "vehicleColour", "registrationNo", "heardFrom", "notes", "callbackRequested", "customerEmail", "source", "campaign"] as const;
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    cols.join(","),
    ...rows.map((l) =>
      cols
        .map((c) =>
          esc(c === "status" ? statusLabel[l.status] : c === "source" ? l.firstTouch?.channel : c === "campaign" ? l.firstTouch?.campaign : l[c as keyof typeof l]),
        )
        .join(","),
    ),
  ].join("\n");
  return new Response("﻿" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="carekar-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
