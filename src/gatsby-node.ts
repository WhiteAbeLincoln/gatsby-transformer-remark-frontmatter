import { CreateSchemaCustomizationArgs, Node } from 'gatsby'
import {
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  isObjectType,
  GraphQLFieldResolver,
  GraphQLOutputType,
} from 'gatsby/graphql'
import { ComposeOutputType, ObjectTypeComposerFieldConfigDefinition } from 'graphql-compose'

interface GraphQLFieldExtensionDefinition<TSource, TContext> {
  name: string
  type?: ComposeOutputType<TContext>
  args?: GraphQLFieldConfigArgumentMap
  extend(
    args: GraphQLFieldConfigArgumentMap,
    prevFieldConfig: GraphQLFieldConfig<TSource, TContext>,
  ): ObjectTypeComposerFieldConfigDefinition<TSource, TContext>
}

interface GatsbyNodeModel {
  findRootNodeAncestor(
    obj: object | Array<unknown>,
    predicate?: (n: Node) => boolean,
  ): Node | null
  getAllNodes(
    args: { type?: string | GraphQLOutputType },
    pageDependencies?: { path: string; connectionType?: string },
  ): Node[]
  getNodeById(
    args: { id: string; type?: string | GraphQLOutputType },
    pageDependencies?: { path: string; connectionType?: string },
  ): Node | null
  getNodesByIds(
    args: { ids: string[]; type?: string | GraphQLOutputType },
    pageDependencies?: { path: string; connectionType?: string },
  ): Node[]
  getTypes(): string[]
  getNodesByIds(
    args: {
      query: { filter: object; sort?: object }
      type?: string | GraphQLOutputType
      firstOnly?: boolean
    },
    pageDependencies?: { path: string; connectionType?: string },
  ): Promise<null | Node | Node[]>
  trackInlineObjectsInRootNode(node: Node): void
  trackPageDependencies(
    result: Node | Node[],
    pageDependencies?: { path: string; connectionType?: string },
  ): Node | Node[]
}

interface GatsbyGraphQLContext<
  TSource = { [x: string]: string },
  TArgs = { [x: string]: any }
> {
  nodeModel: GatsbyNodeModel
  defaultFieldResolver: GraphQLFieldResolver<
    TSource,
    GatsbyGraphQLContext<TSource, TArgs>
  >
}

export const createSchemaCustomization = ({
  actions: { createTypes, createFieldExtension },
  schema,
  createNodeId,
  createContentDigest,
}: CreateSchemaCustomizationArgs) => {
  const reuseResolver = (field: string): GraphQLFieldResolver<any, any> => (
    source,
    args,
    context,
    info,
  ) => {
    const markdownType = info.schema.getType('MarkdownRemark')
    if (isObjectType(markdownType)) {
      const { resolve } = markdownType.getFields()[field]
      return resolve?.(source, args, context, info)
    }
  }
  const FrontmatterMarkdownField = schema.buildObjectType({
    name: 'FrontmatterMarkdownField',
    fields: {
      excerpt: {
        type: 'String',
        args: {
          pruneLength: {
            type: `Int`,
            defaultValue: 140,
          },
          truncate: {
            type: `Boolean`,
            defaultValue: false,
          },
          format: {
            type: `MarkdownExcerptFormats`,
            defaultValue: `PLAIN`,
          },
        },
        resolve: reuseResolver('excerpt'),
      },
      rawMarkdownBody: 'String',
      html: {
        type: 'String',
        resolve: reuseResolver('html'),
      },
      htmlAst: {
        type: 'JSON',
        resolve: reuseResolver('htmlAst'),
      },
      excerptAst: {
        type: 'JSON',
        args: {
          pruneLength: {
            type: `Int`,
            defaultValue: 140,
          },
          truncate: {
            type: `Boolean`,
            defaultValue: false,
          },
        },
        resolve: reuseResolver('excerptAst'),
      },
      headings: {
        type: '[MarkdownHeading]',
        args: {
          depth: `MarkdownHeadingLevels`,
        },
        resolve: reuseResolver('headings'),
      },
      timeToRead: {
        type: 'Int',
        resolve: reuseResolver('timeToRead'),
      },
      tableOfContents: {
        type: 'String',
        args: {
          absolute: {
            type: `Boolean`,
            defaultValue: false,
          },
          pathToSlugField: {
            type: `String`,
            defaultValue: ``,
          },
          maxDepth: `Int`,
          heading: `String`,
        },
        resolve: reuseResolver('tableOfContents'),
      },
      wordCount: {
        type: 'MarkdownWordCount',
        resolve: reuseResolver('wordCount'),
      },
      parent: {
        type: 'Node',
        resolve: (source, _args, context: GatsbyGraphQLContext, info) => {
          return context.nodeModel.getNodeById({ id: source[info.fieldName] })
        }
      }
    },
  })

  createTypes(FrontmatterMarkdownField)

  const extension: GraphQLFieldExtensionDefinition<{ [x: string]: string }, GatsbyGraphQLContext> = {
    name: 'md',
    extend() {
      return {
        type: 'FrontmatterMarkdownField',
        resolve: (source, args, context, info) => {
          // Grab field
          const value = context.defaultFieldResolver(
            source,
            args,
            context,
            info,
          )
          if (!value) return null
          if (typeof value !== 'string')
            throw new Error('@md can only be used with string values')

          const parent = context.nodeModel.findRootNodeAncestor(source)
          if (!parent || parent === source) {
            throw new Error('Unable to find ancestor File node')
          }
          return {
            rawMarkdownBody: value,
            id: createNodeId(`${info.fieldName} >>> FrontmatterMarkdownField`),
            children: [],
            parent: parent.id,
            internal: {
              content: value,
              contentDigest: createContentDigest(value), // Used for caching
              mediaType: 'text/markdown',
              type: 'MarkdownRemark',
            },
          }
        },
      }
    },
  }

  createFieldExtension(extension)
}
