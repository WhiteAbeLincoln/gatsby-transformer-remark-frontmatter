# gatsby-transformer-remark-frontmatter

Allows querying Markdown frontmatter fields as markdown. Currently only works on top-level string typed keys
in the frontmatter, but support for string fields in objects or lists can be added if people ask for it enough or someone submits a pull request.

## Install

`npm i gatsby-transformer-remark-frontmatter`

## How to use

```javascript
// in your gatsby-config.js
plugins: [
  'gatsby-transformer-remark',
  'gatsby-transformer-remark-frontmatter'
]
```

Add the `@md` directive to fields in your GraphQL schema that you want to
parse as Markdown.

## Example

Given the following markdown file

```markdown
---
templateKey: index-template
sidebar: |
  # Some Markdown Content
  ![My Fancy Image](../image.png)
list:
  - item: |
     # Currently Supported
---

# Main Content

Some Text
```

The following GraphQL schema can be combined with the query below to get the body
content and the sidebar markdown as html.

Schema:
```graphql
type ListItem {
  item: String @md
}
type Frontmatter @infer {
  sidebar: String @md
  list: [ListItem!]
}
type MarkdownRemark implements Node @infer {
  frontmatter: Frontmatter!
}
```

Query:
```graphql
query {
  allMarkdownRemark(filter: { frontmatter: { templateKey: { eq: "index-template" } } }) {
    html
    frontmatter {
      templateKey
      sidebar {
        html
      }
      list {
        item {
          html
        }
      }
    }
  }
}
```

## Possible Issues

Many plugins expect all `MarkdownRemark` nodes to have `File`
node parents. This plugin passes data through those plugins, but at the
moment doesn't link the parent node to the original file. This may cause
some plugins that depend on MarkdownRemark parents to fail
(such as gatsby-remark-images).
