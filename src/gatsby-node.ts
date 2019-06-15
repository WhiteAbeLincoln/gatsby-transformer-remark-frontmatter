import { Node, GatsbyNode, NodePluginArgs } from 'gatsby'
import { NODE_TYPE, isFrontmatterMarkdownNode } from './index'

const createFrontmatterMdFileNode = async (
  {
    createNodeId,
    createContentDigest,
    getNode,
    reporter,
    actions: { createNode, createParentChildLink },
  }: NodePluginArgs,
  [field, value]: [string, string],
  parent: Node | null | undefined = null,
) => {
  const parentParent = parent && parent.parent && getNode(parent.parent)
  const fileParent =
    parentParent && parentParent.internal.type === 'File' ? parentParent : null

  const frontmatterMdNode = ({
    // lots of plugins check if a markdown node's parent has file attributes
    // (gatsby-remark-images checks for `dir`) but don't actually check if
    // internal.type is File. This is good for us, we can pretend that this
    // is a File, which lets us support those plugins with no downsides.
    // unfortunately if a plugin does a more throughough check, this will fail
    // and there is no alternative. Ideally plugins should just check for
    // the fields that they use, or recursively check all parents until a File
    // is found
    ...fileParent,
    id: createNodeId(`${NODE_TYPE}:${field}`),
    // @ts-ignore
    parent: parent && parent.id,
    children: [],
    // @ts-ignore
    internal: {
      content: value,
      contentDigest: createContentDigest(value),
      mediaType: 'text/markdown',
      type: NODE_TYPE,
    },
    frontmatterfield: field,
    frontmatterValue: value,
  } as unknown) as Node

  // errors if fields are set on a new node
  // unfortunately we can't reuse any third-party
  // changes to file nodes
  delete frontmatterMdNode.fields

  await createNode(frontmatterMdNode)

  if (parent) createParentChildLink({ parent, child: frontmatterMdNode })

  // actually a string[], gatsby's typings are incorrect here
  // children is never a Node[], always just a list of ids
  const childField = ((frontmatterMdNode.children || []) as unknown) as string[]

  const children = childField.reduce(
    (acc, cid) => {
      const n = getNode(cid)
      if (n && n.internal.type === 'MarkdownRemark') acc.push(n)
      return acc
    },
    [] as Node[],
  )

  if (children.length > 1) {
    reporter.warn(
      `${NODE_TYPE} node for field ${field} received more than one MarkdownRemark child after creation. Only the first child will be queryable.`,
    )
  }

  if (children.length === 0) {
    reporter.warn(
      `${NODE_TYPE} node for field ${field} did not recieve any MarkdownRemark children after creation. The field ${field} will not be queryable as markdown.`,
    )
  }

  return children[0] as Node | undefined
}

const shouldUseField = (filter: {
  kind: 'whitelist' | 'blacklist'
  fields: string[]
}) => ([key, value]: [string, any]) => {
  if (filter.kind === 'blacklist' && filter.fields.includes(key)) return false
  if (filter.kind === 'whitelist' && !filter.fields.includes(key)) return false
  return typeof value === 'string' && value
}

export const onCreateNode: GatsbyNode['onCreateNode'] = async (
  helpers,
  pluginOptions = { plugins: [] },
) => {
  const {
    node,
    actions: { createNodeField },
    getNode,
    reporter,
  } = helpers

  const { whitelist, blacklist } = pluginOptions as {
    whitelist?: string[]
    blacklist?: string[]
  }

  if (whitelist && blacklist) {
    reporter.panicOnBuild(
      'Cannot provide both a whitelist and a blacklist to gatsby-transformer-remark-frontmatter',
    )
    return
  }

  const filter = shouldUseField(
    whitelist
      ? { kind: 'whitelist', fields: whitelist }
      : { kind: 'blacklist', fields: blacklist || [] },
  )

  if (
    !node ||
    node.internal.type !== 'MarkdownRemark' ||
    // we don't need to recursively run over our
    // newly created markdown nodes. It's unlikely they'll have any frontmatter
    // anyway
    isFrontmatterMarkdownNode({ node, getNode }) ||
    typeof node.frontmatter !== 'object' ||
    !node.frontmatter
  )
    return

  const newNodes = await Promise.all(
    Object.entries(node.frontmatter).reduce(
      (acc, [key, value]) => {
        if (filter([key, value])) {
          acc.push(
            createFrontmatterMdFileNode(helpers, [key, value], node).then(
              newNode => newNode && ([key, newNode] as [string, Node]),
            ),
          )
        }
        return acc
      },
      [] as Array<Promise<[string, Node] | undefined>>,
    ),
  )

  const frontmatterMdValue = newNodes.reduce(
    (value, nodeData) => {
      if (nodeData) {
        const [key, mdNode] = nodeData
        value[`${key}___NODE`] = mdNode.id
      }
      return value
    },
    {} as { [k: string]: string },
  )

  createNodeField({
    name: 'frontmattermd',
    node,
    value: frontmatterMdValue,
  })
}
