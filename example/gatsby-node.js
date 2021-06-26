/** @type {import('gatsby').GatsbyNode} */
const config = {
  createSchemaCustomization: ({ actions: { createTypes } }) => {
    createTypes(`
      type MarkdownRemark implements Node @infer {
        frontmatter: Frontmatter!
      }

      type Comment {
        author: String!
        content: String @md
      }

      type Frontmatter @infer {
        title: String!
        sidebar: String @md
        comments: [Comment!]
      }
    `)
  }
}

module.exports = config
