# gatsby-transformer-remark-frontmatter

Allows querying Markdown frontmatter fields as markdown. Works for all string keys in frontmatter, including those that are under lists, as long as you can [define a GraphQL schema](https://www.gatsbyjs.com/docs/reference/graphql-data-layer/schema-customization/).

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

Clone the repository and run the [example project](https://github.com/WhiteAbeLincoln/gatsby-transformer-remark-frontmatter/tree/master/example) with
`npm run run-example`, or read the following:

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
