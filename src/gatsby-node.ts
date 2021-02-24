import { CreateSchemaCustomizationArgs } from 'gatsby'
import {
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  isObjectType,
  GraphQLFieldResolver,
} from 'graphql'
import { ComposeFieldConfig, ComposeOutputType } from 'graphql-compose'

interface GraphQLFieldExtensionDefinition<TSource, TContext, TReturn = any> {
  name: string
  type?: ComposeOutputType<TReturn, TContext>
  args?: GraphQLFieldConfigArgumentMap
  extend(
    args: GraphQLFieldConfigArgumentMap,
    prevFieldConfig: GraphQLFieldConfig<TSource, TContext>,
  ): ComposeFieldConfig<TSource, TContext>
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
        resolve: reuseResolver('excerpt')
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
    },
  })

  createTypes(FrontmatterMarkdownField)

  createFieldExtension({
    name: 'md',
    extend() {
      return {
        type: 'FrontmatterMarkdownField',
        resolve: (source, _args, _context, info) => {
          // Grab field
          const value = source[info.fieldName]
          if (!value) return undefined
          if (typeof value !== 'string') throw new Error('@md can only be used with string values')
          // looking through the gatsby-transformer-remark plugin
          // it seems that the bare minimum it needs is markdown source in the internal.content field
          // don't know what other plugins will fail though if this isn't backed by a real file
          // TODO: support plugins like gatsby-remark-images, gatsby-remark-copy-linked-files
          // by spoofing a File node
          return {
            rawMarkdownBody: value,
            id: createNodeId(`${info.fieldName} >>> FrontmatterMarkdownField`),
            children: [],
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
  } as GraphQLFieldExtensionDefinition<{ [x: string]: string }, unknown>)
}
