import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type MDXFrontmatter = {
  title: string;
  description?: string;
  image?: string;
  date?: string;
  author?: string;
  tags?: string[];
  [key: string]: unknown;
};

export type MDXContent = {
  frontmatter: MDXFrontmatter;
  content: string;
  slug: string;
  sourcePath: string;
  lastModified: Date;
};

/**
 * Lee un archivo MDX de content/pages/{locale}/{slug}.mdx
 */
export async function getPageContent(
  locale: string,
  slug: string
): Promise<MDXContent | null> {
  const filePath = path.join(CONTENT_DIR, "pages", locale, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    // Fallback a español si no existe en el idioma solicitado
    const fallbackPath = path.join(CONTENT_DIR, "pages", "es", `${slug}.mdx`);
    if (!fs.existsSync(fallbackPath)) return null;
    return readMDXFile(fallbackPath, slug);
  }

  return readMDXFile(filePath, slug);
}

/**
 * Lee todos los posts del blog por locale
 */
export async function getBlogPosts(locale: string): Promise<MDXContent[]> {
  const dir = path.join(CONTENT_DIR, "blog", locale);

  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .sort()
    .reverse(); // más recientes primero

  return files
    .map((file) => {
      const slug = file.replace(/\.mdx?$/, "");
      return readMDXFile(path.join(dir, file), slug);
    })
    .filter((p): p is MDXContent => p !== null);
}

/**
 * Lee el contenido MDX de una lección del curso.
 * Ruta: content/course/{locale}/{slug}.mdx
 * Fallback a español si no existe en el idioma solicitado.
 */
export async function getLessonContent(
  locale: string,
  slug: string
): Promise<MDXContent | null> {
  const filePath = path.join(CONTENT_DIR, "course", locale, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    // Fallback a español
    const fallbackPath = path.join(CONTENT_DIR, "course", "es", `${slug}.mdx`);
    if (!fs.existsSync(fallbackPath)) return null;
    return readMDXFile(fallbackPath, slug);
  }

  return readMDXFile(filePath, slug);
}

/**
 * Lee un post individual del blog
 */
export async function getBlogPost(
  locale: string,
  slug: string
): Promise<MDXContent | null> {
  const filePath = path.join(CONTENT_DIR, "blog", locale, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  return readMDXFile(filePath, slug);
}

function readMDXFile(filePath: string, slug: string): MDXContent | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const stats = fs.statSync(filePath);
    const { data, content } = matter(raw);
    return {
      frontmatter: data as MDXFrontmatter,
      content,
      slug,
      sourcePath: filePath,
      lastModified: stats.mtime,
    };
  } catch {
    return null;
  }
}
