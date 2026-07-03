// Root layout passthrough: el <html> real vive en app/[locale]/layout.tsx.
// Este archivo existe solo porque app/not-found.tsx (el 404 raíz que Next
// prerenderiza como /_not-found) exige un layout raíz.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
