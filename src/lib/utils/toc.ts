import { ListProps } from "@chakra-ui/react"

import type { ToCItem, TocNodeType } from "@/lib/types"

// RegEx patterns
const customIdRegEx = /^.+(\s*\{#([^\}]+?)\}\s*)$/
const emojiRegEx = /<Emoji [^/]+\/>/g
const h1RegEx = /mdx\("h1"/g

/**
 * Creates a slug from a string (Hello world => hello-world)
 * @param s Any string
 * @returns Lowercased string with spaces replaced with hyphens (kebab-casing)
 */
const slugify = (s: string): string =>
  encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, "-"))

/**
 * Parse a heading ID from a heading string. If the heading contains a custom ID,
 * it will be used as the ID, otherwise the heading will be slugified and used.
 * @param heading Heading string without leading #s that may contain a {#custom-id}
 * @returns Heading ID string
 */
export const parseHeadingId = (heading: string): string => {
  const match = customIdRegEx.exec(heading)
  return match ? match[2].toLowerCase() : slugify(heading)
}

/**
 * Common props used used for the outermost list element in the mobile and desktop renders
 */
export const outerListProps: ListProps = {
  borderStart: "1px solid",
  borderStartColor: "dropdownBorder",
  borderTop: 0,
  fontSize: "sm",
  lineHeight: 1.6,
  fontWeight: 400,
  m: 0,
  mt: 2,
  mb: 2,
  ps: 4,
  pe: 1,
  pt: 0,
  sx: {
    // TODO: Flip to object syntax with `lg` token after completion of Chakra migration
    "@media (max-width: var(--eth-breakpoints-lg))": {
      borderStart: 0,
      borderTop: "1px",
      borderTopColor: "primary300",
      ps: 0,
      pt: 4,
    },
  },
}

/**
 * Removes any custom ID and Emoji components from a heading string
 * @param title Heading string, not yet trimmed
 * @returns Trimmed heading string
 */
export const trimmedTitle = (title: string): string => {
  const match = customIdRegEx.exec(title)
  const trimmedTitle = match ? title.replace(match[1], "").trim() : title

  // Removes Twemoji components from title
  const emojiMatch = emojiRegEx.exec(trimmedTitle)
  return emojiMatch ? trimmedTitle.replaceAll(emojiRegEx, "") : trimmedTitle
}

/**
 * Recursive function to sanitize original `title` property, and extract appropriate heading id
 * title comes in form 'A note on names {#a-note-on-names}'
 * url is in form '#a-note-on-names'... if no {#name} exists, call slugify(title) for url
 * @param item: Of ToCItem type, { title: string, url: string, items?: ToCItem[] }
 * @returns Updated ToCItem with cleaned up title, url, and any subitems
 */
const parseItem = (item: ToCItem): ToCItem => {
  const { title, items: subItems } = item
  const parsedItem = {
    title: trimmedTitle(title),
    url: `#${parseHeadingId(title)}`,
  }
  if (!subItems) return parsedItem
  return {
    ...parsedItem,
    items: subItems.map(parseItem),
  }
}

/**
 * Remaps the ToC generated by remarkInferToc plugin (@/lib/rehype/remarkInferToc.ts)
 * Note: each file should only have one h1, and it is not included in the ToC
 * @param tocNodeItems Array of TocNodeType objects generated by remarkInferToc
 * @returns Modified array of ToCItem objects
 */

export const remapTableOfContents = (
  tocNodeItems: TocNodeType[],
  compiledSource: string
): ToCItem[] => {
  const h1Count = Array.from(compiledSource.matchAll(h1RegEx)).length
  if (h1Count > 1 && "url" in tocNodeItems[0]) {
    console.warn("More than one h1 found in file at id:", tocNodeItems[0].url)
  }
  const items = (
    h1Count > 0 && "items" in tocNodeItems[0]
      ? tocNodeItems[0].items
      : tocNodeItems
  ) as ToCItem[]
  return items.map(parseItem)
}
