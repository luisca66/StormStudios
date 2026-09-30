import type {Metadata} from "next";
import {setRequestLocale} from "next-intl/server";
import type {Locale} from "@/i18n/routing";
import {createPageMetadata} from "@/lib/seo/page-alternates";
import SequencerStudio from "@/components/sequencer/SequencerStudio";

type Props={params:Promise<{locale:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {locale}=await params;
  return createPageMetadata({locale:locale as Locale,urls:{es:"/es/sequencer/v4",en:"/en/sequencer/v4"},title:"Storm Sequencer v4.0",description:locale==="es"?"Escribe música con mouse, teclado o texto. Partitura continua, páginas y cuarteto SATB.":"Write music with mouse, keyboard or text. Continuous score, pages and SATB quartet.",noIndex:true});
}
export default async function SequencerV4Page({params}:Props){
  const {locale}=await params;setRequestLocale(locale);return <SequencerStudio locale={locale}/>;
}
