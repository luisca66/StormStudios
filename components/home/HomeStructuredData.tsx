import { JsonLd } from "@/components/JsonLd";
import { getTranslations } from "next-intl/server";

export async function HomeStructuredData() {
  const t = await getTranslations("home.structuredData");

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "EducationalOrganization",
            "@id": "https://www.stormstudios.com.mx/#organization",
            name: t("organization.name"),
            url: "https://www.stormstudios.com.mx",
            logo: "https://www.stormstudios.com.mx/images/logo-storm.png",
            sameAs: [
              "https://www.youtube.com/@StormStudiosLearning",
              "https://www.instagram.com/stormstudioslearning",
            ],
            areaServed: "MX",
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer support",
              availableLanguage: ["Spanish", "English"],
            },
          },
          {
            "@type": "WebSite",
            "@id": "https://www.stormstudios.com.mx/#website",
            url: "https://www.stormstudios.com.mx",
            name: t("website.name"),
            description: t("website.description"),
            publisher: { "@id": "https://www.stormstudios.com.mx/#organization" },
            inLanguage: ["es-MX", "en-US"],
          },
        ],
      }}
    />
  );
}
