This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Design System & UI Standards (NBA 2K Parity)

When developing UI components, especially for the inventory and shop, adhere to the following strict visual standards we established to match the original game:

### 1. Item Card Backgrounds (Halftone Effect)
Items should not have flat background colors. They must use a glowing, interleaved diagonal polka-dot halftone pattern that matches their rarity color:
- **Dot Size:** `1px` dots (subtle).
- **Grid Spacing:** `10px 10px` size with an interleaved offset (`0 0, 5px 5px`).
- **Glow Mask:** Use a radial gradient mask centered in the middle of the card (`radial-gradient(circle at center, black 10%, transparent 80%)`) to create a spotlight effect.
- **Animation:** Add a smooth pulse animation (`animate-pulse`) to the halftone layer to simulate a glowing effect.

### 2. Action Buttons (Clipping Paths)
Buttons must maintain a precise symmetrical visual balance through CSS clipping:
- **Left Button ("Get"):** Must have its **bottom-left** corner clipped.
  - `clipPath: 'polygon(0 0, 100% 0, 100% 100%, 12px 100%, 0 calc(100% - 12px))'`
- **Right Button ("Use"):** Must have its **top-right** corner clipped.
  - `clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)'`
- When paired, buttons should be placed in a grid layout (`grid grid-cols-2 gap-3`) so their physical widths perfectly balance the negative space created by the clipped corners.

### 3. Info Boxes & Panels
- **Headers:** Keep panel headers solid (e.g. `bg-[#4b555d]`) with clipped edges. Avoid diagonal stripes or noisy backgrounds in the header itself.
- **Bodies:** Use the subtle diagonal stripe pattern for the background of info bodies to add texture:
  - `backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 2px, transparent 2px, transparent 6px)'`
- **Global Alignment:** Do not use legacy global margins (like `mb-[85px]`) that push content up and expose the background wallpaper. Panels should float cleanly above the stone wall background with consistent padding.
