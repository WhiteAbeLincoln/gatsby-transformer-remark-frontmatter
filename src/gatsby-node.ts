import { Node, GatsbyNode, NodePluginArgs } from 'gatsby'
import {
  NODE_TYPE,
  isFrontmatterMarkdownNode,
  FrontmatterMarkdownFileNode,
  fromEntries,
} from './index'

// map of node ids to field names to created frontmatter markdown nodes.
// When the FrontmatterFile node is created, a new entry is added with
// all fields set to null
// we know that the frontmattermd field is ready to be created if all
// field_names are set to the string ids of the created markdown nodes
const node_field_map: {
  [markdown_node_id: string]: { [field_name: string]: string | null }
} = {}

const entryIsReady = (
  val: (typeof node_field_map)[string],
): val is { [field_name: string]: string } =>
  Object.keys(val).every(created_id => created_id != null)

const shouldUseField = (filter: {
  kind: 'whitelist' | 'blacklist'
  fields: string[]
}) => ([key, value]: [string, any]) => {
  if (filter.kind === 'blacklist' && filter.fields.includes(key)) return false
  if (filter.kind === 'whitelist' && !filter.fields.includes(key)) return false
  return !!(typeof value === 'string' && value)
}

const createFrontmatterMdFileNode = (
  {
    createNodeId,
    createContentDigest,
    getNode,
    actions: { createNode, createParentChildLink },
  }: NodePluginArgs,
  [field, value]: [string, string],
  parent: Node,
) => {
  const parentParent = parent.parent && getNode(parent.parent)
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
    id: createNodeId(`${parent.id}:${field} >>> ${NODE_TYPE}`),
    parent: parent.id,
    children: [],
    internal: {
      content: value,
      contentDigest: createContentDigest(value),
      mediaType: 'text/markdown',
      type: NODE_TYPE,
    },
  } as unknown) as FrontmatterMarkdownFileNode
  frontmatterMdNode.frontmatterField = field
  frontmatterMdNode.frontmatterValue = value

  // errors if fields are set on a new node
  // unfortunately we can't reuse any third-party
  // changes to file nodes
  delete frontmatterMdNode.fields

  // add the new entry to the node_field_map
  // setting value to null, since we don't
  // yet have the id of the final MarkdownRemark node
  if (!node_field_map[parent.id]) node_field_map[parent.id] = {}
  node_field_map[parent.id][field] = null

  // creation is deferred since we could have a race
  // condition if we create a node before the node_field_map
  // has been entirely populated. onCreateNode is async
  // so the linkNodes fn could be called and think that
  // it's ready to add the frontmattermd, but in reality
  // we just haven't yet added all of the fields to the
  // node_field_map (our Object.entries iteration hasn't
  // completed yet)
  return () => {
    createNode(frontmatterMdNode)
    if (parent) createParentChildLink({ parent, child: frontmatterMdNode })
  }
}

/**
 * Creates the FrontmatterMarkdownFile nodes from the
 * valid frontmatter fields of a MarkdownRemark node
 * @param node the MarkdownRemark node
 * @param helpers NodePluginArgs
 * @param filter a predicate to filter vaild frontmatter fields
 */
const createFrontmatterNodes = (
  node: Node,
  helpers: NodePluginArgs,
  filter: ReturnType<typeof shouldUseField>,
) => {
  const { getNode } = helpers
  if (
    // we don't need to recursively run over our
    // newly created markdown nodes. It's unlikely they'll have any frontmatter
    // anyway
    isFrontmatterMarkdownNode({ node, getNode }) ||
    typeof node.frontmatter !== 'object' ||
    !node.frontmatter
  )
    return

  const createFns = Object.entries(node.frontmatter).reduce(
    (acc, pair) => {
      if (filter(pair)) {
        acc.push(createFrontmatterMdFileNode(helpers, pair, node))
      }

      return acc
    },
    [] as Array<() => void>,
  )

  // actually create the FrontmatterMarkdownFile nodes
  createFns.map(fn => fn())
}

/**
 * Links the MarkdownRemark nodes created by gatsby-transformer-remark
 * to the original MarkdownRemark node where the frontmatter came from
 * using the frontmattermd field
 *
 * @param node a MarkdownRemark node
 * @param helpers NodePluginArgs
 */
const linkNodes = (node: Node, helpers: NodePluginArgs) => {
  const {
    getNode,
    actions: { createNodeField },
  } = helpers
  // we only operate on MarkdownRemark nodes that are children of FrontmatterMarkdownFile nodes
  if (!isFrontmatterMarkdownNode({ node, getNode })) return
  // get the parent, the FrontmatterMarkdownFile node
  const fileNode = getNode(node.parent)! as FrontmatterMarkdownFileNode
  // get the parent's parent, the original MarkdownNode
  const markdownNode = getNode(fileNode.parent)!

  const field = fileNode.frontmatterField

  // add the node id to the map
  const map_entry = node_field_map[markdownNode.id]
  map_entry[field] = node.id

  // if all fields are set to strings, frontmattermd field is ready to be created
  if (!entryIsReady(map_entry)) return

  // map the field name to `${field_name}___NODE` so that gatsby links the referenced node
  const frontmatterMdValue = fromEntries(
    Object.entries(map_entry).map(
      ([field_name, id]) => [`${field_name}___NODE`, id] as [string, string],
    ),
  )

  createNodeField({
    name: 'frontmattermd',
    node: markdownNode,
    value: frontmatterMdValue,
  })
}

export const onCreateNode: Exclude<
  GatsbyNode['onCreateNode'],
  undefined
> = async (helpers, pluginOptions = { plugins: [] }) => {
  const { node } = helpers

  const { whitelist, blacklist } = pluginOptions as {
    whitelist?: string[]
    blacklist?: string[]
  }

  if (whitelist && blacklist) {
    throw new Error(
      'Cannot provide both a whitelist and a blacklist to gatsby-transformer-remark-frontmatter',
    )
  }

  const filter = shouldUseField(
    whitelist
      ? { kind: 'whitelist', fields: whitelist }
      : { kind: 'blacklist', fields: blacklist || [] },
  )

  if (!node || node.internal.type !== 'MarkdownRemark') return
  createFrontmatterNodes(node, helpers, filter)
  linkNodes(node, helpers)
}
