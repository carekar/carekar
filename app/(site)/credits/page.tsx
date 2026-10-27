import type { Metadata } from "next";

export const metadata: Metadata = { title: "Image credits", robots: { index: false } };

const credits = [
  ["Cleaning close-ups (exterior, interior)", "Pexels — Tima Miroshnichenko, Khunkorn Laowisit and others", "Pexels Licence", "https://www.pexels.com/license/"],
  ["Hatchback", "Wikimedia Commons — Maruti Suzuki Swift 2092.JPG", "CC BY-SA 3.0", "https://commons.wikimedia.org/wiki/File:Maruti_Suzuki_Swift_2092.JPG"],
  ["Sedan", "Wikimedia Commons — Honda City 2020.jpg", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Honda_City_2020.jpg"],
  ["SUV", "Wikimedia Commons — 2021 Mahindra XUV700 (India) front view", "CC BY 3.0", "https://commons.wikimedia.org/wiki/File:2021_Mahindra_XUV700_2.2_AX7_(India)_front_view.png"],
  ["Luxury", "Wikimedia Commons — Mercedes-Benz E-Class (W213)", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:MERCEDES-BENZ_E-CLASS_(W213)_China.jpg"],
  ["Scooter", "Wikimedia Commons — Honda Activa Rental, Goa", "CC0", "https://commons.wikimedia.org/wiki/File:Honda_Activa_Rental-_Goa_1.jpg"],
  ["Society towers", "Wikimedia Commons — Devika Gold Homz, Greater Noida", "CC BY 4.0", "https://commons.wikimedia.org/wiki/File:Devika_Gold_Homz_Greater_Noida.jpg"],
];

export default function Credits() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <h1 className="text-[32px] font-extrabold text-forest-900">Image credits</h1>
      <p className="mt-2 text-ink-600">Photos on this site are illustrative. Commons images are cropped and resized.</p>
      <ul className="mt-6 divide-y divide-cream-200 rounded-2xl bg-white">
        {credits.map(([what, src, lic, url]) => (
          <li key={what} className="p-4 text-sm">
            <p className="font-semibold text-forest-900">{what}</p>
            <a href={url} target="_blank" rel="noopener" className="text-ink-600 underline">{src}</a> · {lic}
          </li>
        ))}
      </ul>
    </div>
  );
}
