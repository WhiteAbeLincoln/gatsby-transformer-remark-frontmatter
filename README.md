# gatsby-transformer-remark-frontmatter

Allows querying Markdown frontmatter fields as markdown

## Install

`npm i gatsby-transformer-remark-frontmatter`

## How to use

```javascript
// in your gatsby-config.js
plugins: [
  'gatsby-transformer-remark',
  {
    resolve: 'gatsby-transformer-remark-frontmatter',
    // default: { blacklist: [] }
    options: {
      // frontmatter fields to exclude, including all others
      blacklist: ['templateKey']
      // frontmatter fields to include, excluding all others
      // whitelist: ['markdownField']
    }
  }
]
```

The options object has the following type

```typescript
type PluginOptions = { whitelist: string[] } | { blacklist: string[] } | undefined
```

Note that providing both a whitelist and a blacklist is invalid.

All MarkdownRemark nodes will have a frontmattermd object added to the
fields object, containing MarkdownRemark nodes created from valid frontmatter
fields

## Example

Given the following markdown file

```markdown
---
templateKey: index-template
sidebar: |
  # Some Markdown Content
  ![My Fancy Image](../image.png)
---

# Main Content

Some Text
```

The following query can be used to get the body content and the
sidebar markdown as html

```graphql
query {
  allMarkdownRemark(filter: { frontmatter: { templateKey: { eq: "index-template" } } }) {
    html
    frontmatter {
      templateKey
      sidebar
    }
    fields {
      frontmattermd {
        sidebar {
          html
        }
      }
    }
  }
}
```

## How it works

This plugin hooks into the `onCreateNode` api and listens for
new `MarkdownRemark` nodes to be created. If the node has a
frontmatter object and was not created by this plugin, we
iterate through all of the valid frontmatter fields,
creating a new `FrontmatterMarkdownFile` node consisting of
the MarkdownRemark's File parent fields and the contents
of the frontmatter field.

The 'gatsby-transformer-remark' plugin has an `onCreateNode`
hook that recognizes that a new node was created with
markdown contents. It creates a new MarkdownRemark node
with the contents of the other node and links them as
child and parent.

Once the `FrontmatterMarkdownFile` node has been created,
the child `MarkdownRemark` node is found and attached
to the `fields.frontmattermd` object in the original
`MarkdownRemark` node.

## Possible Issues

Many plugins expect all `MarkdownRemark` nodes to have `File`
node parents. Because of this plugin, some `MarkdownRemark` nodes
will have `FrontmatterMarkdownFile` parents. This plugin attempts
to remain compatible by copying all of the original properties
of the parent `File` node (if it exists) to the `FrontmatterMarkdownFile`
node. This works in many cases, but will fail if a plugin checks the type
of a node rather than the properties on the node.

Two functions are exported to allow checking if a node
is a `FrontmatterMarkdownFile` node or a child of a
`FrontmatterMarkdownFile` node. Use these predicates
in cases where a plugin expects a `MarkdownRemark` node
with a parent `File` node.

```ts
export const isFrontmaterMarkdownFileNode: (n: Node) => boolean
export const isFrontmatterMarkdownNode: (obj: { node: Node, getNode: (id: string) => Node | undefined | null }) => boolean
```
