import { Node } from 'gatsby'
export const NODE_TYPE = 'FrontmatterMarkdownFile'

export type FrontmatterMarkdownFileNode = Node & {
  frontmatterField: string
  frontmatterValue: string
}

export type PluginOptions =
  | { whitelist: string[] }
  | { blacklist: string[] }
  | undefined

export const isFrontmatterMarkdownFileNode = (
  n: Node,
): n is FrontmatterMarkdownFileNode => n.internal.type === NODE_TYPE

export const isFrontmatterMarkdownNode = ({
  node,
  getNode,
}: {
  node: Node
  getNode: (id: string) => Node | undefined | null
}) => {
  const parent = node.parent ? getNode(node.parent) : null
  return !!(parent && isFrontmatterMarkdownFileNode(parent))
}

type UnionToIntersection<U> = (U extends any
  ? (k: U) => void
  : never) extends ((k: infer I) => void)
  ? I
  : never
type EntryToObject<E extends [keyof any, any]> = { [k in E[0]]: E[1] }
type EntriesToObject<E extends Array<[keyof any, any]>> = UnionToIntersection<
  {
    [idx in keyof E]: E[idx] extends [keyof any, any]
      ? EntryToObject<E[idx]>
      : never
  }[number]
>

// since node LTS doesn't yet support Object.fromEntries
export const fromEntries = <E extends Array<[keyof any, any]>>(entries: E) =>
  entries.reduce(
    (obj, [key, val]) => (((obj as any)[key] = val), obj),
    {} as EntriesToObject<E>,
  )

export * from './gatsby-node'
