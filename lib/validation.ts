import { z } from "zod";
import { services } from "./site";

export const vehicleTypes = ["hatchback", "sedan", "suv", "luxury", "bike"] as const;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const leadSchema = z.object({
  /** Monthly subscription or one-time car cleaning (cars only, checked separately: see oneTimeVehicleError). */
  service: z.enum(services).default("subscription"),
  vehicle: z.enum(vehicleTypes, { message: "Please choose your vehicle type" }),
  vehicleModel: optionalText(60),
  vehicleCount: z.coerce.number().int().min(1).max(5).default(1),

  name: z.string().trim().min(2, "Please enter your name").max(80),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  sameWhatsapp: z.boolean().default(true),
  whatsapp: optionalText(10).refine((v) => !v || /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit WhatsApp number"),

  society: z.string().trim().min(2, "Please enter your society / apartment name").max(120),
  towerFlat: optionalText(60),
  locality: z.string().trim().min(2, "Please enter your locality").max(80),
  parkingType: optionalText(20),
  parkingSlot: optionalText(30),

  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a start date"),
  preferredTime: optionalText(30),
  vehicleColour: optionalText(30),
  registrationNo: optionalText(15),
  heardFrom: optionalText(40),
  notes: optionalText(300),

  consent: z.literal(true, { message: "Please agree so we can contact you about your booking" }),
  callbackRequested: z.boolean().default(false),
});

export type LeadInput = z.infer<typeof leadSchema>;

/** One-time cleaning is for cars only. Kept outside the schema so `leadSchema.pick` still works per step. */
export const oneTimeVehicleError = (d: { service?: string; vehicle?: string }) =>
  d.service === "one_time" && d.vehicle === "bike" ? "One-time cleaning is available for cars only" : undefined;

export const stepFields: Record<number, (keyof LeadInput)[]> = {
  1: ["service", "vehicle", "vehicleModel", "vehicleCount"],
  2: ["name", "mobile", "whatsapp"],
  3: ["society", "towerFlat", "locality", "parkingType", "parkingSlot"],
  4: ["startDate", "preferredTime", "vehicleColour", "registrationNo", "heardFrom", "notes", "consent"],
};
