// Single source of site content — from the client's written brief.
// Phase 2 moves plans/contact into the admin-editable settings table.

export const site = {
  name: "CAREKAR",
  tagline: "Your Car • Our Care",
  url: "https://carekar.in",
  area: "Greater Noida West",
  areaFull: "Greater Noida West, Uttar Pradesh",
  contact: {
    phone: "9205622238",
    whatsapp: "9205622238",
    email: "", // to be created — hidden on site while empty
  },
};

export type VehicleType = "hatchback" | "sedan" | "suv" | "luxury" | "bike";

export type Plan = {
  vehicle: VehicleType;
  label: string;
  price: number;
  image: string;
  examples: string;
  inclusions: string[];
  popular?: boolean;
};

const carInclusions = [
  "26 scheduled exterior cleaning visits / month",
  "Weekly interior cleaning",
  "Service updates on WhatsApp",
  "Trained & verified staff",
];

export const plans: Plan[] = [
  { vehicle: "hatchback", label: "Hatchback", price: 599, image: "/images/v-hatchback.webp", examples: "Swift, i20, Baleno, Tiago", inclusions: carInclusions },
  { vehicle: "sedan", label: "Sedan", price: 699, image: "/images/v-sedan.webp", examples: "City, Dzire, Verna, Ciaz", inclusions: carInclusions, popular: true },
  { vehicle: "suv", label: "SUV / MUV", price: 799, image: "/images/v-suv.webp", examples: "Creta, XUV700, Ertiga, Innova", inclusions: carInclusions },
  { vehicle: "luxury", label: "Luxury", price: 999, image: "/images/v-luxury.webp", examples: "Mercedes, BMW, Audi, Volvo", inclusions: carInclusions },
  {
    vehicle: "bike",
    label: "Bike / Scooty",
    price: 249,
    image: "/images/v-bike.webp",
    examples: "Activa, Splendor, Pulsar, Jupiter",
    inclusions: ["26 scheduled cleaning visits / month", "Service updates on WhatsApp", "Trained & verified staff"],
  },
];

export const planByVehicle = (v: string | null | undefined) => plans.find((p) => p.vehicle === v);

export const formatINR = (n: number) => "₹" + n.toLocaleString("en-IN");

export const waLink = (text: string) =>
  `https://wa.me/91${site.contact.whatsapp}?text=${encodeURIComponent(text)}`;

export const telLink = `tel:+91${site.contact.phone}`;

// Type-ahead suggestions for the booking form. Phase 2: managed in admin → Societies.
export const knownSocieties = [
  "Gaur City 1",
  "Gaur City 2",
  "Gaur Saundaryam",
  "Supertech Ecovillage 1",
  "Supertech Ecovillage 2",
  "Ace City",
  "Mahagun Mywoods",
  "Nirala Estate",
  "Panchsheel Greens",
  "Cherry County",
  "Galaxy North Avenue",
  "Ajnara Homes",
  "Eldeco Live by the Greens",
  "Arihant Arden",
  "Paramount Emotions",
];

export const faqs = [
  {
    q: "When does the cleaning happen?",
    a: "Exterior cleaning is done on 26 scheduled days every month. Exact timings for your society are shared on WhatsApp once availability is confirmed.",
  },
  {
    q: "What is included in interior cleaning?",
    a: "Cars get interior cleaning once every week. Our team will coordinate with you on WhatsApp for access to the car.",
  },
  {
    q: "Do I need to be present during cleaning?",
    a: "Not for exterior cleaning. For weekly interior cleaning we will coordinate a convenient slot with you on WhatsApp.",
  },
  {
    q: "When do I pay?",
    a: "Only after we confirm that we service your society. You will receive a secure payment link on WhatsApp, and your subscription starts after payment.",
  },
  {
    q: "Is my society covered?",
    a: "We are launching in Greater Noida West. Submit your details and our team will confirm availability in your society.",
  },
  {
    q: "Are your staff verified?",
    a: "Yes. All cleaning staff are trained and verified before they are assigned to a society.",
  },
];

export const howItWorks = [
  { title: "Choose Your Plan", text: "Pick your vehicle type and see your monthly price." },
  { title: "Submit Your Details", text: "Share your name, society and preferred start date." },
  { title: "Confirm Availability", text: "We confirm service in your society on WhatsApp or phone." },
  { title: "Start Your Subscription", text: "Pay securely and your scheduled cleaning begins." },
];
