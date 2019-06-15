import { Node } from 'gatsby'
export const NODE_TYPE = 'FrontmatterMarkdownFile'

export type PluginOptions = { whitelist: string[] } | { blacklist: string[] } | undefined

export const isFrontmatterMarkdownFileNode = (n: Node) =>
  n.internal.type === NODE_TYPE

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
